 //src/handlers/adjustment-handlers.js
 import { validateAndMatchField, PRINCIPLES_WITH_PROTEIN } from "../utils/conversation-utils.js";
 import { mapNumberToOption, findClosestMatch, normalizeTime } from "../utils/order-utils.js";
 import { generateOrderSummary } from '../utils/conversation-utils.js';
 import { VALID_PAYMENTS } from "../config/order-config.js";
 
 export function handleSelectingLunchToAdjust(conversation, message) {
   const lowercaseMessage = message.toLowerCase().trim();
 
   if (["atrás", "atras", "volver"].includes(lowercaseMessage)) {
     conversation.step = "preview_order";
     conversation.previewShown = false;
     return { main: `${generateOrderSummary(conversation).main}\n✅ ¿Todo bien?\n1️⃣ Sí, confirmar pedido.\n2️⃣ No, quiero cambiar algo.`, secondary: getSecondaryMessage() };
   }
 
   const lunchIndex = parseInt(lowercaseMessage) - 1;
   if (isNaN(lunchIndex) || lunchIndex < 0 || lunchIndex >= conversation.orderCount) {
     return { main: `❌ No entendí. Dime un número entre 1 y ${conversation.orderCount}.\n🌟 Usa 'Atrás' para regresar al resumen.`, secondary: getSecondaryMessage() };
   }
 
   conversation.adjustingLunchIndex = lunchIndex;
   conversation.step = "selecting_adjustment";
   return { main: `🍽️ Almuerzo ${lunchIndex + 1}. ¿Qué quieres cambiar?  
 1️⃣ Sopa  
 2️⃣ Principio  
 3️⃣ Proteína  
 4️⃣ Bebida  
 5️⃣ Dirección  
 6️⃣ Hora  
 7️⃣ Pago  
 8️⃣ Proteína adicional (cambiarla o quitarla)\n🌟 Usa 'Atrás' para regresar al resumen.`, secondary: getSecondaryMessage() };
 }
 
 export function handleSelectingAdjustment(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();

  if (["atrás", "atras", "volver"].includes(lowercaseMessage)) {
    conversation.step = conversation.orderCount > 1 ? "selecting_lunch_to_adjust" : "preview_order";
    return conversation.orderCount > 1 
      ? { main: `🍽️ Dime el número del almuerzo a ajustar (1-${conversation.orderCount}).`, secondary: getSecondaryMessage() }
      : { main: `${generateOrderSummary(conversation).main}\n✅ ¿Todo bien?\n1️⃣ Sí, confirmar pedido.\n2️⃣ No, quiero cambiar algo.`, secondary: getSecondaryMessage() };
  }

  const options = {
    "1": "soup",
    "2": "principle",
    "3": "protein",
    "4": "drink",
    "5": "address",
    "6": "deliveryTime",
    "7": "paymentMethod",
    "8": "extraProtein",
  };

  if (options[lowercaseMessage]) {
    conversation.adjustingField = options[lowercaseMessage];
    conversation.step = "adjusting_field";
    if (conversation.adjustingField === "soup") return { main: `🥣 ¿Sancocho de pescado, sopa del día o cambiar la sopa por?  
1️⃣ Huevo - frito  
2️⃣ Papa a la francesa  
3️⃣ Solo bandeja ($12.000)`, secondary: getSecondaryMessage() };
    if (conversation.adjustingField === "principle") return { main: `🥗 ¿Qué principio quieres? (Ej: "frijol" o "sin principio")`, secondary: getSecondaryMessage() };
    if (conversation.adjustingField === "protein") return { main: `🍗 ¿Qué proteína quieres? (Ej: "pechuga asada" o "ninguna")`, secondary: getSecondaryMessage() };
    if (conversation.adjustingField === "drink") return { main: `🥤 ¿Qué bebida quieres?  
1️⃣ Limonada de panela  
2️⃣ Jugo - Natural del día`, secondary: getSecondaryMessage() };
    if (conversation.adjustingField === "address") return { main: `📍 Dime la nueva dirección (Ej: "Calle 10 #5-23, para Juan")`, secondary: getSecondaryMessage() };
    if (conversation.adjustingField === "deliveryTime") return { main: `⏰ ¿A qué hora? (Ej: "1 pm", "ahora")`, secondary: getSecondaryMessage() };
    if (conversation.adjustingField === "paymentMethod") return { main: `💳 ¿Cómo pagas? (Efectivo, Nequi, Daviplata)`, secondary: getSecondaryMessage() };
    if (conversation.adjustingField === "extraProtein") {
      const hasExtraProtein = conversation.lunches[conversation.adjustingLunchIndex].extraProtein;
      return { main: hasExtraProtein 
        ? `🍗 ¿Qué quieres hacer con la proteína adicional?  
1️⃣ Cambiarla (Ej: "res")  
2️⃣ Cancelarla`
        : `🍗 ¿Quieres agregar una proteína adicional por $5,000? (sí/no)`, 
        secondary: getSecondaryMessage() };
    }
  }

  return { main: `❌ No entendí. Elige una opción (1-8).`, secondary: getSecondaryMessage() };
}
 
