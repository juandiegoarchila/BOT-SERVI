// src/handlers/order-handlers.js
import logger from '../utils/logger.js';
import { normalizeTime, generateNotifyMessage} from "../utils/order-utils.js";
import { validateAndMatchField, getSecondaryMessage } from "../utils/conversation-utils.js";
import { VALID_PAYMENTS } from '../config/order-config.js';

// Maneja la selección de la hora de entrega
export function handleOrderingTime(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();

  if (lowercaseMessage === "ayuda") {
    return {
      main: `⏰ Dime a qué hora (11:30 AM - 3:45 PM). Ej: "1", "13:30", "ahora", "para ya"`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  if (["atrás", "atras", "volver"].includes(lowercaseMessage)) {
    conversation.step =
      conversation.remainingCount > 0
        ? "defining_remaining"
        : conversation.lunches.length > 1
        ? "defining_group_drink"
        : "defining_single_lunch_drink";
    return {
      main: `${
        conversation.remainingCount > 0
          ? `✅ ¡Perfecto! Ya definimos ${conversation.lunches.length} almuerzos.  
¿Cómo organizamos los ${conversation.remainingCount} faltantes?`
          : `🥤 ¿Qué bebida quieres?  
1️⃣ Limonada de panela  
2️⃣ Jugo - Natural del día`
      }`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  const time = normalizeTime(lowercaseMessage);
  if (!time) {
    return {
      main: `❌ Hora no válida. Usa algo como "1", "13:30", "ahora", "para ya" (11:30 AM - 3:45 PM).`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  const [hours, minutes] = time.split(":").map(Number);
  const timeInMinutes = hours * 60 + minutes;
  const startTime = 11 * 60 + 30; // 11:30 AM
  const endTime = 15 * 60 + 45; // 3:45 PM

  if (timeInMinutes < startTime || timeInMinutes > endTime) {
    return {
      main: `⏰ Esa hora está fuera de nuestro horario (11:30 AM - 3:45 PM). Por favor, elige otra (ej: "1", "ahora").`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  conversation.deliveryTime = time;
  conversation.step = conversation.orderCount === 1 ? "ordering_address_single" : "ordering_same_address";
  return {
    main: `✅ Hora: ${time}.  
${conversation.orderCount === 1 ? "📍 Dime la dirección con tu nombre (Ej: \"Calle 10 #5-23, para Juan\")." : "📍 ¿Todos los almuerzos van a la misma dirección? (sí/no)"}`,
    secondary: getSecondaryMessage(conversation.step),
  };
}

// Maneja la confirmación de si todos los almuerzos van a la misma dirección
export function handleOrderingSameAddress(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();

  if (lowercaseMessage === "ayuda") {
    return {
      main: `📍 Responde "sí" si todos los ${conversation.orderCount} almuerzos van a la misma dirección, o "no" si son diferentes.`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  if (["atrás", "atras", "volver"].includes(lowercaseMessage)) {
    conversation.step = "ordering_time";
    return {
      main: `⏰ ¿A qué hora quieres tu pedido? (Ej: "1 pm", "ahora")`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  if (["sí", "si"].includes(lowercaseMessage)) {
    conversation.step = "ordering_address_single";
    return {
      main: `📍 Dime la dirección con tu nombre (Ej: "Calle 10 #5-23, para Juan").`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  if (lowercaseMessage === "no") {
    conversation.step = "ordering_address_multiple";
    conversation.currentAddressIndex = 0;
    conversation.addresses = [];
    return {
      main: `📍 Dime la dirección para el almuerzo ${conversation.currentAddressIndex + 1} (Ej: "Calle 10 #5-23, para Juan").`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  return {
    main: `❌ No entendí. Responde "sí" o "no".`,
    secondary: getSecondaryMessage(conversation.step),
  };
}

// Maneja la dirección para un solo pedido o pedidos a la misma dirección
export function handleOrderingAddressSingle(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();

  if (lowercaseMessage === "ayuda") {
    return {
      main: `📍 Escribe la dirección con tu nombre para los ${conversation.orderCount} almuerzos. Ejemplo: "Calle 10 #5-23, para Juan".`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  if (["atrás", "atras", "volver"].includes(lowercaseMessage)) {
    conversation.step = conversation.orderCount > 1 ? "ordering_same_address" : "ordering_time";
    return {
      main: `${
        conversation.orderCount > 1
          ? `📍 ¿Todos los almuerzos van a la misma dirección? (sí/no)`
          : `⏰ ¿A qué hora quieres tu pedido? (Ej: "1 pm", "ahora")`
      }`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  const { isValid, value } = validateAndMatchField("address", message);
  if (!isValid) {
    return {
      main: `❌ No entendí. Dime una dirección válida (Ej: "Calle 10 #5-23, para Juan").`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  conversation.addresses = Array(conversation.orderCount).fill(value);
  conversation.step = "confirming_address_single";
  return {
    main: `📍 Dirección: *${value}*. ¿Está bien? Responde "sí" o "no".`,
    secondary: getSecondaryMessage(conversation.step),
  };
}

// Confirma la dirección única para todos los almuerzos
export function handleConfirmingAddressSingle(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();

  if (lowercaseMessage === "ayuda") {
    return {
      main: `📍 Dirección: *${conversation.addresses[0]}*. ¿Está bien? Responde "sí" o "no".`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  if (["atrás", "atras", "volver"].includes(lowercaseMessage)) {
    conversation.step = "ordering_address_single";
    return {
      main: `📍 Dime la dirección con tu nombre (Ej: "Calle 10 #5-23, para Juan").`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  if (["sí", "si"].includes(lowercaseMessage)) {
    conversation.step = "ordering_payment";
    return {
      main: `✅ ¡Perfecto!  
💳 ¿Cómo pagas? (Efectivo, Nequi, Daviplata)`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  if (lowercaseMessage === "no") {
    conversation.addresses = [];
    conversation.step = "ordering_address_single";
    return {
      main: `📍 Dime otra vez la dirección (Ej: "Calle 10 #5-23, para Juan").`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  return {
    main: `❌ No entendí. Responde "sí" o "no".`,
    secondary: getSecondaryMessage(conversation.step),
  };
}

// Maneja múltiples direcciones para los almuerzos
export function handleOrderingAddressMultiple(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();

  if (lowercaseMessage === "ayuda") {
    return {
      main: `📍 Escribe la dirección para el almuerzo ${conversation.currentAddressIndex + 1}. Ejemplo: "Calle 10 #5-23, para Juan".`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  if (["atrás", "atras", "volver"].includes(lowercaseMessage)) {
    if (conversation.currentAddressIndex > 0) {
      conversation.currentAddressIndex--;
      return {
        main: `📍 Dime la dirección para el almuerzo ${conversation.currentAddressIndex + 1} o es la misma que la del almuerzo ${conversation.currentAddressIndex}?  
1. Sí  
2. No`,
        secondary: getSecondaryMessage(conversation.step),
      };
    }
    conversation.step = "ordering_same_address";
    conversation.addresses = [];
    return {
      main: `📍 ¿Todos los almuerzos van a la misma dirección? (sí/no)`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  if (conversation.currentAddressIndex > 0 && ["1", "sí", "si"].includes(lowercaseMessage)) {
    conversation.addresses[conversation.currentAddressIndex] =
      conversation.addresses[conversation.currentAddressIndex - 1];
    conversation.currentAddressIndex++;
    if (conversation.currentAddressIndex < conversation.orderCount) {
      return {
        main: `📍 Dime la dirección para el almuerzo ${conversation.currentAddressIndex + 1} o es la misma que la del almuerzo ${conversation.currentAddressIndex}?  
1. Sí  
2. No`,
        secondary: getSecondaryMessage(conversation.step),
      };
    }
    conversation.step = "ordering_payment";
    return {
      main: `✅ ¡Perfecto!  
💳 ¿Cómo pagas? (Efectivo, Nequi, Daviplata)`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  if (conversation.currentAddressIndex > 0 && ["2", "no"].includes(lowercaseMessage)) {
    return {
      main: `📍 Dime la dirección para el almuerzo ${conversation.currentAddressIndex + 1} (Ej: "Calle 10 #5-23, para Juan").`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  const { isValid, value } = validateAndMatchField("address", message);
  if (!isValid) {
    return {
      main: `❌ No entendí. Dime una dirección válida (Ej: "Calle 10 #5-23, para Juan").`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  conversation.addresses[conversation.currentAddressIndex] = value;
  conversation.currentAddressIndex++;

  if (conversation.currentAddressIndex < conversation.orderCount) {
    return {
      main: `📍 Dime la dirección para el almuerzo ${conversation.currentAddressIndex + 1} o es la misma que la del almuerzo ${conversation.currentAddressIndex}?  
1. Sí  
2. No`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  conversation.step = "ordering_payment";
  return {
    main: `✅ ¡Perfecto!  
💳 ¿Cómo pagas? (Efectivo, Nequi, Daviplata)`,
    secondary: getSecondaryMessage(conversation.step),
  };
}

// Maneja la selección del método de pago
export function handleOrderingPayment(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();

  if (lowercaseMessage === "ayuda") {
    return {
      main: `💳 Elige cómo pagas: Efectivo, Nequi o Daviplata. Ejemplo: "Efectivo".`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  if (["atrás", "atras", "volver"].includes(lowercaseMessage)) {
    conversation.step = conversation.orderCount > 1 ? "ordering_address_multiple" : "confirming_address_single";
    if (conversation.orderCount > 1 && conversation.currentAddressIndex > 0) {
      conversation.currentAddressIndex--;
    }
    return {
      main: `${
        conversation.orderCount > 1
          ? `📍 Dime la dirección para el almuerzo ${conversation.currentAddressIndex + 1}`
          : `📍 Dirección: *${conversation.addresses[0]}*. ¿Está bien? (sí/no)`
      }`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  // Usar VALID_PAYMENTS directamente para la validación
  if (!VALID_PAYMENTS.includes(lowercaseMessage)) {
    return {
      main: `❌ No entendí. Elige: Efectivo, Nequi o Daviplata.`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  conversation.paymentMethod = lowercaseMessage;
  conversation.step = "ordering_cutlery";
  return {
    main: `✅ ¡Perfecto!  
🍴 ¿Quieres cubiertos? (sí/no)`,
    secondary: getSecondaryMessage(conversation.step),
  };
}

// Maneja la elección de cubiertos
export function handleOrderingCutlery(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();

  if (lowercaseMessage === "ayuda") {
    return {
      main: `🍴 Responde "sí" si quieres cubiertos, o "no" si no los necesitas.`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  if (["atrás", "atras", "volver"].includes(lowercaseMessage)) {
    conversation.step = "ordering_payment";
    return {
      main: `💳 ¿Cómo pagas? (Efectivo, Nequi, Daviplata)`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  if (["sí", "si"].includes(lowercaseMessage)) {
    conversation.cutlery = true;
  } else if (lowercaseMessage === "no") {
    conversation.cutlery = false;
  } else {
    return {
      main: `❌ No entendí. Responde "sí" o "no".`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  conversation.step = "preview_order";
  return {
    main: `✅ ¡Listo! Aquí está tu pedido:\n${generateOrderSummary(conversation)}\n✅ ¿Todo bien?\n1️⃣ Sí, confirmar pedido.\n2️⃣ No, quiero cambiar algo.`,
    secondary: getSecondaryMessage(conversation.step),
  };
}

// Maneja la vista previa y confirmación del pedido
export function handlePreviewOrder(conversation, message, client) {
  const lowercaseMessage = message.toLowerCase().trim();

  if (lowercaseMessage === "1" || lowercaseMessage === "sí" || lowercaseMessage === "si") {
    conversation.step = "awaiting_feedback";

    const basePrice = conversation.lunches.some(lunch => lunch.soup === "solo bandeja") ? 12000 : 13000;
    const extraProteinCost = conversation.lunches.reduce((sum, lunch) => sum + (lunch.extraProtein ? 5000 : 0), 0);
    const totalCost = (conversation.lunches.length * basePrice) + extraProteinCost;

    const confirmationMessage = `📝 CONFIRMACIÓN:  
✅ Pedido confirmado  
⏱️ Entrega: 20-35 minutos  
💳 Pago: ${conversation.paymentMethod || "efectivo"}  
💰 Total: $${totalCost.toLocaleString()}  
😊 ¡Gracias! ¿Cómo fue tu experiencia? (1. Excelente, 2. Buena, 3. Regular, 4. Mala)`;

    const notifyMessage = generateNotifyMessage(conversation, totalCost);
    try {
      if (client) {
        client.sendMessage("573142749518@c.us", notifyMessage);
        logger.info("Notificación enviada al administrador:", notifyMessage); // Usamos logger en lugar de console.log
      } else {
        logger.error("Client no definido en handlePreviewOrder");
      }
    } catch (error) {
      logger.error("Error enviando notificación al administrador:", error);
    }

    return { main: confirmationMessage, secondary: "" };
  }

  if (lowercaseMessage === "2" || lowercaseMessage === "no") {
    conversation.adjustingLunchIndex = 0;
    conversation.step = conversation.orderCount > 1 ? "selecting_lunch_to_adjust" : "selecting_adjustment";
    return conversation.orderCount > 1
      ? { main: `🍽️ Dime el número del almuerzo a ajustar (1-${conversation.orderCount}).`, secondary: getSecondaryMessage() }
      : {
          main: `🍽️ Almuerzo ${conversation.adjustingLunchIndex + 1}. ¿Qué quieres cambiar?  
1️⃣ Sopa  
2️⃣ Principio  
3️⃣ Proteína  
4️⃣ Bebida  
5️⃣ Dirección  
6️⃣ Hora  
7️⃣ Pago  
8️⃣ Proteína adicional (cambiarla o quitarla)\n🌟 Usa 'Atrás' para regresar al resumen.`,
          secondary: getSecondaryMessage(),
        };
  }

  return {
    main: `❌ No entendí. Responde:\n1️⃣ Sí, confirmar pedido.\n2️⃣ No, quiero cambiar algo.`,
    secondary: getSecondaryMessage(),
  };
}

// Maneja la selección de ajustes
export function handleSelectingAdjustment(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();

  if (lowercaseMessage === "ayuda") {
    return {
      main: `🍽️ Almuerzo ${conversation.adjustingLunchIndex + 1}. ¿Qué quieres cambiar?  
1️⃣ Sopa  
2️⃣ Principio  
3️⃣ Proteína  
4️⃣ Bebida  
5️⃣ Dirección  
6️⃣ Hora  
7️⃣ Pago  
8️⃣ Proteína adicional (cambiarla o quitarla)`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  if (["atrás", "atras", "volver"].includes(lowercaseMessage)) {
    conversation.step = "preview_order";
    conversation.previewShown = false;
    return {
      main: `✅ ¡Listo! Aquí está tu pedido:\n${generateOrderSummary(conversation)}\n✅ ¿Todo bien?\n1️⃣ Sí, confirmar pedido.\n2️⃣ No, quiero cambiar algo.`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  const num = parseInt(lowercaseMessage);
  if (!isNaN(num) && num >= 1 && num <= 8) {
    switch (num) {
      case 1: // Sopa
        conversation.step = "adjusting_soup";
        return {
          main: `🥣 ¿Qué quieres de sopa?  
1️⃣ Sancocho de pescado  
2️⃣ Sopa del día  
3️⃣ Huevo - frito  
4️⃣ Papa a la francesa  
5️⃣ Solo bandeja ($12.000)`,
          secondary: getSecondaryMessage(conversation.step),
        };
      case 2: // Principio
        conversation.step = "adjusting_principle";
        return {
          main: `🥗 ¿Qué principio quieres? (Ej: "frijol" o "sin principio")`,
          secondary: getSecondaryMessage(conversation.step),
        };
      case 3: // Proteína
        conversation.step = "adjusting_protein";
        return {
          main: `🍗 ¿Qué proteína quieres? (Ej: "res" o "ninguna")`,
          secondary: getSecondaryMessage(conversation.step),
        };
      case 4: // Bebida
        conversation.step = "adjusting_drink";
        return {
          main: `🥤 ¿Qué bebida quieres?  
1️⃣ Limonada de panela  
2️⃣ Jugo - Natural del día`,
          secondary: getSecondaryMessage(conversation.step),
        };
      case 5: // Dirección
        conversation.step = "adjusting_address";
        return {
          main: `📍 Dime la nueva dirección (Ej: "Calle 10 #5-23, para Juan")`,
          secondary: getSecondaryMessage(conversation.step),
        };
      case 6: // Hora
        conversation.step = "adjusting_time";
        return {
          main: `⏰ ¿A qué hora quieres tu pedido? (Ej: "1 pm", "ahora")`,
          secondary: getSecondaryMessage(conversation.step),
        };
      case 7: // Pago
        conversation.step = "adjusting_payment";
        return {
          main: `💳 ¿Cómo vas a pagar? (Efectivo, Nequi, Daviplata)`,
          secondary: getSecondaryMessage(conversation.step),
        };
      case 8: // Proteína adicional
        conversation.step = "adjusting_extra_protein";
        return {
          main: `🍗 ¿Qué quieres hacer con la proteína adicional?  
1️⃣ Cambiarla (Ej: "res")  
2️⃣ Cancelarla`,
          secondary: getSecondaryMessage(conversation.step),
        };
    }
  }

  return {
    main: `❌ No entendí. Usa un número del 1 al 8.  
🍽️ Almuerzo ${conversation.adjustingLunchIndex + 1}. ¿Qué quieres cambiar?  
1️⃣ Sopa  
2️⃣ Principio  
3️⃣ Proteína  
4️⃣ Bebida  
5️⃣ Dirección  
6️⃣ Hora  
7️⃣ Pago  
8️⃣ Proteína adicional (cambiarla o quitarla)`,
    secondary: getSecondaryMessage(conversation.step),
  };
}
export function handleAdjustingPayment(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();

  if (["atrás", "atras", "volver"].includes(lowercaseMessage)) {
    conversation.step = "selecting_adjustment";
    return {
      main: `🍽️ Almuerzo ${conversation.adjustingLunchIndex + 1}. ¿Qué quieres cambiar?  
1️⃣ Sopa  
2️⃣ Principio  
3️⃣ Proteína  
4️⃣ Bebida  
5️⃣ Dirección  
6️⃣ Hora  
7️⃣ Pago  
8️⃣ Proteína adicional (cambiarla o quitarla)`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  if (!VALID_PAYMENTS.includes(lowercaseMessage)) {
    return {
      main: `❌ No entendí. Elige: Efectivo, Nequi o Daviplata`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  conversation.paymentMethod = lowercaseMessage;
  conversation.step = "preview_order";
  conversation.previewShown = false;
  return {
    main: `✅ ¡Listo! Aquí está tu pedido:\n${generateOrderSummary(conversation)}\n✅ ¿Todo bien?\n1️⃣ Sí, confirmar pedido.\n2️⃣ No, quiero cambiar algo.`,
    secondary: getSecondaryMessage(conversation.step),
  };
}
// Maneja el ajuste de la sopa
export function handleAdjustingSoup(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();

  if (["atrás", "atras", "volver"].includes(lowercaseMessage)) {
    conversation.step = "selecting_adjustment";
    return {
      main: `🍽️ Almuerzo ${conversation.adjustingLunchIndex + 1}. ¿Qué quieres cambiar?  
1️⃣ Sopa  
2️⃣ Principio  
3️⃣ Proteína  
4️⃣ Bebida  
5️⃣ Dirección  
6️⃣ Hora  
7️⃣ Pago  
8️⃣ Proteína adicional (cambiarla o quitarla)`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  const { isValid, value } = validateAndMatchField("soup", message);
  if (isValid) {
    conversation.lunches[conversation.adjustingLunchIndex].soup = value;
    conversation.step = "preview_order";
    conversation.previewShown = false;
    return {
      main: `✅ ¡Listo! Aquí está tu pedido:\n${generateOrderSummary(conversation)}\n✅ ¿Todo bien?\n1️⃣ Sí, confirmar pedido.\n2️⃣ No, quiero cambiar algo.`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  return {
    main: `❌ No entendí. Usa "sancocho", "sopa", o:  
1️⃣ Huevo - frito  
2️⃣ Papa a la francesa  
3️⃣ Solo bandeja ($12.000)`,
    secondary: getSecondaryMessage(conversation.step),
  };
}

// Maneja el ajuste de la proteína
export function handleAdjustingProtein(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();

  if (["atrás", "atras", "volver"].includes(lowercaseMessage)) {
    conversation.step = "selecting_adjustment";
    return {
      main: `🍽️ Almuerzo ${conversation.adjustingLunchIndex + 1}. ¿Qué quieres cambiar?  
1️⃣ Sopa  
2️⃣ Principio  
3️⃣ Proteína  
4️⃣ Bebida  
5️⃣ Dirección  
6️⃣ Hora  
7️⃣ Pago  
8️⃣ Proteína adicional (cambiarla o quitarla)`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  const { isValid, value } = validateAndMatchField("protein", message);
  if (isValid) {
    conversation.lunches[conversation.adjustingLunchIndex].protein = value;
    conversation.step = "preview_order";
    conversation.previewShown = false;
    return {
      main: `✅ ¡Listo! Aquí está tu pedido:\n${generateOrderSummary(conversation)}\n✅ ¿Todo bien?\n1️⃣ Sí, confirmar pedido.\n2️⃣ No, quiero cambiar algo.`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  return {
    main: `❌ No entendí. Dime una proteína (ej: "res", "pechuga asada", "ninguna")`,
    secondary: getSecondaryMessage(conversation.step),
  };
}

// Maneja el ajuste del tiempo
export function handleAdjustingTime(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();

  if (["atrás", "atras", "volver"].includes(lowercaseMessage)) {
    conversation.step = "selecting_adjustment";
    return {
      main: `🍽️ Almuerzo ${conversation.adjustingLunchIndex + 1}. ¿Qué quieres cambiar?  
1️⃣ Sopa  
2️⃣ Principio  
3️⃣ Proteína  
4️⃣ Bebida  
5️⃣ Dirección  
6️⃣ Hora  
7️⃣ Pago  
8️⃣ Proteína adicional (cambiarla o quitarla)`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  const time = normalizeTime(lowercaseMessage);
  if (!time) {
    return {
      main: `❌ Hora no válida. Usa algo como "1", "13:30", "ahora" (11:30 AM - 3:45 PM).`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  const [hours, minutes] = time.split(":").map(Number);
  const timeInMinutes = hours * 60 + minutes;
  const startTime = 11 * 60 + 30; // 11:30 AM
  const endTime = 15 * 60 + 45; // 3:45 PM

  if (timeInMinutes < startTime || timeInMinutes > endTime) {
    return {
      main: `⏰ Esa hora está fuera de nuestro horario (11:30 AM - 3:45 PM). Elige otra (ej: "1", "ahora").`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  conversation.deliveryTime = time;
  conversation.step = "preview_order";
  conversation.previewShown = false; // Reseteamos para que el resumen se muestre fresco
  return {
    main: `✅ ¡Listo! Aquí está tu pedido:\n${generateOrderSummary(conversation)}\n✅ ¿Todo bien?\n1️⃣ Sí, confirmar pedido.\n2️⃣ No, quiero cambiar algo.`,
    secondary: getSecondaryMessage(conversation.step),
  };
}

// Maneja el ajuste de la bebida
export function handleAdjustingDrink(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();

  if (lowercaseMessage === "ayuda") {
    return {
      main: `🥤 ¿Qué bebida quieres?  
1️⃣ Limonada de panela  
2️⃣ Jugo - Natural del día`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  if (["atrás", "atras", "volver"].includes(lowercaseMessage)) {
    conversation.step = "selecting_adjustment";
    return {
      main: `🍽️ Almuerzo ${conversation.adjustingLunchIndex + 1}. ¿Qué quieres cambiar?  
1️⃣ Sopa  
2️⃣ Principio  
3️⃣ Proteína  
4️⃣ Bebida  
5️⃣ Dirección  
6️⃣ Hora  
7️⃣ Pago  
8️⃣ Proteína adicional (cambiarla o quitarla)`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  const { isValid, value } = validateAndMatchField("drink", message);
  if (isValid) {
    conversation.lunches[conversation.adjustingLunchIndex].drink = value;
    conversation.step = "preview_order";
    conversation.previewShown = false;
    return {
      main: `✅ ¡Listo! Aquí está tu pedido:\n${generateOrderSummary(conversation)}\n✅ ¿Todo bien?\n1️⃣ Sí, confirmar pedido.\n2️⃣ No, quiero cambiar algo.`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  return {
    main: `❌ No entendí. Elige:  
1️⃣ Limonada de panela  
2️⃣ Jugo - Natural del día`,
    secondary: getSecondaryMessage(conversation.step),
  };
}

// Maneja el ajuste del principio
export function handleAdjustingPrinciple(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();

  if (["atrás", "atras", "volver"].includes(lowercaseMessage)) {
    conversation.step = "selecting_adjustment";
    return {
      main: `🍽️ Almuerzo ${conversation.adjustingLunchIndex + 1}. ¿Qué quieres cambiar?  
1️⃣ Sopa  
2️⃣ Principio  
3️⃣ Proteína  
4️⃣ Bebida  
5️⃣ Dirección  
6️⃣ Hora  
7️⃣ Pago  
8️⃣ Proteína adicional (cambiarla o quitarla)`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  if (lowercaseMessage === "sin principio" || lowercaseMessage === "ninguno") {
    conversation.lunches[conversation.adjustingLunchIndex].principle = "ninguno";
    conversation.step = "adjusting_principle_replacement";
    return {
      main: `✅ Sin principio. ¿Qué prefieres de reemplazo?  
1️⃣ Huevo frito  
2️⃣ Papa a la francesa  
3️⃣ Doble porción de arroz  
4️⃣ Más ensalada`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  const { isValid, value } = validateAndMatchField("principle", message);
  if (isValid) {
    conversation.lunches[conversation.adjustingLunchIndex].principle = value;
    conversation.lunches[conversation.adjustingLunchIndex].principleReplacement = null;
    conversation.step = "preview_order";
    conversation.previewShown = false;
    return {
      main: `✅ ¡Listo! Aquí está tu pedido:\n${generateOrderSummary(conversation)}\n✅ ¿Todo bien?\n1️⃣ Sí, confirmar pedido.\n2️⃣ No, quiero cambiar algo.`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  return {
    main: `❌ No entendí. Dime un principio (ej: "frijol") o "sin principio".`,
    secondary: getSecondaryMessage(conversation.step),
  };
}

// Maneja el reemplazo del principio
export function handleAdjustingPrincipleReplacement(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();

  if (["atrás", "atras", "volver"].includes(lowercaseMessage)) {
    conversation.step = "adjusting_principle";
    return {
      main: `🥗 ¿Qué principio quieres? (Ej: "frijol" o "sin principio")`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  const { isValid, value } = validateAndMatchField("principleReplacement", message);
  if (isValid) {
    conversation.lunches[conversation.adjustingLunchIndex].principleReplacement = value;
    conversation.step = "preview_order";
    conversation.previewShown = false; // Resetear para que el resumen se muestre fresco
    return {
      main: `✅ ¡Listo! Aquí está tu pedido:\n${generateOrderSummary(conversation)}\n✅ ¿Todo bien?\n1️⃣ Sí, confirmar pedido.\n2️⃣ No, quiero cambiar algo.`,
      secondary: getSecondaryMessage(conversation.step),
    };
  }

  return {
    main: `❌ No entendí. Elige:  
1️⃣ Huevo frito  
2️⃣ Papa a la francesa  
3️⃣ Doble porción de arroz  
4️⃣ Más ensalada`,
    secondary: getSecondaryMessage(conversation.step),
  };
}

// Maneja el estado final del pedido y feedback
export function handleAwaitingFeedback(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();

  if (["1", "2", "3", "4"].includes(lowercaseMessage)) {
    const ratings = {
      "1": "Excelente",
      "2": "Buena",
      "3": "Regular",
      "4": "Mala"
    };
    const rating = ratings[lowercaseMessage];
    return {
      reply: `😊 ¡Gracias por tu pedido y por calificarnos con ${rating}! Esperamos que disfrutes tu comida. Si necesitas algo más, solo escribe "hola".`,
      clearConversation: true // Limpia la conversación para terminar el flujo
    };
  }

  return {
    main: `❌ Por favor, califica tu experiencia: 1️⃣ Excelente, 2️⃣ Buena, 3️⃣ Regular, 4️⃣ Mala`,
    secondary: "" // Sin opciones adicionales
  };
}

// Formatea la hora en formato de 24 horas a 12 horas con AM/PM
function formatTime(time) {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const formattedHours = hours % 12 || 12;
  return `${formattedHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

// Genera el resumen del pedido para el cliente
function generateOrderSummary(conversation) {
  let summary = `🍽️ ${conversation.lunches.length} almuerzo${conversation.lunches.length > 1 ? "s" : ""}:\n\n`;

  const groupedLunches = {};
  conversation.lunches.forEach((lunch, index) => {
    const key = `${lunch.soup || "sin sopa"}|${lunch.principle || "ninguno"}|${
      lunch.principleReplacement || ""
    }|${lunch.protein || "ninguna"}|${
      lunch.extraProtein ? lunch.extraProteinType : "sin extra"
    }|${lunch.drink || "sin bebida"}|${lunch.salad}|${lunch.rice}`;
    if (!groupedLunches[key]) {
      groupedLunches[key] = {
        details: lunch,
        count: 0,
        addresses: [],
      };
    }
    groupedLunches[key].count++;
    groupedLunches[key].addresses.push(conversation.addresses[index]);
  });

  Object.values(groupedLunches).forEach((group) => {
    const lunch = group.details;
    const soupDisplay =
      lunch.soup === "sopa" || lunch.soup === "sopa del día"
        ? "Sopa del día"
        : lunch.soup || "Sin sopa";
    const customization = `${lunch.salad ? "Con ensalada" : "Sin ensalada"}, ${
      lunch.rice ? "con arroz" : "sin arroz"
    }`;

    if (group.count > 1) {
      summary += `(${group.count}) Almuerzos iguales:\n`;
    } else {
      summary += `(1) Almuerzo:\n`;
    }

    summary += `🥣 Sopa: ${soupDisplay}\n`;
    summary += `🥗 Principio: ${
      lunch.principle === "ninguno" && lunch.principleReplacement
        ? lunch.principleReplacement
        : lunch.principle || "Ninguno"
    }\n`;
    summary += `🍗 Proteína: ${lunch.protein || "Ninguna"}${
      lunch.extraProtein
        ? ` + ${lunch.extraProteinType} ${
            lunch.extraProteinType === "mojarra" ? "(sin costo adicional)" : "($5,000)"
          }`
        : ""
    }\n`;
    summary += `🥤 Bebida: ${lunch.drink || "sin bebida"}\n`;

    const uniqueAddresses = [...new Set(group.addresses)];
    uniqueAddresses.forEach((address) => {
      summary += `📍 Dirección: ${address}\n`;
    });
    summary += `🥗🍚 Personalización: ${customization}\n\n`;
  });

  summary += `📞 Teléfono: ${conversation.phone.replace("@c.us", "")}\n`;
  summary += `⏰ Hora: ${formatTime(conversation.deliveryTime)}\n`;
  summary += `💳 Pago: ${conversation.paymentMethod}\n`;
  const totalCost = calculateTotalCost(conversation);
  summary +=
    conversation.paymentMethod.toLowerCase() === "efectivo"
      ? `💵 Por favor, ten el efectivo listo. Si no tienes, envía $${totalCost.toLocaleString()} al 3138505647 (Nequi o Daviplata) y comparte el comprobante.\n`
      : `📲 Envía $${totalCost.toLocaleString()} al 3138505647 (${conversation.paymentMethod}) y comparte el comprobante.\n`;
  summary += `🍴 Cubiertos: ${conversation.cutlery ? "Sí" : "No"}\n`;
  summary += `💰 Total: $${totalCost.toLocaleString()}`;

  return summary;
}

// Calcula el costo total del pedido
function calculateTotalCost(conversation) {
  return conversation.lunches.reduce((sum, lunch) => {
    let baseCost = lunch.soup === "solo bandeja" ? 12000 : 13000;
    if (lunch.protein === "mojarra") baseCost = 15000;
    if (lunch.extraProtein && lunch.extraProteinType !== "mojarra") baseCost += 5000;
    return sum + baseCost;
  }, 0);
}



