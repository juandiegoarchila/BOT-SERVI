//src/handlers/initial-handlers.js
import { extractOrderCount } from "../utils/order-utils.js";
import { getSecondaryMessage } from "../utils/conversation-utils.js";

export async function handleInitial(conversation, menuPhotoUrl, MessageMedia) {
  conversation.welcomeSent = true;
  conversation.step = "awaiting_order_count";
  const media = await MessageMedia.fromUrl(menuPhotoUrl, { unsafeMime: true });

  const greetingMessage = `Buenas tardes. Soy el asistente de Cocina Casera. 😊 ¿Qué deseas para hoy?`;
  const priceMessage = `Cada almuerzo cuesta $13.000 (sin sopa: $12.000). ¿Cuántos almuerzos quieres? (Ej: "1", "dos")`;

  if (conversation.lastOrder) {
    conversation.step = "repeating_last_order";
    return {
      messages: [`${greetingMessage}\n\nLa última vez pediste: ${conversation.lastOrder}. ¿Quieres lo mismo? (sí/no)`],
      options: { media }
    };
  }

  return {
    messages: [greetingMessage, priceMessage],
    options: { media }
  };
}

export function handleRepeatingLastOrder(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "sí" || lowercaseMessage === "si") {
    conversation.lunches = [...conversation.lastOrderLunches];
    conversation.orderCount = conversation.lunches.length;
    conversation.remainingCount = 0;
    conversation.step = "ordering_time";
    return {
      main: `✅ ¡Perfecto! Repetimos tu último pedido.  
⏰ ¿A qué hora lo quieres? (Ej: "1 pm", "ahora")`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "no") {
    conversation.step = "awaiting_order_count";
    return {
      main: `🍽️ Ok, empecemos de nuevo. Cada almuerzo cuesta $13.000 (sin sopa: $12.000). ¿Cuántos almuerzos quieres? (Ej: "1", "dos")`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "initial";
    return {
      main: `Escribe "Hola" para empezar de nuevo.`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `Por favor, responde "sí" o "no".`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleOrderCount(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `🍽️ Dime cuántos almuerzos quieres (1 a 10). Ejemplo: "2", "dos" o "dos almuerzos".`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "initial";
    return {
      main: `Escribe "Hola" para empezar de nuevo.`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  const orderCount = extractOrderCount(message);
  if (orderCount && orderCount >= 1 && orderCount <= 10) {
    conversation.orderCount = orderCount;
    conversation.remainingCount = orderCount;
    if (orderCount === 1) {
      conversation.step = "defining_single_lunch_soup";
      return {
        main: `✅ ¡Entendido! 1 almuerzo.  
🥣 ¿Sancocho de pescado, sopa del día o cambiar la sopa por?  
1. Huevo - frito  
2. Papa a la francesa  
3. Solo bandeja ($12.000)`,
        secondary: getSecondaryMessage(conversation.step)
      };
    }
    conversation.step = "defining_groups";
    const options = [];
    for (let i = 0; i < orderCount; i++) {
      const equalCount = orderCount - i;
      if (equalCount === orderCount) options.push(`1. Todos iguales (${orderCount})`);
      else if (equalCount === 1) options.push(`${i + 1}. Todos diferentes`);
      else options.push(`${i + 1}. ${equalCount} iguales + ${i} diferente${i === 1 ? "" : "s"}`);
    }
    return {
      main: `✅ ¡Genial! ${orderCount} almuerzos.  
¿Cómo los organizamos?  
${options.join("\n")}`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Dime cuántos almuerzos quieres (1 a 10). Ejemplo: "4" o "cuatro". 🔔 Escribe "ayuda" si necesitas más explicación.`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleDefiningGroups(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `🍽️ Elige cómo organizar tus ${conversation.orderCount} almuerzos. Ejemplo: "1" para todos iguales, "2" para algunos diferentes.`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "awaiting_order_count";
    return {
      main: `🍽️ Dime cuántos almuerzos quieres (1 a 10). Ejemplo: "2" o "dos".`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  const option = parseInt(lowercaseMessage);
  if (option >= 1 && option <= conversation.orderCount) {
    const equalCount = conversation.orderCount - (option - 1);
    conversation.groups.push({ count: equalCount });
    conversation.currentGroupIndex = 0;
    if (equalCount === 1) {
      conversation.step = "defining_different_soup";
      conversation.currentLunchIndex = conversation.lunches.length;
      return {
        main: `✅ Serán diferentes.  
Definamos el almuerzo ${conversation.currentLunchIndex + 1}:  
🥣 ¿Sancocho de pescado, sopa del día o cambiar la sopa por?  
1. Huevo - frito  
2. Papa a la francesa  
3. Solo bandeja ($12.000)`,
        secondary: getSecondaryMessage(conversation.step)
      };
    }
    conversation.step = "defining_group_soup";
    return {
      main: `✅ ${equalCount} almuerzos iguales.  
Para estos ${equalCount}:  
🥣 ¿Sancocho de pescado, sopa del día o cambiar la sopa por?  
1. Huevo - frito  
2. Papa a la francesa  
3. Solo bandeja ($12.000)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  const options = [];
  for (let i = 0; i < conversation.orderCount; i++) {
    const equalCount = conversation.orderCount - i;
    if (equalCount === conversation.orderCount) options.push(`1. Todos iguales (${conversation.orderCount})`);
    else if (equalCount === 1) options.push(`${i + 1}. Todos diferentes`);
    else options.push(`${i + 1}. ${equalCount} iguales + ${i} diferente${i === 1 ? "" : "s"}`);
  }
  return {
    main: `❌ No entendí. Elige:  
${options.join("\n")}`,
    secondary: getSecondaryMessage(conversation.step)
  };
}