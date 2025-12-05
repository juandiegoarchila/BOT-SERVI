// src/bot/whatsapp-bot.js
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, Buttons, MessageMedia } = pkg;
import path from 'node:path';
import qrcode from 'qrcode-terminal';
import cron from 'node-cron';
import logger from '../utils/logger.js';
import envConfig from '../config/env-config.js';
import { processOrder, clearConversations, unpauseConversation, handlePaymentReceipt, cancelReminderTimeout } from '../services/order.service.js';

// Parámetros de seguridad desde .env
const SAFE_REPLY_ONLY = process.env.SAFE_REPLY_ONLY === 'true';
const MAX_PER_MINUTE = Number(process.env.BOT_MAX_MESSAGES_PER_MINUTE || 20);
const MIN_DELAY_MS = Number(process.env.BOT_MIN_DELAY_MS || 400);
const MAX_DELAY_MS = Number(process.env.BOT_MAX_DELAY_MS || 1200);

// Contador simple de mensajes por minuto
let sentCount = 0;
setInterval(() => { sentCount = 0; }, 60 * 1000);

function randomDelay() {
  const span = Math.max(MAX_DELAY_MS - MIN_DELAY_MS, 0);
  const extra = Math.floor(Math.random() * (span + 1));
  return MIN_DELAY_MS + extra;
}

// Sistema de delay inteligente
const userMessageTracking = new Map();

// Buffer para imágenes recibidas antes de procesar pedido
const pendingImages = new Map();

function calculateIntelligentDelay(phone, message) {
  const now = Date.now();
  const normalized = message.toLowerCase().trim();
  
  let tracking = userMessageTracking.get(phone);
  if (!tracking) {
    tracking = {
      lastMessageTime: null,
      messageBuffer: [],
      scheduledTimer: null,
    };
    userMessageTracking.set(phone, tracking);
  }
  
  // Regla 3: Excepciones de respuesta inmediata
  // Responder inmediatamente para opciones numéricas válidas (1-5)
  if (/^[1-5]$/.test(normalized)) {
    logger.info(`Respuesta inmediata para opción numérica: ${phone}`);
    return 0;
  }
  
  // Responder inmediatamente si ha esperado más de 2 minutos
  if (tracking.lastMessageTime && (now - tracking.lastMessageTime) > 120000) {
    logger.info(`Respuesta inmediata por espera >2min: ${phone}`);
    return 0;
  }
  
  // Agregar mensaje actual al buffer
  tracking.messageBuffer.push(now);
  tracking.lastMessageTime = now;
  
  // Mantener solo mensajes de los últimos 60 segundos
  tracking.messageBuffer = tracking.messageBuffer.filter(ts => (now - ts) < 60000);
  
  // Regla 2: Detección de mensajes múltiples
  // Si hay más de 1 mensaje en los últimos 30 segundos
  const recentMessages = tracking.messageBuffer.filter(ts => (now - ts) < 30000);
  if (recentMessages.length > 1) {
    logger.info(`Delay de 12s por mensajes múltiples: ${phone}`);
    return 12000; // 12 segundos para mensajes múltiples
  }
  
  // Regla 1: Delay base de 8 segundos
  logger.info(`Delay base de 8s: ${phone}`);
  return 8000;
}

const processedMessages = new Set();
let botStartTime = null;
const IGNORE_OLD_MESSAGES_MINUTES = 5; // Ignorar mensajes anteriores a 5 minutos del inicio

function initializeWhatsAppClient() {
  logger.info('Creando cliente de WhatsApp...');

  // Permitir configurar ruta de ejecutable externamente o usar Chromium empaquetado
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
  const headless = process.env.PUPPETEER_HEADLESS === 'false' ? false : true;

  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless,
      // Solo incluir executablePath si realmente se definió
      ...(executablePath ? { executablePath } : {}),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--disable-features=InterestCohort',
      ],
    },
    // Dejar que whatsapp-web.js gestione automáticamente la versión web
  });

  client.on('qr', (qr) => {
    logger.info('Generando código QR...');
    qrcode.generate(qr, { small: true });
    logger.info('Escanea este código QR con tu WhatsApp para conectar el bot:');
  });

  client.on('authenticated', () => logger.info('Cliente autenticado con éxito'));

  client.on('ready', () => {
    botStartTime = Date.now();
    logger.info('Bot de WhatsApp listo');
    logger.info(`Número de administrador: ${envConfig.adminPhoneNumber || 'No definido'}`);
  });

  client.on('disconnected', (reason) => {
    logger.error(`Cliente desconectado: ${reason}`);
    client.initialize();
  });

  client.on('auth_failure', (msg) => logger.error(`Error de autenticación: ${msg}`));
  client.on('error', (error) => logger.error('Error en el cliente de WhatsApp:', error));

  return client;
}

