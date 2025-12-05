// src/services/order.service.js
import logger from "../utils/logger.js";
import { generateContextualReply } from '../services/ai.service.js';
import { verifyPaymentReceipt, isVisionAvailable } from './payment-verification.service.js';
import envConfig from '../config/env-config.js';

// Estado simplificado para la nueva lógica
const conversations = new Map();

const GREETING_MESSAGE = (
  "*¡Buen día, veci! 😊*\n" +
  "¿Qué deseas hoy?\n\n" +
  "Haz tu pedido aquí 👇🏻\n" +
  "🌐 https://cocina-casera.web.app/\n\n" +
  "*⏰ Horarios de atención:*\n" +
  "Desayuno: 7:00 a. m. – 11:00 a. m.\n" +
  "Almuerzo: 11:00 a. m. – 3:55 p. m.\n\n" +
  "Gracias por tu apoyo 💛\n" +
  "*Cocina Casera — siempre contigo.*"
);

const WEB_ORDER_CONFIRMATION = (
  "👋 ¡Hola veci!\n" +
  "Tu pedido hecho en la página *ya fue recibido* y está en preparación. 🍽️🔥\n\n" +
  "Pronto uno de nuestros domiciliarios te enviará un mensaje apenas salga.\n\n" +
  "📲 Si vas a pagar por transferencia, envía la captura del comprobante *solo por este chat*.\n\n" +
  "¡Gracias por pedir en Cocina Casera! 💛"
);

const EXPLANATION_MESSAGE = (
  "*Veci, parece que aún no estás siguiendo la dinámica 😊*\n" +
  "Te explico de nuevo:\n\n" +
  "*👉 Mira el video que te envié* o este también es otro de apoyo.\n" +
  "*🔗 Haz clic en el link* para hacer tu pedido directamente desde la página.\n" +
  "https://cocina-casera.web.app/\n\n" +
  "Ahí eliges todo rapidito y sin complicarte.\n" +
  "Estoy pendiente 💛"
);

const DUPLICATE_ORDER_MESSAGE = (
  "*Veci, veo que ya hiciste un pedido hace un momento 😊*\n\n" +
  "Si quieres hacer *más pedidos*, no es necesario enviar uno por uno. " +
  "Y si te pasó por alto, no te preocupes.\n\n" +
  "*👉 Mira este video* que te explica cómo duplicar y hacer varios pedidos juntos de forma más rápida.\n\n" +
  "¡Es muy fácil! 💛"
);

const MULTIPLE_ORDERS_TUTORIAL = (
  "*¡Hola, veci! 👋😊*\n" +
  "Te comparto este video para que veas cómo pedir varios almuerzos o desayunos en un solo envío por WhatsApp, sin salir de la página ni repetir el proceso.\n\n" +
  "Haz tu pedido aquí 👇\n" +
  "🌐 https://cocina-casera.web.app/\n\n" +
  "⏰ *Horarios de atención:*\n" +
  "Desayuno: 7:00 a. m. – 11:00 a. m.\n" +
  "Almuerzo: 11:00 a. m. – 3:55 p. m.\n\n" +
  "Gracias por preferirnos 💛\n" +
  "Cocina Casera — sabor y facilidad en un mismo lugar 🍽️✨"
);

const TROUBLESHOOT_SENDING_MESSAGE = (
  "¿No te deja enviar tu pedido por WhatsApp? 😊\n" +
  "Mira este video rápido y soluciona el problema en segundos.\n\n" +
  "Haz tu pedido aquí 👇🏻\n" +
  "🌐 https://cocina-casera.web.app/\n\n" +
  "⏰ *Horarios de atención:*\n" +
  "Desayuno: 7:00 a. m. – 11:00 a. m.\n" +
  "Almuerzo: 11:00 a. m. – 3:55 p. m.\n\n" +
  "Cocina Casera — siempre contigo 💛"
);

const INITIAL_ASSISTANCE_OPTIONS = (
  "*¡Hola! ¿En qué puedo ayudarte hoy? 😊*\n" +
  "Selecciona una opción:\n\n" +
  "*1️⃣ Ayuda humana*\n" +
  "*2️⃣ No me deja enviar el pedido*\n" +
  "*3️⃣ Cómo hago más pedidos*\n" +
  "*4️⃣ ¿Sí llegan a mi dirección?*\n" +
  "*5️⃣ Quiero hacer un pedido*"
);

const TROUBLE_ASSISTANCE_OPTIONS = (
  "*Veo que sigues con inconvenientes, veci 😊*\n" +
  "Elige una de estas opciones para ayudarte:\n\n" +
  "*1️⃣ Ayuda humana*\n" +
  "*2️⃣ No me deja enviar el pedido*\n" +
  "*3️⃣ Cómo hago más pedidos*\n" +
  "*4️⃣ ¿Sí llegan a mi dirección?*\n" +
  "*5️⃣ Quiero hacer un pedido*"
);

const OPTION_HELP_MESSAGE = (
  "*Para seleccionar una opción, veci 😊*\n\n" +
  "Solo escribe el *número* de la opción que necesitas.\n" +
  "Por ejemplo: *1*, *2*, *3*, *4* o *5*\n\n" +
  "También puedes escribir el número en letra, como:\n" +
  "• *uno* → para opción 1\n" +
  "• *dos* → para opción 2\n" +
  "Y así sucesivamente 💛\n\n" +
  "¿Cuál opción necesitas?"
);

// Función para normalizar opciones escritas en diferentes formatos
function normalizeOption(text) {
  const normalized = text.toLowerCase().trim();
  
  // Mapeo de palabras a números
  const wordToNumber = {
    'uno': '1', 'un': '1', 'una': '1',
    'dos': '2',
    'tres': '3',
    'cuatro': '4',
    'cinco': '5'
  };
  
  // Si es un número directo (1-5)
  if (/^[1-5]$/.test(normalized)) {
    return normalized;
  }
  
  // Si es una palabra que mapea a un número
  if (wordToNumber[normalized]) {
    return wordToNumber[normalized];
  }
  
  return null; // No reconocido
}

