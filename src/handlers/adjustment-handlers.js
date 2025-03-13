//src/handlers/adjustment-handlers.js
import { validateAndMatchField, generateSummary, PRINCIPLES_WITH_PROTEIN, PROTEIN_MENU, PRINCIPLE_MENU } from "../utils/conversation-utils.js";
import { mapNumberToOption, findClosestMatch } from "../utils/order-utils.js"; // Agregada importación

export function handleSelectingLunchToAdjust(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return `🍽️ Escribe el número del almuerzo que quieres cambiar (1-${conversation.orderCount}). Ejemplo: "1".`;
  }
  if (lowercaseMessage === "volver") {
    conversation.step = "preview_order";
    return generateSummary(conversation);
  }
  const lunchIndex = parseInt(lowercaseMessage) - 1;
  if (lunchIndex >= 0 && lunchIndex < conversation.orderCount) {
    conversation.adjustingLunchIndex = lunchIndex;
    conversation.step = "selecting_adjustment";
    return `🍽️ Almuerzo ${lunchIndex + 1}. ¿Qué quieres cambiar?  
1. Sopa  
2. Principio  
3. Proteína  
4. Bebida  
5. Dirección`;
  }
  return `❌ No entendí. Elige un número entre 1 y ${conversation.orderCount}.`;
}

export function handleSelectingAdjustment(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return `Elige qué cambiar:  
1. Sopa  
2. Principio  
3. Proteína  
4. Bebida  
5. Dirección  
Ejemplo: "1".`;
  }
  if (lowercaseMessage === "volver") {
    conversation.step = "selecting_lunch_to_adjust";
    return `🍽️ Dime el número del almuerzo a ajustar (1-${conversation.orderCount}).`;
  }
  const option = parseInt(lowercaseMessage);
  const fields = ["soup", "principle", "protein", "drink", "address"];
  if (option >= 1 && option <= 5) {
    conversation.adjustingField = fields[option - 1];
    conversation.step = "adjusting_field";
    if (option === 1) return `🥣 ¿Sancocho de pescado, sopa del día o cambiar la sopa por?  
1. Huevo - frito  
2. Papa a la francesa  
3. Solo bandeja ($12.000)`;
    if (option === 2) return `🥗 ¿Qué principio quieres? (Ej: "frijol" o "sin principio")`;
    if (option === 3) {
      if (PRINCIPLES_WITH_PROTEIN.some(p => conversation.lunches[conversation.adjustingLunchIndex].principle?.includes(p))) {
        return `❌ El principio "${conversation.lunches[conversation.adjustingLunchIndex].principle}" ya incluye proteína.  
¿Quieres agregar una proteína adicional por $5,000? (sí/no)`;
      }
      return `🍗 ¿Qué proteína quieres?`;
    }
    if (option === 4) return `🥤 ¿Qué bebida quieres?  
1. Limonada de panela  
2. Jugo - Natural del día`;
    if (option === 5) return `📍 Nueva dirección para el almuerzo ${conversation.adjustingLunchIndex + 1} (Ej: "Calle 10 #5-23, para Juan").`;
  }
  return `❌ No entendí. Elige una opción (1-5).`;
}