export function handleAdjustingField(conversation, message) {
  const field = conversation.adjustingField;
  const lunchIndex = conversation.adjustingLunchIndex;
  const lowercaseMessage = message.toLowerCase().trim();

  // Validaciones previas (sin cambios)
  if (lunchIndex === undefined || lunchIndex === null || isNaN(lunchIndex)) {
    conversation.step = "initial";
    return {
      main: "❌ Error: No se encontró el almuerzo a ajustar. Dime cuántos almuerzos quieres para empezar de nuevo.",
      secondary: getSecondaryMessage()
    };
  }
  if (!conversation.lunches || !Array.isArray(conversation.lunches) || lunchIndex >= conversation.lunches.length || !conversation.lunches[lunchIndex]) {
    conversation.step = "initial";
    return {
      main: "❌ Error: El pedido está corrupto. Dime cuántos almuerzos quieres para empezar de nuevo.",
      secondary: getSecondaryMessage()
    };
  }
  if (["atrás", "atras", "volver"].includes(lowercaseMessage)) {
    conversation.step = "selecting_adjustment";
    return {
      main: `🍽️ Almuerzo ${lunchIndex + 1}. ¿Qué quieres cambiar?  
1️⃣ Sopa  
2️⃣ Principio  
3️⃣ Proteína  
4️⃣ Bebida  
5️⃣ Dirección  
6️⃣ Hora  
7️⃣ Pago  
8️⃣ Proteína adicional (cambiarla o quitarla)\n🌟 Usa 'Atrás' para regresar al resumen.`,
      secondary: getSecondaryMessage()
    };
  }
  if (lowercaseMessage === "ayuda") {
    if (field === "paymentMethod") return {
      main: `💳 Elige: Efectivo, Nequi o Daviplata`,
      secondary: getSecondaryMessage()
    };
    // ... otros casos de ayuda sin cambios
  }

  // Manejo específico para paymentMethod
  if (field === "paymentMethod") {
    if (!VALID_PAYMENTS.includes(lowercaseMessage)) {
      return {
        main: `❌ Opción no válida. 💳 Elige: Efectivo, Nequi o Daviplata\n🔔 Escribe "ayuda" para más opciones.`,
        secondary: getSecondaryMessage()
      };
    }
    conversation[field] = lowercaseMessage;
    conversation.step = "preview_order";
    conversation.previewShown = false;
    return {
      main: `${generateOrderSummary(conversation).main}\n✅ ¿Todo bien?\n1️⃣ Sí, confirmar pedido.\n2️⃣ No, quiero cambiar algo.`,
      secondary: getSecondaryMessage()
    };
  }

  // Resto del código para otros campos (deliveryTime, principle, extraProtein, etc.) sin cambios
  if (field === "deliveryTime") {
    const time = normalizeTime(lowercaseMessage);
    if (!time || !isWithinTimeRange(time)) return {
      main: `❌ Hora no válida (11:30 AM - 3:45 PM). Usa "1 pm", "13:30" o "ahora".`,
      secondary: getSecondaryMessage()
    };
    conversation[field] = time;
    conversation.step = "preview_order";
    conversation.previewShown = false;
    return {
      main: `${generateOrderSummary(conversation).main}\n✅ ¿Todo bien?\n1️⃣ Sí, confirmar pedido.\n2️⃣ No, quiero cambiar algo.`,
      secondary: getSecondaryMessage()
    };
  }
  // ... (otros casos como principle, extraProtein, etc., sin cambios)

  const { isValid, value } = validateAndMatchField(field, message);
  if (isValid) {
    if (field === "address") {
      conversation.addresses[lunchIndex] = value;
    } else if (field === "principle" && PRINCIPLES_WITH_PROTEIN.some(p => value.includes(p))) {
      conversation.lunches[lunchIndex].principle = value;
      conversation.lunches[lunchIndex].protein = null;
    } else if (field === "protein") {
      conversation.lunches[lunchIndex].protein = value;
      conversation.lunches[lunchIndex].extraProtein = false;
      conversation.lunches[lunchIndex].extraProteinType = null;
    } else {
      conversation.lunches[lunchIndex][field] = value;
    }
    conversation.step = "preview_order";
    conversation.previewShown = false;
    return {
      main: `${generateOrderSummary(conversation).main}\n✅ ¿Todo bien?\n1️⃣ Sí, confirmar pedido.\n2️⃣ No, quiero cambiar algo.`,
      secondary: getSecondaryMessage()
    };
  }

  let errorMsg = `❌ Opción no válida. `;
  if (field === "soup") errorMsg += `🥣 Usa: 1️⃣ Huevo - frito 2️⃣ Papa a la francesa 3️⃣ Solo bandeja ($12.000) O escribe (ej: "sancocho de pescado")`;
  else if (field === "principle") errorMsg += `🥗 ¿Qué principio? (Ej: "frijol" o "sin principio")`;
  else if (field === "protein") errorMsg += `🍗 ¿Qué proteína? (Ej: "res" o "ninguna")`;
  else if (field === "drink") errorMsg += `🥤 Usa: 1️⃣ Limonada de panela 2️⃣ Jugo - Natural del día O escribe`;
  else if (field === "address") errorMsg += `📍 Dirección válida (Ej: "Calle 10 #5-23, para Juan")`;
  else if (field === "paymentMethod") errorMsg += `💳 Elige: Efectivo, Nequi o Daviplata`; // Esto ya no se ejecutará gracias al if anterior
  return { main: `${errorMsg}\n🔔 Escribe "ayuda" para más opciones.`, secondary: getSecondaryMessage() };
}
 
