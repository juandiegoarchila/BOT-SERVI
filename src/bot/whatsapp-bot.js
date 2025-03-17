// src/bot/whatsapp-bot.js
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import cron from 'node-cron';
import logger from '../utils/logger.js';
import envConfig from '../config/env-config.js';
import { processOrder, clearConversations } from '../services/order.service.js';

const processedMessages = new Set();
let botStartTime = null;

function initializeWhatsAppClient() {
  logger.info('Creando cliente de WhatsApp...');
  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    },
    webVersion: '2.2412.54',
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    },
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
    await client.sendMessage(to, text, options);
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

    if (processedMessages.has(messageId)) {
      logger.info(`Mensaje duplicado ignorado: ${messageId}`);
      return;
    }
    processedMessages.add(messageId);

    if (timestamp < botStartTime) {
      logger.info(`Ignorando mensaje antiguo de ${phone}: "${message}"`);
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

    try {
      const response = await processOrder(phone, message, client); // Pasamos client aquí
      if (response) {
        if (response.messages && Array.isArray(response.messages)) {
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
          await sendMessage(client, phone, response.reply, response.options || {});
          if (response.notify) {
            await sendAdminNotification(client, response.notify);
          }
          if (response.clearConversation) {
            conversations.delete(phone);
            logger.info(`Conversación de ${phone} eliminada tras completar pedido`);
          }
        } else {
          logger.warn(`Respuesta no manejada: ${JSON.stringify(response)}`);
          await sendMessage(client, phone, 'Hubo un error inesperado. Por favor, intenta de nuevo.');
        }
      }

      if (!response?.clearConversation) {
        conversations.set(phone, conversation);
      }
    } catch (error) {
      logger.error('Error procesando mensaje:', error);
      await sendMessage(client, phone, 'Hubo un error procesando tu mensaje. Por favor, intenta de nuevo.');
    }
  });
}

function setupCronJobs() {
  cron.schedule('0 0 16 * * *', () => {
    logger.info('Ejecutando limpieza de conversaciones al final de la jornada...');
    clearConversations();
    processedMessages.clear();
  });
}

logger.info('Inicializando cliente de WhatsApp...');
const client = initializeWhatsAppClient();
setupMessageHandler(client);
setupCronJobs();
client.initialize();