export function handleAdjustingField(conversation, message) {
  const field = conversation.adjustingField;
  const lunchIndex = conversation.adjustingLunchIndex;
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    if (field === "soup") return `🥣 Elige una sopa:  
1. Huevo - frito  
2. Papa a la francesa  
3. Solo bandeja ($12.000)  
O escribe el nombre (ej: "sancocho de pescado")`;
    if (field === "principle") return `🥗 Elige un principio: ${PRINCIPLE_MENU} Ejemplo: "frijol" o "sin principio".`;
    if (field === "protein") return `🍗 Elige una proteína: ${PROTEIN_MENU} Ejemplo: "res".`;
    if (field === "drink") return `🥤 Elige una bebida:  
1. Limonada de panela  
2. Jugo - Natural del día  
O escribe el nombre`;
    return `📍 Escribe la nueva dirección. Ejemplo: "Calle 10 #5-23, para Juan".`;
  }
  if (lowercaseMessage === "volver") {
    conversation.step = "selecting_adjustment";
    return `🍽️ Almuerzo ${lunchIndex + 1}. ¿Qué quieres cambiar?  
1. Sopa  
2. Principio  
3. Proteína  
4. Bebida  
5. Dirección`;
  }
  if (field === "protein" && PRINCIPLES_WITH_PROTEIN.some(p => conversation.lunches[lunchIndex].principle?.includes(p))) {
    if (lowercaseMessage === "sí" || lowercaseMessage === "si") {
      conversation.step = "adjusting_extra_protein";
      return `🍗 ¿Qué proteína adicional quieres? (No mojarra, cuesta $5,000 extra)`;
    }
    if (lowercaseMessage === "no") {
      conversation.step = "preview_order";
      return generateSummary(conversation);
    }
    return `❌ Responde "sí" o "no".`;
  }
  if (field === "principle" && (lowercaseMessage === "sin principio" || lowercaseMessage === "ninguno")) {
    conversation.lunches[lunchIndex].principle = null;
    conversation.step = "adjusting_no_principle";
    return `✅ Sin principio. ¿Qué prefieres de reemplazo?  
1. Huevo frito  
2. Papa a la francesa`;
  }
  const { isValid, value } = validateAndMatchField(field, message);
  if (isValid) {
    if (field === "address") {
      conversation.addresses[lunchIndex] = value;
    } else if (field === "principle") {
      conversation.lunches[lunchIndex].principle = value;
      if (PRINCIPLES_WITH_PROTEIN.some(p => value.includes(p))) {
        conversation.lunches[lunchIndex].protein = null;
      }
    } else {
      conversation.lunches[lunchIndex][field] = value;
    }
    conversation.step = "preview_order";
    return generateSummary(conversation);
  }
  let errorMsg;
  if (field === "soup") {
    errorMsg = `❌ Opción no válida.  
🥣 Usa:  
1. Huevo - frito  
2. Papa a la francesa  
3. Solo bandeja ($12.000)  
O escribe el nombre (ej: "sancocho de pescado")`;
  } else if (field === "principle") {
    errorMsg = `❌ Opción no válida.  
🥗 ¿Qué principio quieres? (Ej: "frijol" o "sin principio")`;
  } else if (field === "protein") {
    errorMsg = `❌ Opción no válida.  
🍗 ¿Qué proteína quieres? (Ej: "res")`;
  } else if (field === "drink") {
    errorMsg = `❌ Opción no válida.  
🥤 Usa:  
1. Limonada de panela  
2. Jugo - Natural del día  
O escribe el nombre`;
  } else {
    errorMsg = `❌ No entendí. Dime una dirección válida (Ej: "Calle 10 #5-23, para Juan").`;
  }
  return `${errorMsg} 🔔 Si necesitas ayuda, escribe "ayuda".`;
}

export function handleAdjustingNoPrinciple(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return `Elige un reemplazo para el principio:  
1. Huevo frito  
2. Papa a la francesa`;
  }
  if (lowercaseMessage === "volver") {
    conversation.step = "adjusting_field";
    return `Volvimos atrás.  
🥗 ¿Qué principio quieres? (Ej: "frijol" o "sin principio")`;
  }
  const options = ["huevo frito", "papa a la francesa"];
  const choice = mapNumberToOption(lowercaseMessage, options) || findClosestMatch(lowercaseMessage, options);
  if (choice) {
    conversation.lunches[conversation.adjustingLunchIndex].principle = choice;
    conversation.step = "preview_order";
    return generateSummary(conversation);
  }
  return `❌ Opción no válida. Usa:  
1. Huevo frito  
2. Papa a la francesa`;
}

export function handleAdjustingExtraProtein(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return `🍗 Elige una proteína adicional (no mojarra, cuesta $5,000 extra):  
${PROTEIN_MENU}  
Ejemplo: "res".`;
  }
  if (lowercaseMessage === "volver") {
    conversation.step = "selecting_adjustment";
    return `🍽️ Almuerzo ${conversation.adjustingLunchIndex + 1}. ¿Qué quieres cambiar?  
1. Sopa  
2. Principio  
3. Proteína  
4. Bebida  
5. Dirección`;
  }
  const { isValid, value } = validateAndMatchField("protein", message);
  if (isValid) {
    if (value === "mojarra") {
      return `❌ La mojarra no está disponible como porción adicional. Elige otra proteína (ej: "res").`;
    }
    conversation.lunches[conversation.adjustingLunchIndex].protein = value;
    conversation.lunches[conversation.adjustingLunchIndex].extraProtein = true;
    conversation.step = "preview_order";
    return generateSummary(conversation);
  }
  return `❌ Opción no válida.  
🍗 ¿Qué proteína quieres? (Ej: "res", no mojarra)`;
}