async function sendMessage(client, to, text, options = {}) {
  try {
    // Evitar envío si excede límite por minuto
    if (sentCount >= MAX_PER_MINUTE) {
      logger.warn('Límite de mensajes por minuto alcanzado. Posponiendo envío.');
      return;
    }
    // Demora aleatoria tipo humano
    const delayMs = randomDelay();
    await new Promise((res) => setTimeout(res, delayMs));
    await client.sendMessage(to, text, options);
    sentCount += 1;
    logger.info(`Mensaje enviado a ${to}: ${text}`);
  } catch (error) {
    logger.error(`Error enviando mensaje a ${to}:`, error);
    await client.sendMessage(to, 'Hubo un error al procesar tu mensaje. Intenta de nuevo.');
  }
}

async function sendAdminNotification(client, text) {
  const adminPhone = envConfig.adminPhoneNumber;
  if (!adminPhone) {
    logger.warn('No se puede enviar notificación al administrador: adminPhoneNumber no está definido');
    return;
  }
  const adminChatId = `${adminPhone}@c.us`;
  try {
    await client.sendMessage(adminChatId, `*Notificación*: ${text}`);
    logger.info(`Notificación enviada al administrador: ${text}`);
  } catch (error) {
    logger.error('Error enviando notificación al administrador:', error);
  }
}

