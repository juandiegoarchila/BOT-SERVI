// src/handlers/order-handlers.js
import { normalizeTime } from "../utils/order-utils.js";
import { validateAndMatchField, getSecondaryMessage } from "../utils/conversation-utils.js";
import { processOrder } from "../services/order.service.js";

export function handleOrderingTime(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `⏰ Dime a qué hora (11:30 AM - 3:45 PM). Ej: "1 pm", "13h30", "ahora"`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = conversation.remainingCount > 0 ? "defining_remaining" : conversation.lunches.length > 1 ? "defining_group_drink" : "defining_single_lunch_drink";
    return {
      main: `${conversation.remainingCount > 0 ? `✅ ¡Perfecto! Ya definimos ${conversation.lunches.length} almuerzos.  
¿Cómo organizamos los ${conversation.remainingCount} faltantes?` : `🥤 ¿Qué bebida quieres?  
1. Limonada de panela  
2. Jugo - Natural del día`}`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  const time = normalizeTime(message);
  if (time) {
    const [hours, minutes] = time.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;
    const startTime = 11 * 60 + 30; // 11:30 AM
    const endTime = 15 * 60 + 45;   // 3:45 PM
    if (timeInMinutes < startTime || timeInMinutes > endTime) {
      return {
        main: `⏰ Esa hora está fuera de nuestro horario (11:30 AM - 3:45 PM). Por favor, elige otra (ej: "1 pm", "ahora").`,
        secondary: getSecondaryMessage(conversation.step)
      };
    }
    conversation.deliveryTime = time;
    if (conversation.orderCount === 1) {
      conversation.step = "ordering_address_single";
      return {
        main: `✅ Hora: ${time}.  
📍 Dime la dirección con tu nombre (Ej: "Calle 10 #5-23, para Juan").`,
        secondary: getSecondaryMessage(conversation.step)
      };
    }
    conversation.step = "ordering_same_address";
    return {
      main: `✅ Hora: ${time}.  
📍 ¿Todos los almuerzos van a la misma dirección? (sí/no)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ Hora no válida. Usa algo como "1 pm", "13h30" o "ahora" (11:30 AM - 3:45 PM).`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleOrderingSameAddress(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `📍 Responde "sí" si todos los ${conversation.orderCount} almuerzos van a la misma dirección, o "no" si son diferentes.`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "ordering_time";
    return {
      main: `⏰ ¿A qué hora quieres tu pedido? (Ej: "1 pm", "ahora")`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "sí" || lowercaseMessage === "si") {
    conversation.step = "ordering_address_single";
    return {
      main: `📍 Dime la dirección con tu nombre (Ej: "Calle 10 #5-23, para Juan").`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "no") {
    conversation.step = "ordering_address_multiple";
    conversation.currentAddressIndex = 0;
    conversation.addresses = [];
    return {
      main: `📍 Dime la dirección para el almuerzo ${conversation.currentAddressIndex + 1} (Ej: "Calle 10 #5-23, para Juan").`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Responde "sí" o "no".`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleOrderingAddressSingle(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `📍 Escribe la dirección con tu nombre para los ${conversation.orderCount} almuerzos. Ejemplo: "Calle 10 #5-23, para Juan".`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = conversation.orderCount > 1 ? "ordering_same_address" : "ordering_time";
    return {
      main: `${conversation.orderCount > 1 ? `📍 ¿Todos los almuerzos van a la misma dirección? (sí/no)` : `⏰ ¿A qué hora quieres tu pedido? (Ej: "1 pm", "ahora")`}`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  const { isValid, value } = validateAndMatchField("address", message);
  if (isValid) {
    conversation.addresses = Array(conversation.orderCount).fill(value);
    conversation.step = "confirming_address_single";
    return {
      main: `📍 Dirección: *${value}*. ¿Está bien? Responde "sí" o "no".`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Dime una dirección válida (Ej: "Calle 10 #5-23, para Juan").`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleConfirmingAddressSingle(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `📍 Dirección: *${conversation.addresses[0]}*. ¿Está bien? Responde "sí" o "no".`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "ordering_address_single";
    return {
      main: `📍 Dime la dirección con tu nombre (Ej: "Calle 10 #5-23, para Juan").`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "sí" || lowercaseMessage === "si") {
    conversation.step = "ordering_payment";
    return {
      main: `✅ ¡Perfecto!  
💳 ¿Cómo pagas? (Efectivo, Nequi, Daviplata)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "no") {
    conversation.addresses = [];
    conversation.step = "ordering_address_single";
    return {
      main: `📍 Dime otra vez la dirección (Ej: "Calle 10 #5-23, para Juan").`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Responde "sí" o "no".`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleOrderingAddressMultiple(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `📍 Escribe la dirección para el almuerzo ${conversation.currentAddressIndex + 1}. Ejemplo: "Calle 10 #5-23, para Juan".`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    if (conversation.currentAddressIndex > 0) {
      conversation.currentAddressIndex--;
      return {
        main: `📍 Dime la dirección para el almuerzo ${conversation.currentAddressIndex + 1} o es la misma que la del almuerzo ${conversation.currentAddressIndex}?  
1. Sí  
2. No`,
        secondary: getSecondaryMessage(conversation.step)
      };
    }
    conversation.step = "ordering_same_address";
    conversation.addresses = [];
    return {
      main: `📍 ¿Todos los almuerzos van a la misma dirección? (sí/no)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (conversation.currentAddressIndex > 0 && (lowercaseMessage === "1" || lowercaseMessage === "sí" || lowercaseMessage === "si")) {
    conversation.addresses[conversation.currentAddressIndex] = conversation.addresses[conversation.currentAddressIndex - 1];
    conversation.currentAddressIndex++;
    if (conversation.currentAddressIndex < conversation.orderCount) {
      return {
        main: `📍 Dime la dirección para el almuerzo ${conversation.currentAddressIndex + 1} o es la misma que la del almuerzo ${conversation.currentAddressIndex}?  
1. Sí  
2. No`,
        secondary: getSecondaryMessage(conversation.step)
      };
    }
    conversation.step = "ordering_payment";
    return {
      main: `✅ ¡Perfecto!  
💳 ¿Cómo pagas? (Efectivo, Nequi, Daviplata)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (conversation.currentAddressIndex > 0 && (lowercaseMessage === "2" || lowercaseMessage === "no")) {
    return {
      main: `📍 Dime la dirección para el almuerzo ${conversation.currentAddressIndex + 1} (Ej: "Calle 10 #5-23, para Juan").`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  const { isValid, value } = validateAndMatchField("address", message);
  if (isValid) {
    conversation.addresses[conversation.currentAddressIndex] = value;
    conversation.currentAddressIndex++;
    if (conversation.currentAddressIndex < conversation.orderCount) {
      return {
        main: `📍 Dime la dirección para el almuerzo ${conversation.currentAddressIndex + 1} o es la misma que la del almuerzo ${conversation.currentAddressIndex}?  
1. Sí  
2. No`,
        secondary: getSecondaryMessage(conversation.step)
      };
    }
    conversation.step = "ordering_payment";
    return {
      main: `✅ ¡Perfecto!  
💳 ¿Cómo pagas? (Efectivo, Nequi, Daviplata)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Dime una dirección válida (Ej: "Calle 10 #5-23, para Juan").`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleOrderingPayment(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `💳 Elige cómo pagas: Efectivo, Nequi o Daviplata. Ejemplo: "Efectivo".`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = conversation.orderCount > 1 ? "ordering_address_multiple" : "confirming_address_single";
    if (conversation.orderCount > 1 && conversation.currentAddressIndex > 0) conversation.currentAddressIndex--;
    return {
      main: `${conversation.orderCount > 1 ? `📍 Dime la dirección para el almuerzo ${conversation.currentAddressIndex + 1}` : `📍 Dirección: *${conversation.addresses[0]}*. ¿Está bien? (sí/no)`}`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  const { isValid, value } = validateAndMatchField("payment", message);
  if (isValid) {
    conversation.paymentMethod = value;
    conversation.step = "ordering_cutlery";
    return {
      main: `✅ ¡Perfecto!  
🍴 ¿Quieres cubiertos? (sí/no)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Elige: Efectivo, Nequi o Daviplata.`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleOrderingCutlery(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `🍴 Responde "sí" si quieres cubiertos, o "no" si no los necesitas.`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "ordering_payment";
    return {
      main: `💳 ¿Cómo pagas? (Efectivo, Nequi, Daviplata)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "sí" || lowercaseMessage === "si") {
    conversation.cutlery = true;
    conversation.step = "preview_order";
    return {
      main: `✅ ¡Listo! Aquí está tu pedido:  
${generateOrderSummary(conversation)}  
¿Todo está bien? (sí/no)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "no") {
    conversation.cutlery = false;
    conversation.step = "preview_order";
    return {
      main: `✅ ¡Listo! Aquí está tu pedido:  
${generateOrderSummary(conversation)}  
¿Todo está bien? (sí/no)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Responde "sí" o "no".`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handlePreviewOrder(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `✅ Revisa tu pedido arriba. Responde "sí" para confirmar, o "no" para ajustar.`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "ordering_cutlery";
    return {
      main: `✅ ¡Perfecto!  
🍴 ¿Quieres cubiertos? (sí/no)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "sí" || lowercaseMessage === "si") {
    conversation.step = "completed";
    const totalCost = conversation.lunches.reduce((sum, lunch) => {
      let baseCost = (lunch.soup === "solo bandeja" || lunch.soup === "sin sopa") ? 12000 : 13000;
      if (lunch.extraProtein && lunch.extraProteinType !== "mojarra") baseCost += 5000; // Mojarra adicional no cuenta
      return sum + baseCost;
    }, 0);
    conversation.lastOrder = conversation.lunches.map((l) => `${l.soup}, ${l.principle || "ninguno"}, ${l.protein || "ninguna"}${l.extraProtein ? ` + ${l.extraProteinType}` : ""}, ${l.drink}`).join("; ");
    conversation.lastOrderLunches = [...conversation.lunches];

    let notifyMessage = `📝 *Nuevo pedido*\n`;
    notifyMessage += `👤 Cliente: ${conversation.phone.replace('@c.us', '')}\n`;
    notifyMessage += `🍽️ ${conversation.lunches.length} almuerzos:\n\n`;

    const groupedLunches = {};
    conversation.lunches.forEach((lunch, index) => {
      const key = `${lunch.soup}|${lunch.principle || "ninguno"}|${lunch.protein || "ninguna"}|${lunch.extraProtein ? lunch.extraProteinType : "none"}|${lunch.drink}|${conversation.addresses[index]}|${lunch.salad}|${lunch.rice}`;
      if (!groupedLunches[key]) {
        groupedLunches[key] = { count: 0, details: lunch, address: conversation.addresses[index] };
      }
      groupedLunches[key].count++;
    });

    Object.values(groupedLunches).forEach((group) => {
      if (group.count > 1) {
        notifyMessage += `(${group.count}) Almuerzos iguales:\n`;
      } else {
        notifyMessage += `(1) Almuerzo:\n`;
      }
      const soupDisplay = group.details.soup === "sopa" || group.details.soup === "sopa del día" ? "sopa" : group.details.soup;
      notifyMessage += `🥣 Sopa: ${soupDisplay}\n`;
      notifyMessage += `🥗 Principio: ${group.details.principle || "ninguno"}\n`;
      notifyMessage += `🍗 Proteína: ${group.details.protein || "ninguna"}${group.details.extraProtein ? ` + ${group.details.extraProteinType} (${group.details.extraProteinType === "mojarra" ? "sin costo" : "$5,000"})` : ""}\n`;
      notifyMessage += `🥤 Bebida: ${group.details.drink}\n`;
      notifyMessage += `📍 Dirección: ${group.address}\n`;
      notifyMessage += `🥗🍚 Personalización: ${group.details.salad ? "Con ensalada" : "Sin ensalada"}, ${group.details.rice ? "con arroz" : "sin arroz"}\n`;
      notifyMessage += `\n`;
    });

    notifyMessage += `⏰ Hora: ${conversation.deliveryTime}\n`;
    notifyMessage += `💳 Pago: ${conversation.paymentMethod}\n`;
    notifyMessage += `🍴 Cubiertos: ${conversation.cutlery ? "Sí" : "No"}\n`;
    notifyMessage += `💰 Total: $${totalCost.toLocaleString()}`;

    return {
      reply: `📝 *CONFIRMACIÓN:*  
✅ Pedido confirmado  
⏱️ Entrega: 20-35 minutos  
💳 Pago: ${conversation.paymentMethod.charAt(0).toUpperCase() + conversation.paymentMethod.slice(1)}  
💰 Total: $${totalCost.toLocaleString()}  
😊 ¡Gracias! ¿Cómo fue tu experiencia? (1. Excelente, 2. Buena, 3. Regular, 4. Mala)`,
      notify: notifyMessage,
      clearConversation: true
    };
  }
  if (lowercaseMessage === "no") {
    conversation.step = "ordering_time"; // Volver al inicio del flujo de ajustes
    return {
      main: `✅ ¡Listo! Vamos a ajustar.  
⏰ ¿A qué hora quieres tu pedido? (Ej: "1 pm", "ahora")`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Responde "sí" para confirmar o "no" para ajustar.`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleCompleted(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (["1", "2", "3", "4"].includes(lowercaseMessage)) {
    return {
      reply: `😊 ¡Gracias por tu pedido y tu feedback! Esperamos que lo disfrutes. Si necesitas algo más, solo escribe. 😊`,
      clearConversation: true
    };
  }
  return processOrder(conversation.phone, message);
}

function generateOrderSummary(conversation) {
  let summary = `📋 Resumen de tu pedido:\n`;
  conversation.lunches.forEach((lunch, index) => {
    summary += `${index + 1}. Almuerzo: ${lunch.soup}, ${lunch.principle || "ninguno"}, ${lunch.protein || "ninguna"}${lunch.extraProtein ? ` + ${lunch.extraProteinType}` : ""}, ${lunch.drink}, ${lunch.salad ? "con ensalada" : "sin ensalada"}, ${lunch.rice ? "con arroz" : "sin arroz"} - ${conversation.addresses[index]}\n`;
  });
  summary += `⏰ Hora: ${conversation.deliveryTime}\n`;
  summary += `💳 Pago: ${conversation.paymentMethod}\n`;
  summary += `🍴 Cubiertos: ${conversation.cutlery ? "Sí" : "No"}\n`;
  const totalCost = conversation.lunches.reduce((sum, lunch) => {
    let baseCost = (lunch.soup === "solo bandeja" || lunch.soup === "sin sopa") ? 12000 : 13000;
    if (lunch.extraProtein && lunch.extraProteinType !== "mojarra") baseCost += 5000;
    return sum + baseCost;
  }, 0);
  summary += `💰 Total: $${totalCost.toLocaleString()}`;
  return summary;
}