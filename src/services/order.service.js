// src/services/order.service.js
import pkg from "whatsapp-web.js";
const { MessageMedia } = pkg;
import logger from "../utils/logger.js";
import {
  MENU_PHOTO_URL,
  CLOSED_MESSAGE,
  CONVERSATION_TIMEOUT,
} from "../config/order-config.js";
import { isWithinBusinessHours } from "../utils/order-utils.js";
import { handleInitial } from "../handlers/initial-handlers.js";
import { dispatchState } from "../handlers/state-dispatcher.js";
import { getSecondaryMessage } from "../utils/conversation-utils.js";

const conversations = new Map();

export async function processOrder(phone, message, client) { // Añadimos client como parámetro
  // Ignorar mensajes de canales automatizados o vacíos
  if (
    phone.endsWith('@newsletter') ||
    phone.endsWith('@g.us') ||
    phone.endsWith('@broadcast') ||
    phone === "status@broadcast" ||
    !message.trim()
  ) {
    logger.info(`Ignorando mensaje de canal automatizado o no válido: ${phone}`);
    return;
  }

  // Verificar horario de atención
  if (!isWithinBusinessHours()) return CLOSED_MESSAGE;

  // Manejar imágenes
  if (message.startsWith('/9j/') || message.startsWith('data:image')) {
    logger.info(`Mensaje de ${phone} es una imagen, solicitando texto.`);
    return {
      main: 'Lo siento, no puedo procesar imágenes. Por favor, envía un mensaje de texto para iniciar un pedido (ejemplo: "hola" o "quiero 1 almuerzo").',
      secondary: getSecondaryMessage("initial")
    };
  }

  // Obtener o inicializar conversación
  let conversation = conversations.get(phone) || {
    phone,
    step: "initial",
    conversationClosed: false,
    lastActivity: Date.now(),
    lunches: [],
    remainingCount: 0,
    groups: [],
    addresses: [],
    welcomeSent: false,
    errorCount: 0,
    lastOrder: null,
    lastOrderLunches: [],
  };

  const lowercaseMessage = message.toLowerCase().trim();

  // Manejo global de comandos
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    const response = dispatchState(conversation, message, client); // Pasamos client
    conversations.set(phone, conversation);
    if (typeof response === "object" && response.main) {
      return {
        main: response.main,
        secondary: getSecondaryMessage(conversation.step)
      };
    }
    return {
      main: response,
      secondary: getSecondaryMessage(conversation.step)
    };
  }

  if (lowercaseMessage === "editar") {
    conversation.step = "awaiting_order_count";
    conversations.set(phone, conversation);
    return {
      main: "✅ Vamos a editar. ¿Cuántos almuerzos quieres?",
      secondary: getSecondaryMessage(conversation.step)
    };
  }

  if (lowercaseMessage === "cancelar") {
    conversations.delete(phone);
    return {
      main: "❌ Pedido cancelado. Di 'hola' para empezar de nuevo. 😊",
      secondary: getSecondaryMessage("initial")
    };
  }

  conversation.lastActivity = Date.now();
  let response;

  try {
    logger.info(`Procesando mensaje de ${phone}: "${message}" | Estado: ${conversation.step}`);
    if (conversation.step === "initial") {
      response = await handleInitial(conversation, MENU_PHOTO_URL, MessageMedia);
    } else {
      response = dispatchState(conversation, message, client); // Pasamos client
    }

    // Manejar respuestas con múltiples mensajes (como el inicial con media)
    if (response && response.messages && Array.isArray(response.messages)) {
      conversations.set(phone, conversation);
      return response;
    }

    // Procesar respuestas estructuradas
    if (typeof response === "object") {
      if (response.clearConversation) {
        conversations.delete(phone);
        logger.info(`Conversación de ${phone} eliminada tras completar pedido.`);
        return response;
      }
      if (response.notify) {
        conversations.set(phone, conversation);
        return response;
      }
      if (response.options) {
        conversations.set(phone, conversation);
        return response;
      }
      conversations.set(phone, conversation);
      return {
        main: response.main,
        secondary: getSecondaryMessage(conversation.step)
      };
    }

    // Manejar respuestas de texto plano
    if (typeof response === "string") {
      if (response.includes("No entendí")) {
        conversation.errorCount++;
        if (conversation.errorCount >= 3) {
          response += `\n\n🔔 ¿Te está costando? Escribe "ayuda" y te explico paso a paso.`;
        }
      } else {
        conversation.errorCount = 0;
      }
      conversations.set(phone, conversation);
      return {
        main: response,
        secondary: getSecondaryMessage(conversation.step)
      };
    }

  } catch (error) {
    logger.error("Error procesando pedido:", error);
    conversations.delete(phone);
    return {
      main: "❌ Hubo un error. Dime cuántos almuerzos quieres para empezar de nuevo.",
      secondary: getSecondaryMessage("awaiting_order_count")
    };
  }
}

export function clearConversations() {
  conversations.clear();
  logger.info("Conversaciones limpiadas.");
}

// Limpieza de conversaciones inactivas
setInterval(() => {
  const now = Date.now();
  for (const [phone, conversation] of conversations) {
    if (now - conversation.lastActivity > CONVERSATION_TIMEOUT) {
      conversations.delete(phone);
      logger.info(`Conversación de ${phone} eliminada por inactividad.`);
    }
  }
}, 5 * 60 * 1000);