function setupMessageHandler(client) {
  const conversations = new Map();

  client.on('message', async (msg) => {
    const messageId = msg.id.id;
    const phone = msg.from;
    const message = msg.body;
    const timestamp = msg.timestamp * 1000;

    // Ignorar mensajes del propietario/administrador para que el bot no intervenga
    if (envConfig.adminPhoneNumber) {
      const adminChatId = `${envConfig.adminPhoneNumber}@c.us`;
      if (phone === adminChatId) {
        const text = (message || '').trim();
        // Comando administrativo: resume <numero>
        const match = text.match(/^resume\s+(\d{10,15})$/i);
        if (match) {
          const target = `${match[1]}@c.us`;
          const ok = unpauseConversation(target);
          if (ok) {
            await client.sendMessage(adminChatId, `Conversación reactivada para ${match[1]}.`);
          } else {
            await client.sendMessage(adminChatId, `No estaba pausada o no existe conversación para ${match[1]}.`);
          }
        }
        // El bot no debe responder al administrador en otros casos
        logger.info('Mensaje del administrador detectado; el bot no interviene.');
        return;
      }
    }

    // Solo responder mensajes entrantes (no iniciar chats)
    if (SAFE_REPLY_ONLY) {
      // whatsapp-web.js ya dispara 'message' solo cuando el bot recibe mensajes
      // Aun así, reforzamos ignorando grupos y difusiones
      if (phone.includes('@g.us') || phone.includes('@broadcast') || phone.endsWith('@newsletter')) {
        logger.info(`Mensaje ignorado (SAFE_REPLY_ONLY) de ${phone}`);
        return;
      }
    }

    // Ignorar mensajes de canales/listas/grupos automatizados
    if (phone.includes('@broadcast') || phone.includes('@g.us')) {
      logger.info(`Ignorando mensaje de canal automatizado o no válido: ${phone}`);
      return;
    }

    // Solo procesar mensajes de números de teléfono reales o listas/canales
    if (!phone.includes('@c.us') && !phone.includes('@lid')) {
      logger.info(`Ignorando mensaje de formato no válido: ${phone}`);
      return;
    }

    if (processedMessages.has(messageId)) {
      logger.info(`Mensaje duplicado ignorado: ${messageId} de ${phone}`);
      return;
    }
    processedMessages.add(messageId);
    logger.info(`Mensaje único agregado: ${messageId} de ${phone}`);

    if (timestamp < botStartTime) {
      logger.info(`Ignorando mensaje antiguo de ${phone}: "${message}"`);
      return;
    }

    // Ignorar mensajes que llegaron antes del inicio del bot (últimos 5 minutos)
    const timeSinceBotStart = Date.now() - botStartTime;
    const messageAge = Date.now() - timestamp;
    if (timeSinceBotStart < (IGNORE_OLD_MESSAGES_MINUTES * 60 * 1000) && messageAge > (IGNORE_OLD_MESSAGES_MINUTES * 60 * 1000)) {
      logger.info(`Ignorando mensaje previo al inicio del bot de ${phone}: "${message}" (edad: ${Math.round(messageAge/1000)}s)`);
      return;
    }

    // IMPORTANTE: Verificar si hay imagen adjunta ANTES de validar mensaje vacío
    // Los comprobantes de pago pueden venir sin texto
    if (msg.hasMedia) {
      try {
        const media = await msg.downloadMedia();
        
        // Manejar notas de voz
        if (media && (media.mimetype === 'audio/ogg; codecs=opus' || media.mimetype.startsWith('audio/'))) {
          logger.info(`Nota de voz recibida de ${phone} - respondiendo que no se pueden procesar`);
          await sendMessage(client, phone, 'Disculpa, no puedo escuchar notas de voz 🎤❌\n\nPor favor, escríbeme por texto para ayudarte mejor. 😊');
          return;
        }
        
        // Manejar imágenes (comprobantes de pago)
        if (media && media.mimetype && media.mimetype.startsWith('image/')) {
          logger.info(`Imagen recibida de ${phone}, verificando si es comprobante de pago...`);
          
          // Convertir base64 a Buffer para Vision API
          const imageBuffer = Buffer.from(media.data, 'base64');
          
          const paymentResponse = await handlePaymentReceipt(phone, imageBuffer);
          if (paymentResponse) {
            await sendMessage(client, phone, paymentResponse);
            logger.info(`Comprobante de pago procesado para ${phone}`);
            return; // Procesado, no continuar
          } else {
            // No se pudo procesar aún - guardar para después
            logger.info(`Imagen almacenada temporalmente para ${phone} (se procesará después del delay)`);
            pendingImages.set(phone, imageBuffer);
          }
        }
      } catch (err) {
        logger.error('Error procesando imagen:', err);
      }
    }

    // Ignorar mensajes vacíos (pero solo si no tenían imagen adjunta)
    if (!message || message.trim() === '') {
      logger.info(`Ignorando mensaje vacío sin adjuntos de ${phone}`);
      return;
    }

    if (phone.includes('@broadcast') || phone.includes('@g.us')) {
      logger.info(`Ignorando mensaje de canal automatizado o no válido: ${phone}`);
      return;
    }

    let conversation = conversations.get(phone) || {
      step: 'initial',
      phone,
      welcomeSent: false,
      lunches: [],
      orderCount: 0,
      remainingCount: 0,
      addresses: [],
      deliveryTime: null,
      paymentMethod: null,
      cutlery: null,
    };

    logger.info(`Procesando mensaje de ${phone}: "${message}" | Estado: ${conversation.step}`);

    if (conversation.step === 'initial' && !conversation.welcomeSent) {
      conversation.welcomeSent = true;
      conversations.set(phone, conversation);
    }

    // ⚡ CANCELAR TIMEOUT INMEDIATAMENTE antes de cualquier delay
    // Esto evita que el recordatorio se dispare mientras esperamos procesar el mensaje
    cancelReminderTimeout(phone);

    // Calcular delay inteligente antes de procesar
    const intelligentDelay = calculateIntelligentDelay(phone, message);
    
    // Obtener tracking del usuario
    const tracking = userMessageTracking.get(phone);
    
    // NO cancelar timer previo si es un pedido web (queremos procesar todos los pedidos)
    const isWebOrder = message && message.includes('¡Hola Cocina Casera!') && message.includes('Quiero hacer mi pedido');
    
    if (!isWebOrder) {
      // Cancelar cualquier timer previo pendiente para este usuario (solo para mensajes normales)
      if (tracking && tracking.scheduledTimer) {
        clearTimeout(tracking.scheduledTimer);
        tracking.scheduledTimer = null;
      }
    }
    
    // Si hay delay, programar la respuesta
    if (intelligentDelay > 0) {
      logger.info(`Aplicando delay de ${intelligentDelay}ms para ${phone}`);
      
      // Programar la respuesta
      const timer = setTimeout(async () => {
        try {
          await processAndSendResponse(client, phone, message);
        } catch (error) {
          logger.error(`Error en respuesta programada para ${phone}:`, error);
          await sendMessage(client, phone, 'Hubo un error procesando tu mensaje. Intenta de nuevo.');
        }
      }, intelligentDelay);
      
      if (tracking) {
        tracking.scheduledTimer = timer;
      }
      
      return; // No procesar inmediatamente
    }
    
    // Si no hay delay, procesar inmediatamente
    await processAndSendResponse(client, phone, message);
  });

  // Permitir que el dueño reactive el bot escribiendo frases de activación en el chat
  client.on('message_create', async (msg) => {
    try {
      if (!msg.fromMe) return; // Solo mensajes enviados por el dueño del número
      const text = (msg.body || '').toLowerCase();
      const normalized = text
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const normalizedNoPunct = normalized.replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();

      if (
        normalized.includes('con mucho gusto veci') ||
        normalized.includes('con mucho gusto') ||
        normalized.includes('con gusto veci') ||
        normalized.includes('con gusto') ||
        normalizedNoPunct.includes('con mucho gusto veci') ||
        normalizedNoPunct.includes('con mucho gusto') ||
        normalizedNoPunct.includes('con gusto veci') ||
        normalizedNoPunct.includes('con gusto') ||
        normalized.includes('continuar') ||
        normalized.includes('seguir')
      ) {
        // Obtener el chat destino para reactivar esa conversación
        // Determinar de forma robusta el chat destino
        let targetId = msg.to || msg.from;
        if (!targetId) {
          const chat = await msg.getChat();
          targetId = chat?.id?._serialized;
        }
        if (targetId) {
          const ok = unpauseConversation(targetId);
          if (ok) {
            logger.info(`Conversación reactivada por el dueño para ${targetId}.`);
            // Enviar el mensaje de continuación solicitado
            try {
              // Pequeña pausa para asegurar estado listo
              await new Promise(res => setTimeout(res, 400));
              await client.sendMessage(targetId, 'Perfecto, sigamos. ¿Qué deseas hoy? 😊');
            } catch (sendErr) {
              logger.error('Error enviando mensaje de continuación tras reactivar:', sendErr);
            }
          }
        }
      }
    } catch (err) {
      logger.error('Error manejando message_create para reactivar:', err);
    }
  });
}