export async function processOrder(phone, message, client) {
  try {
    const raw = (message || '').trim();
    let normalized = raw
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .toLowerCase();
    const normalizedNoPunct = normalized.replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();

    let state = conversations.get(phone);
    if (!state) {
      state = {
        genericMsgCount: 0,
        webOrderReceived: false,
        assistanceShown: false,
        postAssistancePromptSent: false,
        pausedAfterActivation: false,
        waitingForPayment: false,
        paymentMethod: null,
        paymentReminderCount: 0,
        paymentTimestamp: null,
        option5Selected: false,
        explanationSentAfterOption5: false,
        awaitingExplanationAfterVideo: false,
        waitingForHumanHelp: false,
        humanHelpTimestamp: null,
        in10MinWaitMenu: false,
        userNotifiedPayment: false,
        lastPaymentNotificationTime: null,
        paymentReceived: false,
        pausedReminderCount: 0,
        lastOrderTime: null,
        lastOrderAmount: null,
        duplicateWarningShown: false,
        menuReminderSent: false,
        reminderTimeout: null,
      };
      conversations.set(phone, state);
    }
    
    // ⚡ PRIORIDAD MÁXIMA: Detectar pedido web PRIMERO antes de cualquier otra lógica
    // Esto evita que se disparen recordatorios o videos cuando ya se hizo el pedido
    if (normalized.includes('hola cocina casera')) {
      // Cancelar TODOS los timers inmediatamente
      if (state.reminderTimeout) {
        clearTimeout(state.reminderTimeout);
        state.reminderTimeout = null;
        logger.info(`✅ Timer de recordatorio CANCELADO por pedido web recibido: ${phone}`);
      }
      
      // Resetear TODOS los flags de flujo de opciones
      state.option5Selected = false;
      state.explanationSentAfterOption5 = false;
      state.awaitingExplanationAfterVideo = false;
      state.menuReminderSent = true; // Marcar como enviado para evitar que se dispare
      state.assistanceShown = false;
      
      state.webOrderReceived = true;
      
      // Incrementar contador de pedidos
      if (!state.orderCount) {
        state.orderCount = 0;
      }
      state.orderCount++;
      
      // GUARDAR ESTADO INMEDIATAMENTE para que el siguiente mensaje lo vea
      conversations.set(phone, state);
      logger.info(`Contador de pedidos actualizado: ${state.orderCount} para ${phone}`);
      
      // Extraer monto total del pedido
      const totalMatch = raw.match(/💰\s*Total:\s*\$\s*(\d{1,3}(?:[.,]\d{3})*)/i);
      let currentOrderAmount = null;
      
      if (totalMatch) {
        const amountStr = totalMatch[1].replace(/[.,]/g, '');
        currentOrderAmount = parseInt(amountStr, 10);
        state.orderAmount = currentOrderAmount;
        logger.info(`Monto del pedido guardado: $${state.orderAmount}`);
      }
      
      // DETECTAR SEGUNDO PEDIDO (no importa el monto ni el tiempo)
      const now = Date.now();
      let isDuplicate = false;
      
      // Si es el segundo pedido o más Y no hemos mostrado el tutorial
      if (state.orderCount >= 2 && !state.duplicateWarningShown) {
        isDuplicate = true;
        logger.info(`Segundo pedido detectado para ${phone} (total: ${state.orderCount} pedidos) - enviando tutorial`);
        state.duplicateWarningShown = true;
      }
      
      // Guardar timestamp del último pedido
      state.lastOrderTime = now;
      state.lastOrderAmount = currentOrderAmount;
      
      // Detectar método de pago seleccionado
      let paymentMethod = null;
      let paymentLineMatch = raw.match(/💳\s*Pago:\s*(\w+)/i);
      
      if (!paymentLineMatch) {
        paymentLineMatch = raw.match(/\$\s*\d{1,3}(?:[.,]\d{3})*\s*\((\w+)\)/i);
      }
      
      if (!paymentLineMatch) {
        const activePaymentMatch = raw.match(/🔹\s*(\w+):/i);
        if (activePaymentMatch) {
          paymentLineMatch = [null, activePaymentMatch[1]];
        }
      }
      
      if (paymentLineMatch) {
        paymentMethod = paymentLineMatch[1];
        if (paymentMethod.toLowerCase().includes('efectivo')) {
          state.waitingForPayment = false;
          state.paymentMethod = 'Efectivo';
          state.cashPayment = true;
          logger.info(`Método de pago detectado: Efectivo (no se esperará comprobante)`);
        } else if (paymentMethod.toLowerCase().includes('nequi')) {
          state.waitingForPayment = true;
          state.paymentMethod = 'Nequi';
          state.cashPayment = false;
          state.paymentTimestamp = Date.now();
          logger.info(`Método de pago detectado: Nequi (recordatorios se activarán después de confirmación)`);
        } else if (paymentMethod.toLowerCase().includes('daviplata') || paymentMethod.toLowerCase().includes('davi')) {
          state.waitingForPayment = true;
          state.paymentMethod = 'Daviplata';
          state.cashPayment = false;
          state.paymentTimestamp = Date.now();
          logger.info(`Método de pago detectado: Daviplata (recordatorios se activarán después de confirmación)`);
        } else if (paymentMethod.toLowerCase().includes('bancolombia')) {
          state.waitingForPayment = true;
          state.paymentMethod = 'Bancolombia';
          state.cashPayment = false;
          state.paymentTimestamp = Date.now();
          logger.info(`Método de pago detectado: Bancolombia (recordatorios se activarán después de confirmación)`);
        }
      } else {
        logger.warn(`No se pudo detectar método de pago en el pedido`);
      }
      
      conversations.set(phone, state);
      
      // Programar recordatorios DESPUÉS del delay, justo antes de enviar confirmación
      if (state.waitingForPayment) {
        process.nextTick(() => {
          const currentState = conversations.get(phone);
          if (currentState && currentState.waitingForPayment && !currentState.paymentReceived) {
            setupPaymentReminders(phone);
            logger.info(`Recordatorios de pago programados para ${phone} después de enviar confirmación`);
          }
        });
      }
      
      const ai = await generateContextualReply(phone, 'confirm_web', raw, state);
      const confirmationMessage = ai || WEB_ORDER_CONFIRMATION;
      
      // Si es duplicado, enviar confirmación + video tutorial
      if (isDuplicate) {
        if (envConfig.media?.duplicateVideoPath) {
          return { 
            messages: [confirmationMessage],
            media: { 
              type: 'video', 
              path: envConfig.media.duplicateVideoPath, 
              caption: DUPLICATE_ORDER_MESSAGE 
            } 
          };
        }
        return { messages: [confirmationMessage, DUPLICATE_ORDER_MESSAGE] };
      }
      
      return confirmationMessage;
    }
    
    // Normalizar opción si viene en diferentes formatos (uno, Uno, 1, etc.)
    const normalizedOption = normalizeOption(raw);
    if (normalizedOption && state.assistanceShown && !['1','2','3','4','5'].includes(normalized)) {
      // Actualizar normalized para que el resto del código procese correctamente
      normalized = normalizedOption;
      logger.info(`Opción normalizada de "${raw}" a "${normalizedOption}"`);
    }
    
    // Si mostró opciones y el usuario escribe algo que NO es una opción válida, mostrar ayuda
    if (state.assistanceShown && !['1','2','3','4','5'].includes(normalized) && 
        !normalized.includes('hola cocina casera') && !state.waitingForPayment && 
        !state.in10MinWaitMenu && !state.awaitingCallbackNumber) {
      logger.info(`Usuario ${phone} escribió "${raw}" pero no es una opción válida - mostrando ayuda`);
      return OPTION_HELP_MESSAGE;
    }
    
    // Log del estado actual para debugging
    if (['1','2','3','4','5'].includes(normalized)) {
      logger.info(`Procesando opción ${normalized} - Estado: in10MinWaitMenu=${state.in10MinWaitMenu}, assistanceShown=${state.assistanceShown}`);
    }
    
    // PRIORIDAD ALTA: Si el usuario escribe tras seleccionar opción, enviar reexplicación y cancelar recordatorio
    // PERO: Si ya recibió pedido web, NO entrar aquí
    if (state.awaitingExplanationAfterVideo && !state.webOrderReceived) {
      state.awaitingExplanationAfterVideo = false;
      state.explanationSentAfterOption5 = true;
      state.menuReminderSent = false; // ✅ Preparar para nuevo recordatorio después de reexplicación
      
      conversations.set(phone, state);
      
      const ai = await generateContextualReply(phone, 'explanation', raw, state);
      const text = ai || EXPLANATION_MESSAGE;
      
      // ✅ Programar NUEVO recordatorio después de reexplicación (15 segundos)
      // Este se cancelará si el usuario vuelve a escribir
      state.reminderTimeout = setTimeout(() => {
        const currentState = conversations.get(phone);
        if (currentState && !currentState.webOrderReceived && !currentState.menuReminderSent && 
            !currentState.waitingForHumanHelp) {
          currentState.menuReminderSent = true;
          // Resetear estado para que la próxima opción se procese correctamente
          currentState.option5Selected = false;
          currentState.assistanceShown = true;
          currentState.explanationSentAfterOption5 = false;
          currentState.awaitingExplanationAfterVideo = false;
          conversations.set(phone, currentState);
          
          const reminderMsg = '¿Aún no sabes qué pedir, veci? 😊\n\nTranquilo, tómate tu tiempo. Aquí sigo para ayudarte con lo que necesites 💛';
          const optionsMsg = '*¿En qué puedo ayudarte?*\n\n*1️⃣ Ayuda humana*\n*2️⃣ No me deja enviar el pedido*\n*3️⃣ Cómo hago más pedidos*\n*4️⃣ ¿Sí llegan a mi dirección?*\n*5️⃣ Quiero hacer un pedido*';
          
          if (client && typeof client.sendMessage === 'function') {
            setTimeout(() => client.sendMessage(phone, reminderMsg), 500);
            setTimeout(() => client.sendMessage(phone, optionsMsg), 1500);
          }
          logger.info(`Recordatorio enviado a ${phone} después de 15s desde reexplicación`);
        }
      }, 15000);
      
      conversations.set(phone, state);
      
      // Enviar con el segundo video de apoyo
      if (envConfig.media?.supportVideoPath) {
        return { media: { type: 'video', path: envConfig.media.supportVideoPath, caption: text } };
      }
      return text;
    }
    
    // PRIORIDAD ALTA: Detectar si el usuario está avisando que enviará el pago
    if (state.waitingForPayment && !state.paymentReceived && detectPaymentIntent(raw)) {
      logger.info(`Usuario ${phone} avisó que enviará el pago: "${raw}"`);
      pausePaymentReminders(phone, 30); // Pausar 30 minutos
      
      const responses = [
        'Perfecto veci, toma tu tiempo 💛\nAquí estaré pendiente del comprobante 📲',
        'Dale veci, tranquilo 😊\nTe espero con el comprobante 💛',
        'Perfecto, aquí espero 📲💛',
        'Dale veci, sin afán 💛\nEnvía el comprobante cuando puedas 📸'
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      return randomResponse;
    }

    // Mientras está pausado, no responder (la reanudación la hace el dueño del número)
    // Nota: la reactivación sucede desde whatsapp-bot.js con message_create (fromMe)

    // Si está pausado tras activación, no responder
    if (state.pausedAfterActivation) {
      return; // no enviamos respuesta
    }

    // Si está esperando ayuda humana y ha pasado 1 minuto sin respuesta del dueño
    if (state.waitingForHumanHelp && state.humanHelpTimestamp) {
      const timeWaiting = Date.now() - state.humanHelpTimestamp;
      if (timeWaiting >= 60000) { // 1 minuto
        state.waitingForHumanHelp = false;
        state.humanHelpTimestamp = null;
        state.pausedAfterActivation = false;
        state.assistanceShown = true;
        conversations.set(phone, state);
        const apologyMessage = '*Veci, qué pena contigo 🙏💛*\n' +
          'En este momento hay *muchos pedidos* y nadie del equipo puede responder por chat.\n\n' +
          'Pero no te preocupes: puedes *escoger cualquiera de las opciones que te aparecen* y así te ayudamos más rápido con lo que necesites 😊';
        const ai = await generateContextualReply(phone, 'assistance', raw, state);
        const optionsMessage = ai || INITIAL_ASSISTANCE_OPTIONS;
        return { messages: [apologyMessage, optionsMessage] };
      }
    }

    // Detectar despedidas y cerrar conversación elegantemente
    const farewellWords = ['gracias', 'muchas gracias', 'ok gracias', 'vale gracias', 'perfecto gracias', 
                           'adios', 'adiós', 'chao', 'hasta luego', 'nos vemos', 'bye', 'listo gracias',
                           'ok', 'vale', 'perfecto', 'entendido', 'ok listo', 'ya entendi'];
    const isFarewell = farewellWords.some(word => {
      const cleanNormalized = normalized.replace(/[^a-z\s]/g, ' ').trim();
      return cleanNormalized === word || cleanNormalized.startsWith(word + ' ') || cleanNormalized.endsWith(' ' + word);
    });
    
    if (isFarewell && !state.awaitingCallbackNumber && !state.waitingForHumanHelp && !state.waitingForPayment) {
      // Reiniciar estado para próxima interacción (pero solo si no está esperando pago)
      state.genericMsgCount = 0;
      state.assistanceShown = false;
      state.in10MinWaitMenu = false;
      state.option5Selected = false;
      state.explanationSentAfterOption5 = false;
      state.awaitingExplanationAfterVideo = false;
      state.farewellSent = true; // Marcar que se envió despedida
      conversations.set(phone, state);
      
      return '¡Con mucho gusto, veci! 💛\n\nCuando necesites algo más, aquí estaré. ¡Que tengas un excelente día! 😊';
    }
    
    // Si ya se envió despedida y sigue escribiendo, mostrar menú
    if (state.farewellSent && !state.webOrderReceived) {
      state.farewellSent = false; // Resetear
      state.assistanceShown = true;
      conversations.set(phone, state);
      const ai = await generateContextualReply(phone, 'assistance', raw, state);
      return ai || INITIAL_ASSISTANCE_OPTIONS;
    }

    // "gracias" tras pedido web
    if (normalized.includes('gracias') && state.webOrderReceived) {
      const ai = await generateContextualReply(phone, 'thanks', raw, state);
      return ai || '¡Con mucho gusto, veci! 💛\n\nCuando necesites algo más, aquí estaré. ¡Que tengas un excelente día! 😊';
    }

    // Si ya seleccionó opción 5 (QUIERO HACER UN PEDIDO), usar el flujo original
    if (state.option5Selected) {
      // Después del video, el PRIMER mensaje envía explicación (una sola vez)
      if (!state.explanationSentAfterOption5) {
        state.explanationSentAfterOption5 = true;
        state.menuReminderSent = false; // Preparar para recordatorio
        conversations.set(phone, state);
        
        // ✅ Programar recordatorio después de reexplicación (15 segundos)
        state.reminderTimeout = setTimeout(() => {
          const currentState = conversations.get(phone);
          if (currentState && !currentState.webOrderReceived && !currentState.menuReminderSent && 
              !currentState.waitingForHumanHelp) {
            currentState.menuReminderSent = true;
            currentState.option5Selected = false;
            currentState.assistanceShown = true;
            conversations.set(phone, currentState);
            
            const reminderMsg = '¿Aún no sabes qué pedir, veci? 😊\n\nTranquilo, tómate tu tiempo. Aquí sigo para ayudarte con lo que necesites 💛';
            const optionsMsg = '*¿En qué puedo ayudarte?*\n\n*1️⃣ Ayuda humana*\n*2️⃣ No me deja enviar el pedido*\n*3️⃣ Cómo hago más pedidos*\n*4️⃣ ¿Sí llegan a mi dirección?*\n*5️⃣ Quiero hacer un pedido*';
            
            if (client && typeof client.sendMessage === 'function') {
              setTimeout(() => client.sendMessage(phone, reminderMsg), 500);
              setTimeout(() => client.sendMessage(phone, optionsMsg), 1500);
            }
            logger.info(`Recordatorio enviado a ${phone} después de 15s desde primer reexplicación`);
          }
        }, 15000);
        
        conversations.set(phone, state);
        
        const ai = await generateContextualReply(phone, 'explanation', raw, state);
        const text = ai || EXPLANATION_MESSAGE;
        
        // Enviar con el segundo video de apoyo
        if (envConfig.media?.supportVideoPath) {
          return { media: { type: 'video', path: envConfig.media.supportVideoPath, caption: text } };
        }
        return text;
      }

      // El SEGUNDO mensaje debe mostrar las opciones
        if (!state.assistanceShown) {
        state.assistanceShown = true;
        state.menuReminderSent = false; // Preparar para recordatorio
        conversations.set(phone, state);
        
        // ✅ Programar recordatorio después de mostrar opciones (15 segundos)
        state.reminderTimeout = setTimeout(() => {
          const currentState = conversations.get(phone);
          if (currentState && !currentState.webOrderReceived && !currentState.menuReminderSent && 
              !currentState.waitingForHumanHelp) {
            currentState.menuReminderSent = true;
            currentState.option5Selected = false;
            currentState.assistanceShown = true;
            conversations.set(phone, currentState);
            
            const reminderMsg = '¿Aún no sabes qué pedir, veci? 😊\n\nTranquilo, tómate tu tiempo. Aquí sigo para ayudarte con lo que necesites 💛';
            const optionsMsg = '*¿En qué puedo ayudarte?*\n\n*1️⃣ Ayuda humana*\n*2️⃣ No me deja enviar el pedido*\n*3️⃣ Cómo hago más pedidos*\n*4️⃣ ¿Sí llegan a mi dirección?*\n*5️⃣ Quiero hacer un pedido*';
            
            if (client && typeof client.sendMessage === 'function') {
              setTimeout(() => client.sendMessage(phone, reminderMsg), 500);
              setTimeout(() => client.sendMessage(phone, optionsMsg), 1500);
            }
            logger.info(`Recordatorio enviado a ${phone} después de 15s desde opciones de asistencia`);
          }
        }, 15000);
        
        conversations.set(phone, state);
        
          const ai = await generateContextualReply(phone, 'assistance', raw, state);
          return ai || TROUBLE_ASSISTANCE_OPTIONS;
      }
      
      // Si ya mostró opciones y el usuario vuelve a escoger "5",
      // reenviar el saludo con video y reiniciar la secuencia explicación -> opciones
      if (state.assistanceShown && normalized === '5') {
        // Reiniciar banderas para asegurar secuencia: explicación -> opciones
        state.explanationSentAfterOption5 = false;
        state.assistanceShown = false;
        conversations.set(phone, state);
        const ai = await generateContextualReply(phone, 'greeting', raw, state);
        const text = ai || GREETING_MESSAGE;
        try {
          const { default: envConfig } = await import('../config/env-config.js');
          if (envConfig.media?.welcomeVideoUrl) {
            return { media: { type: 'video', url: envConfig.media.welcomeVideoUrl, caption: text } };
          }
          if (envConfig.media?.welcomeVideoPath) {
            return { media: { type: 'video', path: envConfig.media.welcomeVideoPath, caption: text } };
          }
        } catch {}
        return text;
      }

      // Continuar con el flujo normal de opciones 1-4 después de mostrar las opciones
      if (state.assistanceShown && ['1','2','3','4'].includes(normalized)) {
        let resp = '';
        switch (normalized) {
          case '1':
            resp = '*Ya casi, veci 😊*\nEn un momento alguien te escribirá.\nGracias por tu paciencia 💛\n\n⏱️ *Tiempo de espera: máximo 5 a 10 minutos.*\nSi no recibes respuesta en ese tiempo, te lo haremos saber.';
            state.pausedAfterActivation = true;
            state.waitingForHumanHelp = true;
            state.humanHelpTimestamp = Date.now();
            // Programar recordatorio después de 5 minutos
            setTimeout(() => {
              const currentState = conversations.get(phone);
              if (currentState && currentState.waitingForHumanHelp && currentState.pausedAfterActivation) {
                process.emit('sendHumanHelpReminder5Min', { phone });
              }
            }, 300000); // 5 minutos
            // Programar mensaje de disculpa después de 10 minutos
            setTimeout(() => {
              const currentState = conversations.get(phone);
              if (currentState && currentState.waitingForHumanHelp && currentState.pausedAfterActivation) {
                process.emit('sendHumanHelpReminder10Min', { phone });
              }
            }, 600000); // 10 minutos
            break;
          case '2':
            // Enviar video tutorial sobre problemas al enviar pedido con mensaje como caption
            state.option5Selected = true;
            state.explanationSentAfterOption5 = false;
            state.assistanceShown = false;
            state.awaitingExplanationAfterVideo = true;
            state.menuReminderSent = false;
            conversations.set(phone, state);
            
            state.reminderTimeout = setTimeout(() => {
              const currentState = conversations.get(phone);
              if (currentState && !currentState.webOrderReceived && !currentState.menuReminderSent && 
                  !currentState.waitingForHumanHelp) {
                currentState.menuReminderSent = true;
                conversations.set(phone, currentState);
                
                const reminderMsg = '¿Aún no sabes qué pedir, veci? 😊\n\nTranquilo, tómate tu tiempo. Aquí sigo para ayudarte con lo que necesites 💛';
                const optionsMsg = '*¿En qué puedo ayudarte?*\n\n*1️⃣ Ayuda humana*\n*2️⃣ No me deja enviar el pedido*\n*3️⃣ Cómo hago más pedidos*\n*4️⃣ ¿Sí llegan a mi dirección?*\n*5️⃣ Quiero hacer un pedido*';
                
                if (client && typeof client.sendMessage === 'function') {
                  setTimeout(() => client.sendMessage(phone, reminderMsg), 500);
                  setTimeout(() => client.sendMessage(phone, optionsMsg), 1500);
                }
                logger.info(`Recordatorio enviado a ${phone} después de 15s sin enviar pedido`);
              }
            }, 15000);
            
            if (envConfig.media?.troubleshootVideoPath) {
              return { 
                media: { 
                  type: 'video', 
                  path: envConfig.media.troubleshootVideoPath,
                  caption: TROUBLESHOOT_SENDING_MESSAGE
                } 
              };
            }
            return TROUBLESHOOT_SENDING_MESSAGE;
          case '3':
            // Enviar video tutorial sobre cómo hacer múltiples pedidos
            state.option5Selected = true;
            state.explanationSentAfterOption5 = false;
            state.assistanceShown = false;
            state.awaitingExplanationAfterVideo = true;
            state.menuReminderSent = false;
            conversations.set(phone, state);
            
            state.reminderTimeout = setTimeout(() => {
              const currentState = conversations.get(phone);
              if (currentState && !currentState.webOrderReceived && !currentState.menuReminderSent && 
                  !currentState.waitingForHumanHelp) {
                currentState.menuReminderSent = true;
                conversations.set(phone, currentState);
                
                const reminderMsg = '¿Aún no sabes qué pedir, veci? 😊\n\nTranquilo, tómate tu tiempo. Aquí sigo para ayudarte con lo que necesites 💛';
                const optionsMsg = '*¿En qué puedo ayudarte?*\n\n*1️⃣ Ayuda humana*\n*2️⃣ No me deja enviar el pedido*\n*3️⃣ Cómo hago más pedidos*\n*4️⃣ ¿Sí llegan a mi dirección?*\n*5️⃣ Quiero hacer un pedido*';
                
                if (client && typeof client.sendMessage === 'function') {
                  setTimeout(() => client.sendMessage(phone, reminderMsg), 500);
                  setTimeout(() => client.sendMessage(phone, optionsMsg), 1500);
                }
                logger.info(`Recordatorio enviado a ${phone} después de 15s sin enviar pedido`);
              }
            }, 15000);
            
            if (envConfig.media?.duplicateVideoPath) {
              return { 
                media: { 
                  type: 'video', 
                  path: envConfig.media.duplicateVideoPath, 
                  caption: MULTIPLE_ORDERS_TUTORIAL 
                } 
              };
            }
            return MULTIPLE_ORDERS_TUTORIAL;
          case '4':
            // Igualar comportamiento a opción 5: texto + video, luego explicación y opciones
            resp = '*Para confirmar si llegamos a tu dirección 🛵💛*\nSolo debes hacer el pedido desde la página.\nSi el sistema te deja *confirmar la dirección,* significa que *sí te podemos atender.*';
            state.option5Selected = true;
            state.explanationSentAfterOption5 = false;
            state.assistanceShown = false;
            state.awaitingExplanationAfterVideo = true;
            state.menuReminderSent = false;
            conversations.set(phone, state);
            
            state.reminderTimeout = setTimeout(() => {
              const currentState = conversations.get(phone);
              if (currentState && !currentState.webOrderReceived && !currentState.menuReminderSent && 
                  !currentState.waitingForHumanHelp) {
                currentState.menuReminderSent = true;
                conversations.set(phone, currentState);
                
                const reminderMsg = '¿Aún no sabes qué pedir, veci? 😊\n\nTranquilo, tómate tu tiempo. Aquí sigo para ayudarte con lo que necesites 💛';
                const optionsMsg = '*¿En qué puedo ayudarte?*\n\n*1️⃣ Ayuda humana*\n*2️⃣ No me deja enviar el pedido*\n*3️⃣ Cómo hago más pedidos*\n*4️⃣ ¿Sí llegan a mi dirección?*\n*5️⃣ Quiero hacer un pedido*';
                
                if (client && typeof client.sendMessage === 'function') {
                  setTimeout(() => client.sendMessage(phone, reminderMsg), 500);
                  setTimeout(() => client.sendMessage(phone, optionsMsg), 1500);
                }
                logger.info(`Recordatorio enviado a ${phone} después de 15s sin enviar pedido`);
              }
            }, 15000);
            {
              const ai = await generateContextualReply(phone, 'greeting', raw, state);
              const text = ai || GREETING_MESSAGE;
              try {
                const { default: envConfig } = await import('../config/env-config.js');
                if (envConfig.media?.welcomeVideoUrl) {
                  return { messages: [resp], media: { type: 'video', url: envConfig.media.welcomeVideoUrl, caption: text } };
                }
                if (envConfig.media?.welcomeVideoPath) {
                  return { messages: [resp], media: { type: 'video', path: envConfig.media.welcomeVideoPath, caption: text } };
                }
              } catch {}
              return resp;
            }
        }
        conversations.set(phone, state);
        return resp;
      }

      // Por defecto: si sigue escribiendo después de las opciones, repetir explicación amable
      conversations.set(phone, state);
      const ai = await generateContextualReply(phone, 'default', raw, state);
      return ai || '¡Con mucho gusto, veci! 💛\n\nCuando necesites algo más, aquí estaré. ¡Que tengas un excelente día! 😊';
    }

    // Si está en el menú de 10 minutos de espera, primero normalizar la opción
    if (state.in10MinWaitMenu) {
      const menuOption = normalizeOption(raw);
      if (menuOption && ['1','2','3'].includes(menuOption) && !['1','2','3'].includes(normalized)) {
        // Actualizar normalized para que se procese correctamente
        normalized = menuOption;
        logger.info(`Opción normalizada de "${raw}" a "${menuOption}" en menú 10min`);
      } else if (!['1','2','3'].includes(normalized) && !menuOption) {
        // Si no es una opción válida, mostrar ayuda
        logger.info(`Usuario ${phone} escribió "${raw}" en menú 10min pero no es opción válida`);
        return OPTION_HELP_MESSAGE;
      }
    }
    
    // Si está en el menú de 10 minutos de espera, manejar opciones específicas
    if (state.in10MinWaitMenu && ['1','2','3'].includes(normalized)) {
      logger.info(`Opción ${normalized} seleccionada en menú de 10 minutos para ${phone}`);
      let resp = '';
      switch (normalized) {
        case '1':
          // Opción 1: Esperar un poco más
          resp = '*Perfecto, veci 💛*\nSeguiremos intentando comunicarte con alguien del equipo.\nTe avisaremos cuando estén disponibles.';
          state.pausedAfterActivation = true;
          state.waitingForHumanHelp = true;
          state.humanHelpTimestamp = Date.now();
          state.in10MinWaitMenu = false; // Salir del menú de 10 min
          // Programar otro ciclo de recordatorios
          setTimeout(() => {
            const currentState = conversations.get(phone);
            if (currentState && currentState.waitingForHumanHelp && currentState.pausedAfterActivation) {
              process.emit('sendHumanHelpReminder5Min', { phone });
            }
          }, 300000); // 5 minutos
          setTimeout(() => {
            const currentState = conversations.get(phone);
            if (currentState && currentState.waitingForHumanHelp && currentState.pausedAfterActivation) {
              process.emit('sendHumanHelpReminder10Min', { phone });
            }
          }, 600000); // 10 minutos
          conversations.set(phone, state);
          return resp;
        case '2':
          // Opción 2: Resolver con opciones automáticas
          resp = '*¡Perfecto! Te muestro las opciones automáticas 😊*';
          state.in10MinWaitMenu = false; // Salir del menú de 10 min
          state.assistanceShown = true; // Volver a mostrar opciones principales
          state.genericMsgCount = 0;
          conversations.set(phone, state);
          return { messages: [resp, INITIAL_ASSISTANCE_OPTIONS] };
        case '3':
          // Opción 3: Dejar número para callback
          resp = '*Entendido, veci 💛*\n\nDéjanos tu número de contacto y te llamaremos o escribiremos lo más pronto posible.\n\n*Escribe tu número aquí* (ej: 3001234567)';
          state.in10MinWaitMenu = false; // Salir del menú
          state.awaitingCallbackNumber = true; // Nuevo estado para esperar el número
          conversations.set(phone, state);
          return resp;
      }
    }

    // Si está esperando el número de callback
    if (state.awaitingCallbackNumber) {
      // Validar que sea un número de teléfono colombiano
      const phoneRegex = /3\d{9}/;
      const extractedPhone = raw.match(phoneRegex);
      if (extractedPhone) {
        const callbackNumber = extractedPhone[0];
        state.awaitingCallbackNumber = false;
        state.assistanceShown = false;
        state.genericMsgCount = 0;
        conversations.set(phone, state);
        
        // Notificar al admin si está configurado
        try {
          const { default: envConfig } = await import('../config/env-config.js');
          if (envConfig.adminPhoneNumber && client) {
            // Asegurar que el número tenga código de país 57 si no lo tiene
            let adminNumber = envConfig.adminPhoneNumber;
            if (!adminNumber.startsWith('57') && adminNumber.length === 10) {
              adminNumber = '57' + adminNumber;
            }
            const adminChatId = `${adminNumber}@c.us`;
            const notifyMessage = `*Solicitud de Callback* 📞\n\nCliente: ${phone.replace('@c.us', '')}\nNúmero de contacto: ${callbackNumber}\n\nPor favor, contactar lo antes posible.`;
            await client.sendMessage(adminChatId, notifyMessage);
            logger.info(`Notificación de callback enviada al administrador: ${adminNumber}`);
          }
        } catch (err) {
          logger.error('Error notificando callback:', err);
        }
        
        return `*Perfecto, veci 💛*\n\nHemos registrado tu número: *${callbackNumber}*\n\nTe contactaremos lo más pronto posible.\n\nGracias por tu paciencia 😊`;
      } else {
        return '*Por favor, escribe un número de teléfono válido* 📱\n\nEjemplo: 3001234567';
      }
    }

    // Si el usuario responde con una opción (1-5) tras mostrar asistencia, manejar primero
    // IMPORTANTE: Excluir si está en el menú de 10 minutos (tiene prioridad)
    if (state.assistanceShown && !state.in10MinWaitMenu && ['1','2','3','4','5'].includes(normalized)) {
      let resp = '';
      switch (normalized) {
        case '1':
          resp = '*Ya casi, veci 😊*\nEn un momento alguien te escribirá.\nGracias por tu paciencia 💛\n\n⏱️ *Tiempo de espera: máximo 5 a 10 minutos.*\nSi no recibes respuesta en ese tiempo, te lo haremos saber.';
          // Pausar conversación para que el bot no intervenga más
          state.pausedAfterActivation = true;
          state.waitingForHumanHelp = true;
          state.humanHelpTimestamp = Date.now();
          // Programar recordatorio después de 5 minutos
          setTimeout(() => {
            const currentState = conversations.get(phone);
            if (currentState && currentState.waitingForHumanHelp && currentState.pausedAfterActivation) {
              process.emit('sendHumanHelpReminder5Min', { phone });
            }
          }, 300000); // 5 minutos
          // Programar mensaje de disculpa después de 10 minutos
          setTimeout(() => {
            const currentState = conversations.get(phone);
            if (currentState && currentState.waitingForHumanHelp && currentState.pausedAfterActivation) {
              process.emit('sendHumanHelpReminder10Min', { phone });
            }
          }, 600000); // 10 minutos
          {
            const aiExtra = await generateContextualReply(phone, 'option_1', raw, state);
            if (aiExtra) resp += '\n\n' + aiExtra;
          }
          conversations.set(phone, state);
          return resp;
        case '2':
          // Activar secuencia de explicación -> opciones tras el video (igual que opción 3, 4 y 5)
          state.option5Selected = true;
          state.explanationSentAfterOption5 = false;
          state.assistanceShown = false;
          state.awaitingExplanationAfterVideo = true;
          state.menuReminderSent = false;
          conversations.set(phone, state);
          
          // ✅ Programar recordatorio (15 segundos)
          state.reminderTimeout = setTimeout(() => {
            const currentState = conversations.get(phone);
            if (currentState && !currentState.webOrderReceived && !currentState.menuReminderSent && 
                !currentState.waitingForHumanHelp) {
              currentState.menuReminderSent = true;
              conversations.set(phone, currentState);
              
              const reminderMsg = '¿Aún no sabes qué pedir, veci? 😊\n\nTranquilo, tómate tu tiempo. Aquí sigo para ayudarte con lo que necesites 💛';
              const optionsMsg = '*¿En qué puedo ayudarte?*\n\n*1️⃣ Ayuda humana*\n*2️⃣ No me deja enviar el pedido*\n*3️⃣ Cómo hago más pedidos*\n*4️⃣ ¿Sí llegan a mi dirección?*\n*5️⃣ Quiero hacer un pedido*';
              
              if (client && typeof client.sendMessage === 'function') {
                setTimeout(() => client.sendMessage(phone, reminderMsg), 500);
                setTimeout(() => client.sendMessage(phone, optionsMsg), 1500);
              }
              logger.info(`Recordatorio enviado a ${phone} después de 15s sin enviar pedido`);
            }
          }, 15000);
          
          conversations.set(phone, state);
          
          // Enviar video tutorial sobre problemas al enviar pedido con mensaje como caption
          if (envConfig.media?.troubleshootVideoPath) {
            return { 
              media: { 
                type: 'video', 
                path: envConfig.media.troubleshootVideoPath,
                caption: TROUBLESHOOT_SENDING_MESSAGE
              } 
            };
          }
          return TROUBLESHOOT_SENDING_MESSAGE;
        case '3':
          // Activar secuencia de explicación -> opciones tras el video (igual que opción 2, 4 y 5)
          state.option5Selected = true;
          state.explanationSentAfterOption5 = false;
          state.assistanceShown = false;
          state.awaitingExplanationAfterVideo = true;
          state.menuReminderSent = false;
          conversations.set(phone, state);
          
          // ✅ Programar recordatorio (15 segundos)
          state.reminderTimeout = setTimeout(() => {
            const currentState = conversations.get(phone);
            if (currentState && !currentState.webOrderReceived && !currentState.menuReminderSent && 
                !currentState.waitingForHumanHelp) {
              currentState.menuReminderSent = true;
              conversations.set(phone, currentState);
              
              const reminderMsg = '¿Aún no sabes qué pedir, veci? 😊\n\nTranquilo, tómate tu tiempo. Aquí sigo para ayudarte con lo que necesites 💛';
              const optionsMsg = '*¿En qué puedo ayudarte?*\n\n*1️⃣ Ayuda humana*\n*2️⃣ No me deja enviar el pedido*\n*3️⃣ Cómo hago más pedidos*\n*4️⃣ ¿Sí llegan a mi dirección?*\n*5️⃣ Quiero hacer un pedido*';
              
              if (client && typeof client.sendMessage === 'function') {
                setTimeout(() => client.sendMessage(phone, reminderMsg), 500);
                setTimeout(() => client.sendMessage(phone, optionsMsg), 1500);
              }
              logger.info(`Recordatorio enviado a ${phone} después de 15s sin enviar pedido`);
            }
          }, 15000);
          
          conversations.set(phone, state);
          
          // Enviar video tutorial sobre duplicar pedidos
          if (envConfig.media?.duplicateVideoPath) {
            return { 
              media: { 
                type: 'video', 
                path: envConfig.media.duplicateVideoPath, 
                caption: MULTIPLE_ORDERS_TUTORIAL 
              } 
            };
          }
          return MULTIPLE_ORDERS_TUTORIAL;
        case '4':
          resp = '*Para confirmar si llegamos a tu dirección 🛵💛*\nSolo debes hacer el pedido desde la página.\nSi el sistema te deja *confirmar la dirección,* significa que *sí te podemos atender.*';
          {
            const aiExtra = await generateContextualReply(phone, 'option_4', raw, state);
            if (aiExtra) resp += '\n\n' + aiExtra;
          }
          // Activar secuencia de explicación -> opciones tras el video (igual que opción 5)
          state.option5Selected = true;
          state.explanationSentAfterOption5 = false;
          state.assistanceShown = false;
          state.awaitingExplanationAfterVideo = true;
          state.menuReminderSent = false;
          
          // ✅ Programar recordatorio (15 segundos)
          state.reminderTimeout = setTimeout(() => {
            const currentState = conversations.get(phone);
            if (currentState && !currentState.webOrderReceived && !currentState.menuReminderSent && 
                !currentState.waitingForHumanHelp) {
              currentState.menuReminderSent = true;
              conversations.set(phone, currentState);
              
              const reminderMsg = '¿Aún no sabes qué pedir, veci? 😊\n\nTranquilo, tómate tu tiempo. Aquí sigo para ayudarte con lo que necesites 💛';
              const optionsMsg = '*¿En qué puedo ayudarte?*\n\n*1️⃣ Ayuda humana*\n*2️⃣ No me deja enviar el pedido*\n*3️⃣ Cómo hago más pedidos*\n*4️⃣ ¿Sí llegan a mi dirección?*\n*5️⃣ Quiero hacer un pedido*';
              
              if (client && typeof client.sendMessage === 'function') {
                setTimeout(() => client.sendMessage(phone, reminderMsg), 500);
                setTimeout(() => client.sendMessage(phone, optionsMsg), 1500);
              }
              logger.info(`Recordatorio enviado a ${phone} después de 15s sin enviar pedido`);
            }
          }, 15000);
          
          // Devolver primero el texto de la opción y luego el video con caption
          {
            const ai = await generateContextualReply(phone, 'greeting', raw, state);
            const text = ai || GREETING_MESSAGE;
            try {
              const { default: envConfig } = await import('../config/env-config.js');
              if (envConfig.media?.welcomeVideoUrl) {
                conversations.set(phone, state);
                return { messages: [resp], media: { type: 'video', url: envConfig.media.welcomeVideoUrl, caption: text } };
              }
              if (envConfig.media?.welcomeVideoPath) {
                conversations.set(phone, state);
                return { messages: [resp], media: { type: 'video', path: envConfig.media.welcomeVideoPath, caption: text } };
              }
            } catch {}
            conversations.set(phone, state);
            return resp;
          }
        case '5':
          // Nueva opción: QUIERO HACER UN PEDIDO
          state.option5Selected = true; // Marcar que se seleccionó opción 5
          state.genericMsgCount = 0; // Reiniciar contador para el nuevo flujo
          // Reiniciar banderas para asegurar secuencia: explicación -> opciones
          state.explanationSentAfterOption5 = false;
          state.assistanceShown = false;
          state.awaitingExplanationAfterVideo = true;
          state.menuReminderSent = false;
          conversations.set(phone, state);
          
          // ✅ Programar recordatorio (15 segundos)
          state.reminderTimeout = setTimeout(() => {
            const currentState = conversations.get(phone);
            if (currentState && !currentState.webOrderReceived && !currentState.menuReminderSent && 
                !currentState.waitingForHumanHelp) {
              currentState.menuReminderSent = true;
              conversations.set(phone, currentState);
              
              const reminderMsg = '¿Aún no sabes qué pedir, veci? 😊\n\nTranquilo, tómate tu tiempo. Aquí sigo para ayudarte con lo que necesites 💛';
              const optionsMsg = '*¿En qué puedo ayudarte?*\n\n*1️⃣ Ayuda humana*\n*2️⃣ No me deja enviar el pedido*\n*3️⃣ Cómo hago más pedidos*\n*4️⃣ ¿Sí llegan a mi dirección?*\n*5️⃣ Quiero hacer un pedido*';
              
              if (client && typeof client.sendMessage === 'function') {
                setTimeout(() => client.sendMessage(phone, reminderMsg), 500);
                setTimeout(() => client.sendMessage(phone, optionsMsg), 1500);
              }
              logger.info(`Recordatorio enviado a ${phone} después de 15s sin enviar pedido`);
            }
          }, 15000);
          
          conversations.set(phone, state);
          
          // Programar recordatorio si no envía pedido en 15 segundos
          state.reminderTimeout = setTimeout(() => {
            const currentState = conversations.get(phone);
            if (currentState && !currentState.webOrderReceived && !currentState.menuReminderSent && 
                !currentState.waitingForHumanHelp) {
              currentState.menuReminderSent = true;
              conversations.set(phone, currentState);
              
              const reminderMsg = '¿Aún no sabes qué pedir, veci? 😊\n\nTranquilo, tómate tu tiempo. Aquí sigo para ayudarte con lo que necesites 💛';
              const optionsMsg = '*¿En qué puedo ayudarte?*\n\n*1️⃣ Ayuda humana*\n*2️⃣ No me deja enviar el pedido*\n*3️⃣ Cómo hago más pedidos*\n*4️⃣ ¿Sí llegan a mi dirección?*\n*5️⃣ Quiero hacer un pedido*';
              
              if (client && typeof client.sendMessage === 'function') {
                setTimeout(() => client.sendMessage(phone, reminderMsg), 500);
                setTimeout(() => client.sendMessage(phone, optionsMsg), 1500);
              }
              logger.info(`Recordatorio enviado a ${phone} después de 15s sin enviar pedido`);
            }
          }, 15000);
          
          const ai = await generateContextualReply(phone, 'greeting', raw, state);
          const text = ai || GREETING_MESSAGE;
          // Si hay video de bienvenida configurado, enviar en un solo mensaje como caption
          try {
            const { default: envConfig } = await import('../config/env-config.js');
            if (envConfig.media?.welcomeVideoUrl) {
              return { media: { type: 'video', url: envConfig.media.welcomeVideoUrl, caption: text } };
            }
            if (envConfig.media?.welcomeVideoPath) {
              return { media: { type: 'video', path: envConfig.media.welcomeVideoPath, caption: text } };
            }
          } catch {}
          // Si no hay video, enviar solo el texto
          return text;
      }
    }

    // Flujo inicial: mostrar opciones al primer mensaje (si no seleccionó opción 5)
    if (!state.option5Selected && !state.assistanceShown) {
      // Conteo de mensajes genéricos para flujo inicial
      state.genericMsgCount += 1;

      if (state.genericMsgCount === 1) {
        // Mostrar opciones directamente en lugar del saludo con video
        state.assistanceShown = true;
        conversations.set(phone, state);
        const ai = await generateContextualReply(phone, 'assistance', raw, state);
        return ai || INITIAL_ASSISTANCE_OPTIONS;
      }
    }

    // Ya mostramos opciones; siguiente mensaje debe ser pregunta de nuevo pedido
    if (!state.postAssistancePromptSent) {
      state.postAssistancePromptSent = true;
      conversations.set(phone, state);
      const ai = await generateContextualReply(phone, 'follow_up', raw, state);
      return ai || 'Hola, ¿cómo estás? ¿Quieres hacer otro pedido, sí o no?';
    }

    // Manejo de respuesta a la pregunta "sí o no"
    if (normalized === 'si' || normalized === 'sí') {
      conversations.set(phone, state);
      const ai = await generateContextualReply(phone, 'greeting', raw, state);
      return ai || GREETING_MESSAGE;
    }
    if (normalized === 'no') {
      conversations.set(phone, state);
      const ai = await generateContextualReply(phone, 'assistance', raw, state);
      return ai || INITIAL_ASSISTANCE_OPTIONS;
    }

    // (El manejo de opciones 1-4 ahora sucede antes de la pregunta de seguimiento)

    // Activación de pausa: si escribes la palabra clave "okey" el bot deja de responder
    if (normalized.includes('okey')) {
      state.pausedAfterActivation = true;
      conversations.set(phone, state);
      return; // no enviamos nada
    }

    // Por defecto, tras haber pasado por asistencia y pregunta, responder amablemente y no repetir bucle
    conversations.set(phone, state);
    const ai = await generateContextualReply(phone, 'default', raw, state);
    return ai || '¡Con mucho gusto, veci! 💛\n\nCuando necesites algo más, aquí estaré. ¡Que tengas un excelente día! 😊';
  } catch (error) {
    logger.error('Error procesando mensaje simple:', error);
    return 'Hubo un error procesando tu mensaje. Intenta de nuevo, por favor.';
  }
}

// Temporizadores de recordatorios de pago
const paymentReminders = new Map();
const MAX_PAYMENT_REMINDERS = 3; // Máximo 3 recordatorios
const REMINDER_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos entre recordatorios

/**
 * Detecta si el usuario está avisando que enviará el pago
 */
function detectPaymentIntent(message) {
  const normalized = message.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .trim();
  
  const paymentIntentPatterns = [
    /ya te (envio|envío|mando|paso)/i,
    /dame un momento/i,
    /ya va/i,
    /espera/i,
    /ahorita/i,
    /en un momento/i,
    /ya mismo/i,
    /ahora (te |lo )?envio/i,
    /ahora (te |lo )?envío/i,
    /enseguida/i,
    /ya lo (hago|envio|envío|mando)/i,
    /dejame/i,
    /déjame/i,
    /un segundo/i,
    /un minuto/i
  ];
  
  return paymentIntentPatterns.some(pattern => pattern.test(normalized));
}

/**
 * Pausa temporalmente los recordatorios de pago
 * Cuando el usuario avisa que enviará el pago, se pausa 30 minutos
 * y luego se reanudan recordatorios cada 30 minutos hasta recibir el comprobante
 */
function pausePaymentReminders(phone, pauseMinutes = 30) {
  const state = conversations.get(phone);
  if (!state) return false;
  
  // Cancelar recordatorio actual
  if (paymentReminders.has(phone)) {
    clearTimeout(paymentReminders.get(phone));
    paymentReminders.delete(phone);
  }
  
  // Marcar que el usuario avisó
  state.userNotifiedPayment = true;
  state.lastPaymentNotificationTime = Date.now();
  state.pausedReminderCount = (state.pausedReminderCount || 0) + 1;
  conversations.set(phone, state);
  
  logger.info(`Recordatorios pausados para ${phone} por ${pauseMinutes} minutos (pausa #${state.pausedReminderCount})`);
  
  // Reanudar recordatorios después del tiempo de pausa (30 minutos)
  const resumeReminder = setTimeout(() => {
    const currentState = conversations.get(phone);
    if (currentState && currentState.waitingForPayment && !currentState.paymentReceived) {
      logger.info(`Reanudando recordatorios para ${phone} después de ${pauseMinutes} minutos`);
      
      // Enviar recordatorio y configurar el siguiente en 30 minutos
      sendLongWaitReminder(phone);
    }
  }, pauseMinutes * 60 * 1000);
  
  paymentReminders.set(phone, resumeReminder);
  return true;
}

/**
 * Envía recordatorios cada 30 minutos cuando el usuario avisó pero no envía comprobante
 */
async function sendLongWaitReminder(phone) {
  const state = conversations.get(phone);
  if (!state || !state.waitingForPayment || state.paymentReceived) return;
  
  const reminderMessage = 'Veci, aún estoy esperando el comprobante de pago 📲💳\n\nCuando puedas, envíalo por aquí 😊';
  
  try {
    // Enviar recordatorio
    process.emit('sendPaymentReminder', { phone, message: reminderMessage });
    logger.info(`Recordatorio de espera larga enviado a ${phone} (después de aviso de usuario)`);
    
    // Programar siguiente recordatorio en 30 minutos
    const nextReminder = setTimeout(() => {
      sendLongWaitReminder(phone);
    }, 30 * 60 * 1000);
    
    paymentReminders.set(phone, nextReminder);
  } catch (error) {
    logger.error('Error enviando recordatorio de espera larga:', error);
  }
}

// Configurar recordatorios automáticos para pagos digitales
function setupPaymentReminders(phone) {
  // Limpiar recordatorios previos
  if (paymentReminders.has(phone)) {
    clearTimeout(paymentReminders.get(phone));
  }
  
  // Primer recordatorio a 1 minuto
  const firstReminder = setTimeout(() => {
    sendPaymentReminder(phone, 1);
  }, 60000); // 1 minuto
  
  paymentReminders.set(phone, firstReminder);
}

// Enviar recordatorio de pago
async function sendPaymentReminder(phone, reminderNumber) {
  const state = conversations.get(phone);
  if (!state || !state.waitingForPayment || state.paymentReceived) return;
  
  // Límite de recordatorios alcanzado
  if (reminderNumber > MAX_PAYMENT_REMINDERS) {
    logger.info(`Límite de recordatorios alcanzado para ${phone} (${MAX_PAYMENT_REMINDERS})`);
    return;
  }
  
  state.paymentReminderCount = reminderNumber;
  conversations.set(phone, state);
  
  const reminderMessage = 'Por favor, comparte el comprobante de pago 📲💳';
  
  try {
    // Usar emisor de eventos para enviar el recordatorio
    process.emit('sendPaymentReminder', { phone, message: reminderMessage });
    logger.info(`Recordatorio de pago ${reminderNumber}/${MAX_PAYMENT_REMINDERS} programado para ${phone}`);
    
    // Programar siguiente recordatorio solo si no se alcanzó el máximo
    if (reminderNumber < MAX_PAYMENT_REMINDERS) {
      const nextReminder = setTimeout(() => {
        sendPaymentReminder(phone, reminderNumber + 1);
      }, REMINDER_INTERVAL_MS);
      
      paymentReminders.set(phone, nextReminder);
    }
  } catch (error) {
    logger.error('Error enviando recordatorio de pago:', error);
  }
}

// Manejar recepción de imagen (comprobante de pago)
export async function handlePaymentReceipt(phone, imageBuffer = null) {
  const state = conversations.get(phone);
  
  // Caso 1: Cliente esperaba pago por transferencia (flujo normal)
  if (state && state.waitingForPayment) {
    // Marcar que el pago fue recibido para evitar recordatorios
    state.paymentReceived = true;
    conversations.set(phone, state);
    
    // Si tenemos la imagen y Vision API está disponible, verificar automáticamente
    if (imageBuffer && isVisionAvailable()) {
      try {
        logger.info(`Verificando comprobante automáticamente para ${phone}...`);
        
        // Obtener monto esperado del pedido (extraer del mensaje de confirmación)
        // Por ahora usamos un valor base, idealmente debería guardarse en el estado
        const expectedAmount = state.orderAmount || 13000; // Valor por defecto
        const expectedMethod = state.paymentMethod; // 'Nequi' o 'Daviplata'
        
        const verification = await verifyPaymentReceipt(imageBuffer, expectedAmount, expectedMethod);
        
        if (verification.verified) {
          // Comprobante verificado exitosamente
          // Cancelar recordatorios
          if (paymentReminders.has(phone)) {
            clearTimeout(paymentReminders.get(phone));
            paymentReminders.delete(phone);
          }
          
          state.waitingForPayment = false;
          state.paymentMethod = null;
          state.paymentVerified = true;
          conversations.set(phone, state);
          
          logger.info(`✅ Comprobante verificado automáticamente para ${phone}`);
          
          let response = `*¡Comprobante verificado! ✅*\n\nMonto: $${verification.details.extractedAmount}\nFecha: ${verification.details.extractedDate}\nMétodo: ${verification.details.extractedBank}`;
          
          // Si hay advertencias (ej: método de pago diferente), mencionarlas
          if (verification.warnings && verification.warnings.length > 0) {
            response += `\n\n📝 *Nota:* ${verification.warnings.join(', ')}`;
          }
          
          response += `\n\n¡Muchas gracias, veci! Tu pago ha sido confirmado. 💛`;
          
          return response;
        } else {
          // Comprobante no válido o requiere revisión manual
          logger.warn(`⚠️ Comprobante requiere revisión manual para ${phone}: ${verification.reason}`);
          
          if (verification.manualReview) {
            // Cancelar recordatorios de todas formas
            if (paymentReminders.has(phone)) {
              clearTimeout(paymentReminders.get(phone));
              paymentReminders.delete(phone);
            }
            
            state.waitingForPayment = false;
            state.paymentMethod = null;
            state.pendingManualReview = true;
            conversations.set(phone, state);
            
            // Verificar si falta la fecha específicamente (transacción no completada)
            const missingDate = !verification.details?.extractedDate && 
                               verification.reason?.includes('no se detectó fecha');
            
            // Verificar si SOLO es el método de pago diferente (pero monto y fecha ok)
            const onlyMethodDifferent = verification.details?.extractedAmount === expectedAmount &&
                                       verification.details?.extractedDate &&
                                       !verification.validations?.hasDate !== true && // Tiene fecha
                                       verification.reason?.includes('método de pago diferente');
            
            let response = '';
            
            if (missingDate) {
              // Mensaje específico cuando falta la fecha (usuario no ha dado "Enviar")
              response = `*⚠️ Esperando confirmación de pago* 📲\n\n`;
              response += `Veo que la transferencia aún no se ha completado.\n\n`;
              response += `*Por favor:*\n`;
              response += `1️⃣ Dale *"Enviar"* en la app de tu banco\n`;
              response += `2️⃣ Espera la confirmación\n`;
              response += `3️⃣ Envía el comprobante final con la fecha\n\n`;
              response += `Te estaré esperando, veci 💛`;
            } else if (onlyMethodDifferent) {
              // Si solo cambió el método pero todo lo demás está bien, aceptar
              state.pendingManualReview = false;
              state.paymentVerified = true;
              conversations.set(phone, state);
              
              response = `*¡Comprobante verificado! ✅*\n\nMonto: $${verification.details.extractedAmount}\nFecha: ${verification.details.extractedDate}\nMétodo: ${verification.details.extractedBank}`;
              response += `\n\n📝 *Nota:* Pagaste con ${verification.details.extractedBank} en lugar de ${expectedMethod}, pero está perfecto 👌`;
              response += `\n\n¡Muchas gracias, veci! Tu pago ha sido confirmado. 💛`;
            } else {
              // Mensaje general para otros casos de revisión manual
              response = `*Imagen recibida* 📸\n\nEstamos revisando tu comprobante.\n`;
              
              if (verification.details) {
                response += `\n🔍 *Información detectada:*\n`;
                if (verification.details.extractedAmount) {
                  response += `• Monto: $${verification.details.extractedAmount}`;
                  if (verification.details.extractedAmount !== expectedAmount) {
                    response += ` ⚠️ (esperado: $${expectedAmount})`;
                  }
                  response += `\n`;
                }
                if (verification.details.extractedDate) {
                  response += `• Fecha: ${verification.details.extractedDate}\n`;
                }
                if (verification.details.extractedBank) {
                  response += `• Método: ${verification.details.extractedBank}\n`;
                }
              }
              
              response += `\n⚠️ *Nota:* ${verification.reason}\n\nNuestro equipo lo revisará y te confirmaremos pronto. 💛`;
            }
            
            return response;
          }
        }
      } catch (error) {
        logger.error('Error verificando comprobante:', error);
        // Continuar con flujo manual si falla la verificación automática
      }
    }
    
    // Flujo manual (sin imagen o sin Vision API)
    // Cancelar recordatorios
    if (paymentReminders.has(phone)) {
      clearTimeout(paymentReminders.get(phone));
      paymentReminders.delete(phone);
    }
    
    // Actualizar estado
    state.waitingForPayment = false;
    state.paymentMethod = null;
    conversations.set(phone, state);
    
    logger.info(`Comprobante de pago recibido de ${phone} (revisión manual)`);
    return 'Comprobante recibido. ¡Muchas gracias, veci! 💛';
  }
  
  // Caso 2: Cliente seleccionó Efectivo pero envió comprobante (cambió de opinión)
  if (state && state.cashPayment && state.webOrderReceived) {
    logger.info(`Cliente ${phone} seleccionó Efectivo pero envió comprobante - actualizando método de pago`);
    
    // Actualizar estado a pago por transferencia
    state.cashPayment = false;
    state.waitingForPayment = true;
    state.paymentReceived = true;
    state.paymentTimestamp = Date.now();
    conversations.set(phone, state);
    
    // Procesar la imagen con Vision API
    if (imageBuffer && isVisionAvailable()) {
      try {
        logger.info(`Verificando comprobante (cambio de Efectivo a Transferencia) para ${phone}...`);
        
        const expectedAmount = state.orderAmount || 13000;
        const verification = await verifyPaymentReceipt(imageBuffer, expectedAmount, null);
        
        if (verification.verified) {
          state.paymentMethod = verification.details.extractedBank || 'Transferencia';
          state.paymentVerified = true;
          conversations.set(phone, state);
          
          logger.info(`✅ Comprobante verificado (cambio de método) para ${phone}`);
          return `*¡Perfecto! Comprobante recibido y verificado ✅*\n\nHemos actualizado tu pedido:\n• Método de pago: ${state.paymentMethod}\n• Monto: $${verification.details.extractedAmount}\n• Fecha: ${verification.details.extractedDate}\n\n¡Muchas gracias, veci! 💛`;
        } else if (verification.manualReview) {
          state.paymentMethod = verification.details.extractedBank || 'Transferencia';
          state.pendingManualReview = true;
          conversations.set(phone, state);
          
          let response = `*Comprobante recibido* 📸\n\nHemos actualizado tu método de pago a transferencia.\n\n🔍 *Información detectada:*\n`;
          
          if (verification.details.extractedAmount) {
            const amountMatch = verification.details.extractedAmount === expectedAmount;
            response += `• Monto: $${verification.details.extractedAmount} ${!amountMatch ? '⚠️ (esperado: $' + expectedAmount + ')' : ''}\n`;
          }
          if (verification.details.extractedDate) {
            response += `• Fecha: ${verification.details.extractedDate}\n`;
          }
          if (verification.details.extractedBank) {
            response += `• Método: ${verification.details.extractedBank}\n`;
          }
          
          response += `\n⚠️ *Nota:* ${verification.reason}\n\nNuestro equipo lo revisará y te confirmaremos pronto. 💛`;
          return response;
        }
      } catch (err) {
        logger.error(`Error verificando comprobante (cambio de método) para ${phone}:`, err);
      }
    }
    
    // Si no hay Vision API o falla, respuesta genérica
    return `*Comprobante recibido* 📸\n\nHemos actualizado tu pedido de *Efectivo* a *Transferencia*.\n\nEstamos revisando tu comprobante y te confirmaremos pronto. 💛`;
  }
  
  // Caso 3: Cliente está en revisión manual pendiente y reenvía el comprobante
  if (state && state.pendingManualReview && imageBuffer) {
    logger.info(`Cliente ${phone} en revisión manual reenvía comprobante - verificando nuevamente`);
    
    if (isVisionAvailable()) {
      try {
        logger.info(`Re-verificando comprobante para ${phone}...`);
        
        const expectedAmount = state.orderAmount || 13000;
        const expectedMethod = state.paymentMethod;
        const verification = await verifyPaymentReceipt(imageBuffer, expectedAmount, expectedMethod);
        
        if (verification.verified) {
          // Comprobante ahora válido
          state.pendingManualReview = false;
          state.paymentVerified = true;
          conversations.set(phone, state);
          
          logger.info(`✅ Comprobante re-verificado exitosamente para ${phone}`);
          
          let response = `*¡Comprobante verificado! ✅*\n\nMonto: $${verification.details.extractedAmount}\nFecha: ${verification.details.extractedDate}\nMétodo: ${verification.details.extractedBank}`;
          
          if (verification.warnings && verification.warnings.length > 0) {
            response += `\n\n📝 *Nota:* ${verification.warnings.join(', ')}`;
          }
          
          response += `\n\n¡Muchas gracias, veci! Tu pago ha sido confirmado. 💛`;
          
          return response;
        } else if (verification.manualReview) {
          // Aún requiere revisión manual
          logger.warn(`⚠️ Comprobante re-enviado aún requiere revisión para ${phone}: ${verification.reason}`);
          
          // Verificar si falta la fecha específicamente
          const missingDate = !verification.details?.extractedDate && 
                             verification.reason?.includes('no se detectó fecha');
          
          if (missingDate) {
            return `*⚠️ Aún falta la fecha* 📅\n\nPor favor, asegúrate de:\n• Dar *"Enviar"* en tu app bancaria\n• Esperar la confirmación\n• Enviar la captura completa con la fecha visible\n\nTe estaré esperando, veci 💛`;
          }
          
          let response = `*Imagen recibida* 📸\n\nEstamos revisando tu nuevo comprobante.\n`;
          
          if (verification.details) {
            response += `\n🔍 *Información detectada:*\n`;
            if (verification.details.extractedAmount) {
              response += `• Monto: $${verification.details.extractedAmount}`;
              if (verification.details.extractedAmount !== expectedAmount) {
                response += ` ⚠️ (esperado: $${expectedAmount})`;
              }
              response += `\n`;
            }
            if (verification.details.extractedDate) {
              response += `• Fecha: ${verification.details.extractedDate}\n`;
            }
            if (verification.details.extractedBank) {
              response += `• Método: ${verification.details.extractedBank}\n`;
            }
          }
          
          response += `\n⚠️ *Nota:* ${verification.reason}\n\nNuestro equipo lo revisará y te confirmaremos pronto. 💛`;
          return response;
        }
      } catch (err) {
        logger.error(`Error re-verificando comprobante para ${phone}:`, err);
      }
    }
    
    // Si no hay Vision API, respuesta genérica
    return `*Comprobante recibido* 📸\n\nEstamos revisando tu comprobante actualizado.\n\nTe confirmaremos pronto. 💛`;
  }
  
  return null;
}

export function clearConversations() {
  conversations.clear();
  // Limpiar también los recordatorios
  for (const timeout of paymentReminders.values()) {
    clearTimeout(timeout);
  }
  paymentReminders.clear();
  logger.info('Conversaciones y recordatorios limpiados.');
}

// Permite reactivar manualmente un chat pausado (comando administrativo)
export function unpauseConversation(targetPhone) {
  const state = conversations.get(targetPhone);
  if (state && state.pausedAfterActivation) {
    // Reactivar y reiniciar el flujo a estado inicial
    state.pausedAfterActivation = false;
    state.waitingForHumanHelp = false;
    state.humanHelpTimestamp = null;
    state.genericMsgCount = 0;
    state.webOrderReceived = false;
    state.assistanceShown = true; // Marcar que ya se mostraron las opciones
    state.postAssistancePromptSent = false;
    state.in10MinWaitMenu = true; // Marcar que está en menú de 10 minutos
    conversations.set(targetPhone, state);
    logger.info(`Conversación reactivada para ${targetPhone}.`);
    return true;
  }
  return false;
}

// Actualizar el estado de una conversación específica
export function updateConversationState(targetPhone, newState) {
  const state = conversations.get(targetPhone);
  if (state) {
    state.step = newState;
    conversations.set(targetPhone, state);
    logger.info(`Estado actualizado a '${newState}' para ${targetPhone}.`);
    return true;
  }
  logger.warn(`No se pudo actualizar estado para ${targetPhone}: conversación no encontrada.`);
  return false;
}

// Cancelar timeout de recordatorio inmediatamente
export function cancelReminderTimeout(phone) {
  const state = conversations.get(phone);
  if (state && state.reminderTimeout) {
    clearTimeout(state.reminderTimeout);
    state.reminderTimeout = null;
    logger.info(`✅ Timeout CANCELADO INMEDIATAMENTE para ${phone} - usuario escribió`);
    return true;
  }
  return false;
}