export function handleAdjustingNoPrinciple(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();

  if (["atrás", "atras", "volver"].includes(lowercaseMessage)) {
    conversation.step = "adjusting_field";
    conversation.adjustingField = "principle";
    return { main: `🥗 ¿Qué principio quieres? (Ej: "frijol" o "sin principio")\n🌟 Usa 'Atrás' para regresar.`, secondary: getSecondaryMessage() };
  }

  const options = ["huevo frito", "papa a la francesa", "doble porción de arroz", "más ensalada"];
  const choice = mapNumberToOption(lowercaseMessage, options) || findClosestMatch(lowercaseMessage, options);
  if (choice) {
    conversation.lunches[conversation.adjustingLunchIndex].principle = choice;
    conversation.step = "preview_order";
    conversation.previewShown = false;
    return { 
      main: `${generateOrderSummary(conversation).main}\n✅ ¿Todo bien?\n1️⃣ Sí, confirmar pedido.\n2️⃣ No, quiero cambiar algo.`, 
      secondary: getSecondaryMessage() 
    };
  }

  return { main: `❌ Opción no válida. Usa:  
 1️⃣ Huevo frito  
 2️⃣ Papa a la francesa  
 3️⃣ Doble porción de arroz  
 4️⃣ Más ensalada`, secondary: getSecondaryMessage() };
}
 
 export function handleAdjustingExtraProtein(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  const num = parseInt(lowercaseMessage);

  if (lowercaseMessage === "ayuda") {
    return {
      main: `🍗 ¿Qué quieres hacer con la proteína adicional?  
1️⃣ Cambiarla (Ej: "res")  
2️⃣ Cancelarla`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }

  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "adjusting_lunch";
    return {
      main: `🍽️ Almuerzo ${conversation.currentLunchIndex + 1}. ¿Qué quieres cambiar?  
1️⃣ Sopa  
2️⃣ Principio  
3️⃣ Proteína  
4️⃣ Bebida  
5️⃣ Dirección  
6️⃣ Hora  
7️⃣ Pago  
8️⃣ Proteína adicional (cambiarla o quitarla)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }

  if (num === 2) { // Cancelarla
    const lunch = conversation.lunches[conversation.currentLunchIndex];
    if (lunch) {
      lunch.extraProtein = false;
      lunch.extraProteinType = null;
      conversation.step = "confirming_order";
      return generateOrderSummary(conversation);
    }
    return {
      main: `❌ Error al ajustar el almuerzo. Intenta de nuevo.`,
      secondary: getSecondaryMessage(conversation.step)
    };
  } else if (num === 1) { // Cambiarla
    conversation.step = "adjusting_extra_protein_type";
    return {
      main: `🍗 ¿Qué proteína adicional quieres? (Ej: "res", "pollo")`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }

  return {
    main: `❌ No entendí. Elige:  
1️⃣ Cambiarla (Ej: "res")  
2️⃣ Cancelarla`,
    secondary: getSecondaryMessage(conversation.step)
  };
}
 
 export function handleChangingExtraProtein(conversation, message) {
   const lowercaseMessage = message.toLowerCase().trim();
 
   if (["atrás", "atras", "volver"].includes(lowercaseMessage)) {
     conversation.step = "adjusting_extra_protein";
     return { main: `🍗 ¿Qué quieres hacer con la proteína adicional?  
 1️⃣ Cambiarla (Ej: "res")  
 2️⃣ Cancelarla\n🌟 Usa 'Atrás' para regresar, 'Editar' para rehacer, o 'Cancelar' para empezar de nuevo.`, secondary: getSecondaryMessage() };
   }
 
   const { isValid, value } = validateAndMatchField("protein", message); // Assuming extraProtein uses protein validation
   if (isValid) {
     if (value === "mojarra") return { main: `❌ La mojarra no está disponible como adicional. Elige otra (Ej: "res").`, secondary: getSecondaryMessage() };
     conversation.lunches[conversation.adjustingLunchIndex].extraProtein = true;
     conversation.lunches[conversation.adjustingLunchIndex].extraProteinType = value;
     conversation.step = "preview_order";
     conversation.previewShown = false;
     return { main: generateOrderSummary(conversation).main, secondary: getSecondaryMessage() };
   }
 
   return { main: `❌ No entendí. Dime una proteína adicional (Ej: "res").\n🌟 Usa 'Atrás' para regresar.`, secondary: getSecondaryMessage() };
 }
 
 function isWithinTimeRange(time) {
   const [hours, minutes] = time.split(":").map(Number);
   const timeInMinutes = hours * 60 + minutes;
   const startTime = 11 * 60 + 30; // 11:30 AM
   const endTime = 15 * 60 + 45; // 3:45 PM
   return timeInMinutes >= startTime && timeInMinutes <= endTime;
 }
 
 function getSecondaryMessage() {
   return `🌟 Usa 'Atrás' para regresar, 'Editar' para rehacer, o 'Cancelar' para empezar de nuevo.`;
 }