// Función auxiliar para procesar y enviar respuesta
async function processAndSendResponse(client, phone, message) {
  try {
    // ⚡ CANCELAR TIMEOUT INMEDIATAMENTE antes de procesar
    // Esto evita que el recordatorio se dispare mientras procesamos el mensaje
    cancelReminderTimeout(phone);
    
    const response = await processOrder(phone, message, client); // Pasamos client aquí
    
    if (response) {
      // Si vienen mensajes y media juntos, enviar mensajes primero y luego media
      if (response.messages && Array.isArray(response.messages) && response.media && response.media.type === 'video' && (response.media.url || response.media.path)) {
        for (let i = 0; i < response.messages.length; i++) {
          const options = i === 0 && response.options ? response.options : {};
          await sendMessage(client, phone, response.messages[i], options);
        }
        // Pequeña pausa para asegurar orden visual: texto antes del video
        await new Promise(res => setTimeout(res, 1200));
        try {
          let media;
          if (response.media.url) {
            media = await MessageMedia.fromUrl(response.media.url);
          } else {
            const videoPath = path.isAbsolute(response.media.path)
              ? response.media.path
              : path.resolve(process.cwd(), response.media.path);
            media = MessageMedia.fromFilePath(videoPath);
          }
          await client.sendMessage(phone, media, { caption: response.media.caption || '' });
          logger.info(`Video enviado a ${phone}`);
        } catch (err) {
          logger.error('Error enviando video:', err);
        }
      } else if (response.media && response.media.type === 'video' && (response.media.url || response.media.path)) {
        try {
          let media;
          if (response.media.url) {
            media = await MessageMedia.fromUrl(response.media.url);
          } else {
            // Resolver ruta absoluta del video (soporta rutas relativas del proyecto)
            const videoPath = path.isAbsolute(response.media.path)
              ? response.media.path
              : path.resolve(process.cwd(), response.media.path);
            media = MessageMedia.fromFilePath(videoPath);
          }
          await client.sendMessage(phone, media, { caption: response.media.caption || '' });
          logger.info(`Video enviado a ${phone}`);
        } catch (err) {
          logger.error('Error enviando video:', err);
        }
      } else if (response.messages && Array.isArray(response.messages)) {
        for (let i = 0; i < response.messages.length; i++) {
          const options = i === 0 && response.options ? response.options : {};
          await sendMessage(client, phone, response.messages[i], options);
        }
      } else if (typeof response === 'string') {
        await sendMessage(client, phone, response);
      } else if (response.main && response.secondary) {
        await sendMessage(client, phone, response.main);
        if (response.secondary) await sendMessage(client, phone, response.secondary);
      } else if (response.reply) {
        const opts = response.options || {};
        if (opts.buttons && Array.isArray(opts.buttons) && opts.buttons.length) {
          // Máx 3 botones en WhatsApp
          const btns = opts.buttons.slice(0, 3).map((b) => ({ body: b.title || String(b) }));
          const title = opts.title || '';
          const footer = opts.footer || '';
          const buttonsMsg = new Buttons(response.reply, btns, title, footer);
          await client.sendMessage(phone, buttonsMsg);
        } else {
          await sendMessage(client, phone, response.reply, opts);
        }
        if (response.notify) {
          await sendAdminNotification(client, response.notify);
        }
        if (response.clearConversation) {
          const conversations = new Map(); // Necesitaremos pasar esto como parámetro si se usa
          conversations.delete(phone);
          logger.info(`Conversación de ${phone} eliminada tras completar pedido`);
        }
      } else {
        logger.warn(`Respuesta no manejada: ${JSON.stringify(response)}`);
        await sendMessage(client, phone, 'Hubo un error inesperado. Por favor, intenta de nuevo.');
      }
    }
    
    // IMPORTANTE: Después de enviar respuesta, verificar si hay imagen pendiente
    if (pendingImages.has(phone)) {
      logger.info(`Procesando imagen pendiente para ${phone}...`);
      const imageBuffer = pendingImages.get(phone);
      pendingImages.delete(phone);
      
      // Pequeño delay antes de procesar la imagen
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const paymentResponse = await handlePaymentReceipt(phone, imageBuffer);
      if (paymentResponse) {
        await sendMessage(client, phone, paymentResponse);
        logger.info(`Comprobante pendiente procesado para ${phone}`);
      } else {
        logger.info(`Imagen pendiente descartada para ${phone} (no es comprobante o no aplica)`);
      }
    }
  } catch (error) {
    logger.error('Error procesando mensaje:', error);
    await sendMessage(client, phone, 'Hubo un error procesando tu mensaje. Por favor, intenta de nuevo.');
  }
}

function setupCronJobs() {
  cron.schedule('0 0 16 * * *', () => {
    logger.info('Ejecutando limpieza de conversaciones al final de la jornada...');
    clearConversations();
    processedMessages.clear();
  });
}

// Escuchar eventos de recordatorios de pago
process.on('sendPaymentReminder', async ({ phone, message }) => {
  try {
    if (client && client.info && client.info.wid) {
      await sendMessage(client, phone, message);
      logger.info(`Recordatorio de pago enviado a ${phone}`);
    }
  } catch (error) {
    logger.error('Error enviando recordatorio automático:', error);
  }
});

// Escuchar eventos de recordatorio a los 5 minutos
process.on('sendHumanHelpReminder5Min', async ({ phone }) => {
  try {
    if (client && client.info && client.info.wid) {
      const reminderMessage = '*Veci, seguimos intentando comunicarte con alguien del equipo 🙏💛*\n' +
        'Por favor, espera un poco más.';
      
      await sendMessage(client, phone, reminderMessage);
      logger.info(`Recordatorio de 5 minutos enviado a ${phone}`);
    }
  } catch (error) {
    logger.error('Error enviando recordatorio de 5 minutos:', error);
  }
});

// Escuchar eventos de recordatorio a los 10 minutos con opciones
process.on('sendHumanHelpReminder10Min', async ({ phone }) => {
  try {
    if (client && client.info && client.info.wid) {
      const apologyMessage = '*Veci, lamentamos mucho la espera 🙏💛*\n\n' +
        'Por la alta demanda, no pudimos atenderte en este momento.\n\n' +
        '*¿Qué prefieres hacer?*\n' +
        '*1️⃣* Esperar un poco más (te avisamos cuando alguien esté disponible)\n' +
        '*2️⃣* Resolver tu consulta con las opciones automáticas\n' +
        '*3️⃣* Dejarnos tu número para llamarte después o escribirte despues';
      
      await sendMessage(client, phone, apologyMessage);
      logger.info(`Mensaje de disculpa a los 10 minutos enviado a ${phone}`);
      
      // Reactivar la conversación y cambiar el estado para manejar las opciones
      const { unpauseConversation, updateConversationState } = await import('../services/order.service.js');
      unpauseConversation(phone);
      updateConversationState(phone, 'human_help_wait_options');
    }
  } catch (error) {
    logger.error('Error enviando mensaje de disculpa a los 10 minutos:', error);
  }
});

logger.info('Inicializando cliente de WhatsApp...');
let client;
try {
  client = initializeWhatsAppClient();
  setupMessageHandler(client);
  setupCronJobs();
  client.initialize();
} catch (err) {
  logger.error('Fallo crítico iniciando WhatsApp Web Client:', err);
  logger.error('Si el problema persiste, define PUPPETEER_EXECUTABLE_PATH o cambia a WHATSAPP_PROVIDER=cloud');
}