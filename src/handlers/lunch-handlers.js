// src/handlers/lunch-handlers.js
import { validateAndMatchField, getSecondaryMessage } from "../utils/conversation-utils.js";

export function handleAwaitingOrderCount(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `🍽️ Dime cuántos almuerzos quieres (1 a 10). Ejemplo: "2" o "dos".`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    return {
      main: `❌ Pedido cancelado. ¿En qué puedo ayudarte ahora?`,
      clearConversation: true
    };
  }
  const num = parseInt(lowercaseMessage) || ["uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez"].indexOf(lowercaseMessage) + 1;
  if (num >= 1 && num <= 10) {
    conversation.orderCount = num;
    conversation.remainingCount = num;
    conversation.lunches = [];
    conversation.groups = [];
    conversation.currentGroupIndex = 0;
    conversation.currentLunchIndex = 0;
    conversation.currentLunch = {};
    conversation.step = "defining_lunch_groups";
    const groupOptions = [];
    for (let i = 0; i < num; i++) {
      const equalCount = num - i;
      if (equalCount === num) groupOptions.push(`1. Todos iguales (${num})`);
      else if (equalCount === 1) groupOptions.push(`${i + 1}. Todos diferentes`);
      else groupOptions.push(`${i + 1}. ${equalCount} iguales + ${i} diferente${i === 1 ? "" : "s"}`);
    }
    return {
      main: `✅ ¡Genial! ${num} almuerzos.  
¿Cómo los organizamos?  
${groupOptions.join("\n")}`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Dime cuántos almuerzos quieres (1 a 10). Ejemplo: "4" o "cuatro".`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleDefiningLunchGroups(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    const groupOptions = [];
    for (let i = 0; i < conversation.orderCount; i++) {
      const equalCount = conversation.orderCount - i;
      if (equalCount === conversation.orderCount) groupOptions.push(`1. Todos iguales (${conversation.orderCount})`);
      else if (equalCount === 1) groupOptions.push(`${i + 1}. Todos diferentes`);
      else groupOptions.push(`${i + 1}. ${equalCount} iguales + ${i} diferente${i === 1 ? "" : "s"}`);
    }
    return {
      main: `🍽️ ¿Cómo organizamos tus ${conversation.orderCount} almuerzos?  
${groupOptions.join("\n")}`,
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
  const num = parseInt(lowercaseMessage);
  if (!isNaN(num) && num >= 1 && num <= conversation.orderCount) {
    const equalCount = conversation.orderCount - (num - 1);
    conversation.groups.push({ count: equalCount });
    conversation.step = equalCount === conversation.orderCount ? "defining_group_soup" : "defining_group_soup";
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
  return {
    main: `❌ No entendí. Usa un número de 1 a ${conversation.orderCount}. Ejemplo: "1" para todos iguales.`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleDefiningGroupSoup(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `🥣 Para este grupo de ${conversation.groups[conversation.currentGroupIndex].count} almuerzos:  
Dime qué quieres de sopa: "Sancocho de pescado", "sopa del día", o cambiar la sopa por:  
1. Huevo - frito  
2. Papa a la francesa  
3. Solo bandeja ($12.000)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "defining_lunch_groups";
    conversation.groups = [];
    const groupOptions = [];
    for (let i = 0; i < conversation.orderCount; i++) {
      const equalCount = conversation.orderCount - i;
      if (equalCount === conversation.orderCount) groupOptions.push(`1. Todos iguales (${conversation.orderCount})`);
      else if (equalCount === 1) groupOptions.push(`${i + 1}. Todos diferentes`);
      else groupOptions.push(`${i + 1}. ${equalCount} iguales + ${i} diferente${i === 1 ? "" : "s"}`);
    }
    return {
      main: `✅ ¡Genial! ${conversation.orderCount} almuerzos.  
¿Cómo los organizamos?  
${groupOptions.join("\n")}`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  let soupValue;
  if (["1", "huevo", "huevo frito"].includes(lowercaseMessage)) soupValue = "huevo - frito";
  else if (["2", "papa", "papas", "papa a la francesa"].includes(lowercaseMessage)) soupValue = "papa a la francesa";
  else if (["3", "solo bandeja", "bandeja"].includes(lowercaseMessage)) soupValue = "solo bandeja";
  else if (["sancocho", "sancocho de pescado"].includes(lowercaseMessage)) soupValue = "sancocho de pescado";
  else if (["sopa", "sopa del dia", "sopa del día"].includes(lowercaseMessage)) soupValue = "sopa del día";
  else soupValue = lowercaseMessage === "sin sopa" ? "sin sopa" : null;

  if (soupValue) {
    if (!conversation.groups[conversation.currentGroupIndex]) {
      conversation.groups[conversation.currentGroupIndex] = { count: conversation.remainingCount };
    }
    conversation.groups[conversation.currentGroupIndex].soup = soupValue;
    conversation.step = "defining_group_principle";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🥗 ¿Qué principio quieres? (Ej: "frijol" o "sin principio")`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Usa "sancocho", "sopa", o:  
1. Huevo - frito  
2. Papa a la francesa  
3. Solo bandeja ($12.000)`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleDefiningGroupPrinciple(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `🥗 Para este grupo de ${conversation.groups[conversation.currentGroupIndex].count} almuerzos:  
Dime qué principio quieres (ej: "frijol", "arveja") o "sin principio" si no quieres.`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "defining_group_soup";
    return {
      main: `🥣 ¿Sancocho de pescado, sopa del día o cambiar la sopa por?  
1. Huevo - frito  
2. Papa a la francesa  
3. Solo bandeja ($12.000)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  const { isValid, value } = validateAndMatchField("principle", message);
  if (isValid || lowercaseMessage === "sin principio" || lowercaseMessage === "ninguno") {
    conversation.groups[conversation.currentGroupIndex].principle = lowercaseMessage === "sin principio" || lowercaseMessage === "ninguno" ? "ninguno" : value;
    conversation.step = "defining_group_protein";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🍗 ¿Qué proteína quieres? (O escribe 'ninguna' si no deseas proteína adicional)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Dime un principio (ej: "frijol") o "sin principio".`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleDefiningGroupProtein(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `🍗 Para este grupo de ${conversation.groups[conversation.currentGroupIndex].count} almuerzos:  
Dime qué proteína quieres (ej: "pollo", "res") o "ninguna" si no deseas.`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "defining_group_principle";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🥗 ¿Qué principio quieres? (Ej: "frijol" o "sin principio")`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  const { isValid, value } = validateAndMatchField("protein", message);
  if (isValid || lowercaseMessage === "ninguna") {
    conversation.groups[conversation.currentGroupIndex].protein = lowercaseMessage === "ninguna" ? "ninguna" : value;
    conversation.step = "defining_group_extra_protein";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🍗 ¿Quieres proteína adicional por $5,000? (sí/no)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Dime una proteína (ej: "pollo") o "ninguna".`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleDefiningGroupExtraProtein(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `🍗 ¿Quieres agregar proteína adicional por $5,000 a este grupo de ${conversation.groups[conversation.currentGroupIndex].count} almuerzos?  
Responde "sí" o "no".`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "defining_group_protein";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🍗 ¿Qué proteína quieres? (O escribe 'ninguna' si no deseas proteína adicional)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "sí" || lowercaseMessage === "si") {
    conversation.step = "defining_group_extra_protein_count";
    const options = [];
    for (let i = 0; i <= conversation.groups[conversation.currentGroupIndex].count; i++) {
      const extraCount = conversation.groups[conversation.currentGroupIndex].count - i;
      if (extraCount === conversation.groups[conversation.currentGroupIndex].count) {
        options.push(`1. Todos con proteína adicional (${extraCount})`);
      } else if (extraCount === 0) {
        options.push(`${i + 1}. Ninguno con proteína adicional`);
      } else {
        options.push(`${i + 1}. ${extraCount} con proteína adicional + ${i} normal${i === 1 ? "" : "es"}`);
      }
    }
    return {
      main: `✅ ¡Perfecto! ¿Para cuántos de estos ${conversation.groups[conversation.currentGroupIndex].count} almuerzos quieres proteína adicional?  
${options.join("\n")}`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "no") {
    conversation.groups[conversation.currentGroupIndex].extraProteinCount = 0;
    conversation.step = "defining_group_drink";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🥤 ¿Qué bebida quieres?  
1. Limonada de panela  
2. Jugo - Natural del día`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Responde "sí" o "no".`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleDefiningGroupExtraProteinCount(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    const options = [];
    for (let i = 0; i <= conversation.groups[conversation.currentGroupIndex].count; i++) {
      const extraCount = conversation.groups[conversation.currentGroupIndex].count - i;
      if (extraCount === conversation.groups[conversation.currentGroupIndex].count) {
        options.push(`1. Todos con proteína adicional (${extraCount})`);
      } else if (extraCount === 0) {
        options.push(`${i + 1}. Ninguno con proteína adicional`);
      } else {
        options.push(`${i + 1}. ${extraCount} con proteína adicional + ${i} normal${i === 1 ? "" : "es"}`);
      }
    }
    return {
      main: `🍗 ¿Para cuántos de estos ${conversation.groups[conversation.currentGroupIndex].count} almuerzos quieres proteína adicional?  
${options.join("\n")}`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "defining_group_extra_protein";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🍗 ¿Quieres proteína adicional por $5,000? (sí/no)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  const num = parseInt(lowercaseMessage);
  const maxCount = conversation.groups[conversation.currentGroupIndex].count;
  if (!isNaN(num) && num >= 1 && num <= maxCount + 1) {
    const extraCount = maxCount - (num - 1);
    conversation.groups[conversation.currentGroupIndex].extraProteinCount = extraCount;
    if (extraCount === 0) {
      conversation.step = "defining_group_drink";
      return {
        main: `✅ ¡Perfecto! Ninguno con proteína adicional. Ahora:  
🥤 ¿Qué bebida quieres?  
1. Limonada de panela  
2. Jugo - Natural del día`,
        secondary: getSecondaryMessage(conversation.step)
      };
    }
    conversation.step = "defining_group_extra_protein_type";
    return {
      main: `✅ ¡Genial! ${extraCount} con proteína adicional.  
🍗 ¿Qué proteína adicional quieres? (Ej: "res", "pollo")`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Usa un número de 1 a ${maxCount + 1}.`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleDefiningGroupExtraProteinType(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `🍗 Para los ${conversation.groups[conversation.currentGroupIndex].extraProteinCount} almuerzos con proteína adicional:  
Dime qué proteína quieres (ej: "res", "pollo").`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "defining_group_extra_protein_count";
    const options = [];
    for (let i = 0; i <= conversation.groups[conversation.currentGroupIndex].count; i++) {
      const extraCount = conversation.groups[conversation.currentGroupIndex].count - i;
      if (extraCount === conversation.groups[conversation.currentGroupIndex].count) {
        options.push(`1. Todos con proteína adicional (${extraCount})`);
      } else if (extraCount === 0) {
        options.push(`${i + 1}. Ninguno con proteína adicional`);
      } else {
        options.push(`${i + 1}. ${extraCount} con proteína adicional + ${i} normal${i === 1 ? "" : "es"}`);
      }
    }
    return {
      main: `✅ ¡Perfecto! ¿Para cuántos de estos ${conversation.groups[conversation.currentGroupIndex].count} almuerzos quieres proteína adicional?  
${options.join("\n")}`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  const { isValid, value } = validateAndMatchField("protein", message);
  if (isValid) {
    conversation.groups[conversation.currentGroupIndex].extraProteinType = value;
    conversation.step = "defining_group_drink";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🥤 ¿Qué bebida quieres?  
1. Limonada de panela  
2. Jugo - Natural del día`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Dime una proteína (ej: "res", "pollo").`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleDefiningGroupDrink(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `🥤 Para este grupo de ${conversation.groups[conversation.currentGroupIndex].count} almuerzos:  
Elige una bebida:  
1. Limonada de panela  
2. Jugo - Natural del día`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = conversation.groups[conversation.currentGroupIndex].extraProteinCount > 0 ? "defining_group_extra_protein_type" : "defining_group_extra_protein";
    if (conversation.step === "defining_group_extra_protein_type") {
      return {
        main: `✅ ¡Genial! ${conversation.groups[conversation.currentGroupIndex].extraProteinCount} con proteína adicional.  
🍗 ¿Qué proteína adicional quieres? (Ej: "res", "pollo")`,
        secondary: getSecondaryMessage(conversation.step)
      };
    }
    return {
      main: `✅ ¡Perfecto! Ahora:  
🍗 ¿Quieres proteína adicional por $5,000? (sí/no)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  let drinkValue;
  if (["1", "limonada", "limonada de panela"].includes(lowercaseMessage)) drinkValue = "limonada de panela";
  else if (["2", "jugo", "jugo natural", "natural", "jugo del dia", "jugo del día"].includes(lowercaseMessage)) drinkValue = "jugo - natural del día";
  if (drinkValue) {
    conversation.groups[conversation.currentGroupIndex].drink = drinkValue;
    conversation.step = "defining_group_salad_rice";
    return {
      main: `✅ ¡Perfecto! Para estos ${conversation.groups[conversation.currentGroupIndex].count}:  
🥗🍚 ¿Cómo quieres este grupo?  
1️⃣ Con ensalada y arroz (por defecto)  
2️⃣ Sin ensalada, con arroz  
3️⃣ Con ensalada, sin arroz  
4️⃣ Sin ensalada y sin arroz  
Responde con el número.`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Elige:  
1. Limonada de panela  
2. Jugo - Natural del día`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleDefiningGroupSaladRice(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `🥗🍚 ¿Cómo quieres este grupo de ${conversation.groups[conversation.currentGroupIndex].count} almuerzos?  
1️⃣ Con ensalada y arroz (por defecto)  
2️⃣ Sin ensalada, con arroz  
3️⃣ Con ensalada, sin arroz  
4️⃣ Sin ensalada y sin arroz  
Responde con el número (ej: "1").`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "defining_group_drink";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🥤 ¿Qué bebida quieres?  
1. Limonada de panela  
2. Jugo - Natural del día`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  const num = parseInt(lowercaseMessage);
  let saladRicePreference = { salad: true, rice: true }; // Por defecto
  if (!isNaN(num) && num >= 1 && num <= 4) {
    saladRicePreference = num === 1 ? { salad: true, rice: true } :
                         num === 2 ? { salad: false, rice: true } :
                         num === 3 ? { salad: true, rice: false } :
                         { salad: false, rice: false };
  }
  const groupConfigNormal = {
    soup: conversation.groups[conversation.currentGroupIndex].soup || "sin sopa",
    principle: conversation.groups[conversation.currentGroupIndex].principle || "ninguno",
    protein: conversation.groups[conversation.currentGroupIndex].protein || "ninguna",
    drink: conversation.groups[conversation.currentGroupIndex].drink,
    extraProtein: false,
    extraProteinType: null,
    salad: saladRicePreference.salad,
    rice: saladRicePreference.rice
  };
  const groupConfigExtra = {
    ...groupConfigNormal,
    extraProtein: true,
    extraProteinType: conversation.groups[conversation.currentGroupIndex].extraProteinType || null
  };
  const extraCount = conversation.groups[conversation.currentGroupIndex].extraProteinCount || 0;
  const normalCount = conversation.groups[conversation.currentGroupIndex].count - extraCount;
  for (let i = 0; i < normalCount; i++) {
    conversation.lunches.push({ ...groupConfigNormal });
  }
  for (let i = 0; i < extraCount; i++) {
    conversation.lunches.push({ ...groupConfigExtra });
  }
  conversation.remainingCount -= conversation.groups[conversation.currentGroupIndex].count;
  conversation.currentGroupIndex++;
  if (conversation.remainingCount > 1) {
    conversation.step = "defining_remaining";
    const remainingOptions = [];
    for (let i = 0; i < conversation.remainingCount; i++) {
      const equalCount = conversation.remainingCount - i;
      if (equalCount === conversation.remainingCount) remainingOptions.push(`1. Todos iguales (${conversation.remainingCount})`);
      else if (equalCount === 1) remainingOptions.push(`${i + 1}. Todos diferentes`);
      else remainingOptions.push(`${i + 1}. ${equalCount} iguales + ${i} diferente${i === 1 ? "" : "s"}`);
    }
    return {
      main: `✅ ¡Perfecto! Ya definimos ${conversation.lunches.length} almuerzos.  
¿Cómo organizamos los ${conversation.remainingCount} faltantes?  
${remainingOptions.join("\n")}`,
      secondary: getSecondaryMessage(conversation.step)
    };
  } else if (conversation.remainingCount === 1) {
    conversation.step = "defining_single_lunch_soup";
    return {
      main: `✅ ¡Genial! Ya definimos ${conversation.lunches.length} almuerzos.  
Para el último:  
🥣 ¿Sancocho de pescado, sopa del día o cambiar la sopa por?  
1. Huevo - frito  
2. Papa a la francesa  
3. Solo bandeja ($12.000)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  } else {
    conversation.step = "ordering_time";
    return {
      main: `✅ ¡Listo!  
⏰ ¿A qué hora quieres tu pedido? (Ej: "1 pm", "ahora")`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
}

export function handleDefiningRemaining(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    const remainingOptions = [];
    for (let i = 0; i < conversation.remainingCount; i++) {
      const equalCount = conversation.remainingCount - i;
      if (equalCount === conversation.remainingCount) remainingOptions.push(`1. Todos iguales (${conversation.remainingCount})`);
      else if (equalCount === 1) remainingOptions.push(`${i + 1}. Todos diferentes`);
      else remainingOptions.push(`${i + 1}. ${equalCount} iguales + ${i} diferente${i === 1 ? "" : "s"}`);
    }
    return {
      main: `🍽️ ¿Cómo organizamos los ${conversation.remainingCount} almuerzos faltantes?  
${remainingOptions.join("\n")}`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "defining_group_salad_rice";
    conversation.remainingCount += conversation.groups[--conversation.currentGroupIndex].count;
    conversation.lunches.splice(-conversation.groups[conversation.currentGroupIndex].count);
    return {
      main: `✅ ¡Perfecto! Para estos ${conversation.groups[conversation.currentGroupIndex].count}:  
🥗🍚 ¿Cómo quieres este grupo?  
1️⃣ Con ensalada y arroz (por defecto)  
2️⃣ Sin ensalada, con arroz  
3️⃣ Con ensalada, sin arroz  
4️⃣ Sin ensalada y sin arroz  
Responde con el número.`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  const num = parseInt(lowercaseMessage);
  if (!isNaN(num) && num >= 1 && num <= conversation.remainingCount) {
    const equalCount = conversation.remainingCount - (num - 1);
    if (equalCount === conversation.remainingCount) {
      conversation.groups[conversation.currentGroupIndex] = { count: equalCount };
      conversation.step = "defining_group_soup";
    } else if (equalCount === 1) {
      conversation.step = "defining_different_soup";
    } else {
      conversation.groups[conversation.currentGroupIndex] = { count: equalCount };
      conversation.step = "defining_group_soup";
    }
    return {
      main: equalCount === 1
        ? `✅ Serán diferentes.  
Definamos el almuerzo ${conversation.currentLunchIndex + 1}:  
🥣 ¿Sancocho de pescado, sopa del día o cambiar la sopa por?  
1. Huevo - frito  
2. Papa a la francesa  
3. Solo bandeja ($12.000)`
        : `✅ ${equalCount} almuerzos iguales.  
Para estos ${equalCount}:  
🥣 ¿Sancocho de pescado, sopa del día o cambiar la sopa por?  
1. Huevo - frito  
2. Papa a la francesa  
3. Solo bandeja ($12.000)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Usa un número de 1 a ${conversation.remainingCount}. Ejemplo: "1" para todos iguales.`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleDefiningDifferentSoup(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `🥣 Para el almuerzo ${conversation.currentLunchIndex + 1}:  
Dime qué quieres de sopa: "Sancocho de pescado", "sopa del día", o cambiar la sopa por:  
1. Huevo - frito  
2. Papa a la francesa  
3. Solo bandeja ($12.000)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "defining_remaining";
    const remainingOptions = [];
    for (let i = 0; i < conversation.remainingCount; i++) {
      const equalCount = conversation.remainingCount - i;
      if (equalCount === conversation.remainingCount) remainingOptions.push(`1. Todos iguales (${conversation.remainingCount})`);
      else if (equalCount === 1) remainingOptions.push(`${i + 1}. Todos diferentes`);
      else remainingOptions.push(`${i + 1}. ${equalCount} iguales + ${i} diferente${i === 1 ? "" : "s"}`);
    }
    return {
      main: `✅ ¡Perfecto! Ya definimos ${conversation.lunches.length} almuerzos.  
¿Cómo organizamos los ${conversation.remainingCount} faltantes?  
${remainingOptions.join("\n")}`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  let soupValue;
  if (["1", "huevo", "huevo frito"].includes(lowercaseMessage)) soupValue = "huevo - frito";
  else if (["2", "papa", "papas", "papa a la francesa"].includes(lowercaseMessage)) soupValue = "papa a la francesa";
  else if (["3", "solo bandeja", "bandeja"].includes(lowercaseMessage)) soupValue = "solo bandeja";
  else if (["sancocho", "sancocho de pescado"].includes(lowercaseMessage)) soupValue = "sancocho de pescado";
  else if (["sopa", "sopa del dia", "sopa del día"].includes(lowercaseMessage)) soupValue = "sopa del día";
  else soupValue = lowercaseMessage === "sin sopa" ? "sin sopa" : null;

  if (soupValue) {
    conversation.currentLunch = { soup: soupValue };
    conversation.step = "defining_different_principle";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🥗 ¿Qué principio quieres? (Ej: "frijol" o "sin principio")`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Usa "sancocho", "sopa", o:  
1. Huevo - frito  
2. Papa a la francesa  
3. Solo bandeja ($12.000)`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleDefiningDifferentPrinciple(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `🥗 Para el almuerzo ${conversation.currentLunchIndex + 1}:  
Dime qué principio quieres (ej: "frijol", "arveja") o "sin principio" si no quieres.`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "defining_different_soup";
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
  const { isValid, value } = validateAndMatchField("principle", message);
  if (isValid || lowercaseMessage === "sin principio" || lowercaseMessage === "ninguno") {
    conversation.currentLunch.principle = lowercaseMessage === "sin principio" || lowercaseMessage === "ninguno" ? "ninguno" : value;
    conversation.step = "defining_different_protein";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🍗 ¿Qué proteína quieres? (O escribe 'ninguna' si no deseas proteína adicional)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Dime un principio (ej: "frijol") o "sin principio".`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleDefiningDifferentProtein(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `🍗 Para el almuerzo ${conversation.currentLunchIndex + 1}:  
Dime qué proteína quieres (ej: "pollo", "res") o "ninguna" si no deseas.`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "defining_different_principle";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🥗 ¿Qué principio quieres? (Ej: "frijol" o "sin principio")`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  const { isValid, value } = validateAndMatchField("protein", message);
  if (isValid || lowercaseMessage === "ninguna") {
    conversation.currentLunch.protein = lowercaseMessage === "ninguna" ? "ninguna" : value;
    conversation.step = "defining_different_extra_protein";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🍗 ¿Quieres proteína adicional por $5,000? (sí/no)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Dime una proteína (ej: "pollo") o "ninguna".`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleDefiningDifferentExtraProtein(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `🍗 ¿Quieres agregar proteína adicional por $5,000 al almuerzo ${conversation.currentLunchIndex + 1}?  
Responde "sí" o "no".`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "defining_different_protein";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🍗 ¿Qué proteína quieres? (O escribe 'ninguna' si no deseas proteína adicional)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "sí" || lowercaseMessage === "si") {
    conversation.step = "defining_different_extra_protein_type";
    return {
      main: `✅ ¡Perfecto!  
🍗 ¿Qué proteína adicional quieres? (Ej: "res", "pollo")`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "no") {
    conversation.currentLunch.extraProtein = false;
    conversation.currentLunch.extraProteinType = null;
    conversation.step = "defining_different_drink";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🥤 ¿Qué bebida quieres?  
1. Limonada de panela  
2. Jugo - Natural del día`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Responde "sí" o "no".`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleDefiningDifferentExtraProteinType(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `🍗 Para el almuerzo ${conversation.currentLunchIndex + 1}:  
Dime qué proteína adicional quieres (ej: "res", "pollo").`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "defining_different_extra_protein";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🍗 ¿Quieres proteína adicional por $5,000? (sí/no)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  const { isValid, value } = validateAndMatchField("protein", message);
  if (isValid) {
    conversation.currentLunch.extraProtein = true;
    conversation.currentLunch.extraProteinType = value;
    conversation.step = "defining_different_drink";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🥤 ¿Qué bebida quieres?  
1. Limonada de panela  
2. Jugo - Natural del día`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Dime una proteína (ej: "res", "pollo").`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleDefiningDifferentDrink(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `🥤 Para el almuerzo ${conversation.currentLunchIndex + 1}:  
Elige una bebida:  
1. Limonada de panela  
2. Jugo - Natural del día`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = conversation.currentLunch.extraProtein ? "defining_different_extra_protein_type" : "defining_different_extra_protein";
    if (conversation.step === "defining_different_extra_protein_type") {
      return {
        main: `✅ ¡Perfecto!  
🍗 ¿Qué proteína adicional quieres? (Ej: "res", "pollo")`,
        secondary: getSecondaryMessage(conversation.step)
      };
    }
    return {
      main: `✅ ¡Perfecto! Ahora:  
🍗 ¿Quieres proteína adicional por $5,000? (sí/no)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  let drinkValue;
  if (["1", "limonada", "limonada de panela"].includes(lowercaseMessage)) drinkValue = "limonada de panela";
  else if (["2", "jugo", "jugo natural", "natural", "jugo del dia", "jugo del día"].includes(lowercaseMessage)) drinkValue = "jugo - natural del día";
  if (drinkValue) {
    conversation.currentLunch.drink = drinkValue;
    conversation.step = "defining_different_salad_rice";
    return {
      main: `✅ ¡Perfecto! Para este almuerzo ${conversation.currentLunchIndex + 1}:  
🥗🍚 ¿Cómo lo quieres?  
1️⃣ Con ensalada y arroz (por defecto)  
2️⃣ Sin ensalada, con arroz  
3️⃣ Con ensalada, sin arroz  
4️⃣ Sin ensalada y sin arroz  
Responde con el número.`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Elige:  
1. Limonada de panela  
2. Jugo - Natural del día`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleDefiningDifferentSaladRice(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `🥗🍚 ¿Cómo quieres este almuerzo ${conversation.currentLunchIndex + 1}?  
1️⃣ Con ensalada y arroz (por defecto)  
2️⃣ Sin ensalada, con arroz  
3️⃣ Con ensalada, sin arroz  
4️⃣ Sin ensalada y sin arroz  
Responde con el número (ej: "1").`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "defining_different_drink";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🥤 ¿Qué bebida quieres?  
1. Limonada de panela  
2. Jugo - Natural del día`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  const num = parseInt(lowercaseMessage);
  let saladRicePreference = { salad: true, rice: true }; // Por defecto
  if (!isNaN(num) && num >= 1 && num <= 4) {
    saladRicePreference = num === 1 ? { salad: true, rice: true } :
                         num === 2 ? { salad: false, rice: true } :
                         num === 3 ? { salad: true, rice: false } :
                         { salad: false, rice: false };
  }
  conversation.currentLunch.salad = saladRicePreference.salad;
  conversation.currentLunch.rice = saladRicePreference.rice;
  conversation.lunches.push({ ...conversation.currentLunch });
  conversation.remainingCount--;
  conversation.currentLunchIndex++;
  if (conversation.remainingCount > 1) {
    conversation.step = "defining_different_soup";
    return {
      main: `✅ Serán diferentes.  
Definamos el almuerzo ${conversation.currentLunchIndex + 1}:  
🥣 ¿Sancocho de pescado, sopa del día o cambiar la sopa por?  
1. Huevo - frito  
2. Papa a la francesa  
3. Solo bandeja ($12.000)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  } else if (conversation.remainingCount === 1) {
    conversation.step = "defining_single_lunch_soup";
    return {
      main: `✅ ¡Genial! Ya definimos ${conversation.lunches.length} almuerzos.  
Para el último:  
🥣 ¿Sancocho de pescado, sopa del día o cambiar la sopa por?  
1. Huevo - frito  
2. Papa a la francesa  
3. Solo bandeja ($12.000)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  } else {
    conversation.step = "ordering_time";
    return {
      main: `✅ ¡Listo!  
⏰ ¿A qué hora quieres tu pedido? (Ej: "1 pm", "ahora")`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
}

export function handleDefiningSingleLunchSoup(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `🥣 Para el último almuerzo:  
Dime qué quieres de sopa: "Sancocho de pescado", "sopa del día", o cambiar la sopa por:  
1. Huevo - frito  
2. Papa a la francesa  
3. Solo bandeja ($12.000)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = conversation.lunches.length > 0 ? "defining_remaining" : "defining_group_salad_rice";
    if (conversation.step === "defining_remaining") {
      const remainingOptions = [];
      for (let i = 0; i < conversation.remainingCount; i++) {
        const equalCount = conversation.remainingCount - i;
        if (equalCount === conversation.remainingCount) remainingOptions.push(`1. Todos iguales (${conversation.remainingCount})`);
        else if (equalCount === 1) remainingOptions.push(`${i + 1}. Todos diferentes`);
        else remainingOptions.push(`${i + 1}. ${equalCount} iguales + ${i} diferente${i === 1 ? "" : "s"}`);
      }
      return {
        main: `✅ ¡Perfecto! Ya definimos ${conversation.lunches.length} almuerzos.  
¿Cómo organizamos los ${conversation.remainingCount} faltantes?  
${remainingOptions.join("\n")}`,
        secondary: getSecondaryMessage(conversation.step)
      };
    }
    conversation.remainingCount += conversation.groups[--conversation.currentGroupIndex].count;
    conversation.lunches.splice(-conversation.groups[conversation.currentGroupIndex].count);
    return {
      main: `✅ ¡Perfecto! Para estos ${conversation.groups[conversation.currentGroupIndex].count}:  
🥗🍚 ¿Cómo quieres este grupo?  
1️⃣ Con ensalada y arroz (por defecto)  
2️⃣ Sin ensalada, con arroz  
3️⃣ Con ensalada, sin arroz  
4️⃣ Sin ensalada y sin arroz  
Responde con el número.`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  let soupValue;
  if (["1", "huevo", "huevo frito"].includes(lowercaseMessage)) soupValue = "huevo - frito";
  else if (["2", "papa", "papas", "papa a la francesa"].includes(lowercaseMessage)) soupValue = "papa a la francesa";
  else if (["3", "solo bandeja", "bandeja"].includes(lowercaseMessage)) soupValue = "solo bandeja";
  else if (["sancocho", "sancocho de pescado"].includes(lowercaseMessage)) soupValue = "sancocho de pescado";
  else if (["sopa", "sopa del dia", "sopa del día"].includes(lowercaseMessage)) soupValue = "sopa del día";
  else soupValue = lowercaseMessage === "sin sopa" ? "sin sopa" : null;

  if (soupValue) {
    conversation.currentLunch = { soup: soupValue };
    conversation.step = "defining_single_lunch_principle";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🥗 ¿Qué principio quieres? (Ej: "frijol" o "sin principio")`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Usa "sancocho", "sopa", o:  
1. Huevo - frito  
2. Papa a la francesa  
3. Solo bandeja ($12.000)`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleDefiningSingleLunchPrinciple(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `🥗 Para el último almuerzo:  
Dime qué principio quieres (ej: "frijol", "arveja") o "sin principio" si no quieres.`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "defining_single_lunch_soup";
    return {
      main: `✅ ¡Genial! Ya definimos ${conversation.lunches.length} almuerzos.  
Para el último:  
🥣 ¿Sancocho de pescado, sopa del día o cambiar la sopa por?  
1. Huevo - frito  
2. Papa a la francesa  
3. Solo bandeja ($12.000)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  const { isValid, value } = validateAndMatchField("principle", message);
  if (isValid || lowercaseMessage === "sin principio" || lowercaseMessage === "ninguno") {
    conversation.currentLunch.principle = lowercaseMessage === "sin principio" || lowercaseMessage === "ninguno" ? "ninguno" : value;
    conversation.step = "defining_single_lunch_protein";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🍗 ¿Qué proteína quieres? (O escribe 'ninguna' si no deseas proteína adicional)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Dime un principio (ej: "frijol") o "sin principio".`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleDefiningSingleLunchProtein(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `🍗 Para el último almuerzo:  
Dime qué proteína quieres (ej: "pollo", "res") o "ninguna" si no deseas.`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "defining_single_lunch_principle";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🥗 ¿Qué principio quieres? (Ej: "frijol" o "sin principio")`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  const { isValid, value } = validateAndMatchField("protein", message);
  if (isValid || lowercaseMessage === "ninguna") {
    conversation.currentLunch.protein = lowercaseMessage === "ninguna" ? "ninguna" : value;
    conversation.step = "defining_single_lunch_extra_protein";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🍗 ¿Quieres proteína adicional por $5,000? (sí/no)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Dime una proteína (ej: "pollo") o "ninguna".`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleDefiningSingleLunchExtraProtein(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `🍗 ¿Quieres agregar proteína adicional por $5,000 al último almuerzo?  
Responde "sí" o "no".`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "defining_single_lunch_protein";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🍗 ¿Qué proteína quieres? (O escribe 'ninguna' si no deseas proteína adicional)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "sí" || lowercaseMessage === "si") {
    conversation.step = "defining_single_lunch_extra_protein_type";
    return {
      main: `✅ ¡Perfecto!  
🍗 ¿Qué proteína adicional quieres? (Ej: "res", "pollo")`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "no") {
    conversation.currentLunch.extraProtein = false;
    conversation.currentLunch.extraProteinType = null;
    conversation.step = "defining_single_lunch_drink";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🥤 ¿Qué bebida quieres?  
1. Limonada de panela  
2. Jugo - Natural del día`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Responde "sí" o "no".`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleDefiningSingleLunchExtraProteinType(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `🍗 Para el último almuerzo:  
Dime qué proteína adicional quieres (ej: "res", "pollo").`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "defining_single_lunch_extra_protein";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🍗 ¿Quieres proteína adicional por $5,000? (sí/no)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  const { isValid, value } = validateAndMatchField("protein", message);
  if (isValid) {
    conversation.currentLunch.extraProtein = true;
    conversation.currentLunch.extraProteinType = value;
    conversation.step = "defining_single_lunch_drink";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🥤 ¿Qué bebida quieres?  
1. Limonada de panela  
2. Jugo - Natural del día`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Dime una proteína (ej: "res", "pollo").`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleDefiningSingleLunchDrink(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `🥤 Para el último almuerzo:  
Elige una bebida:  
1. Limonada de panela  
2. Jugo - Natural del día`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = conversation.currentLunch.extraProtein ? "defining_single_lunch_extra_protein_type" : "defining_single_lunch_extra_protein";
    if (conversation.step === "defining_single_lunch_extra_protein_type") {
      return {
        main: `✅ ¡Perfecto!  
🍗 ¿Qué proteína adicional quieres? (Ej: "res", "pollo")`,
        secondary: getSecondaryMessage(conversation.step)
      };
    }
    return {
      main: `✅ ¡Perfecto! Ahora:  
🍗 ¿Quieres proteína adicional por $5,000? (sí/no)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  let drinkValue;
  if (["1", "limonada", "limonada de panela"].includes(lowercaseMessage)) drinkValue = "limonada de panela";
  else if (["2", "jugo", "jugo natural", "natural", "jugo del dia", "jugo del día"].includes(lowercaseMessage)) drinkValue = "jugo - natural del día";
  if (drinkValue) {
    conversation.currentLunch.drink = drinkValue;
    conversation.step = "defining_single_lunch_salad_rice";
    return {
      main: `✅ ¡Perfecto! Para este último almuerzo:  
🥗🍚 ¿Cómo lo quieres?  
1️⃣ Con ensalada y arroz (por defecto)  
2️⃣ Sin ensalada, con arroz  
3️⃣ Con ensalada, sin arroz  
4️⃣ Sin ensalada y sin arroz  
Responde con el número.`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Elige:  
1. Limonada de panela  
2. Jugo - Natural del día`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleDefiningSingleLunchSaladRice(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `🥗🍚 ¿Cómo quieres este último almuerzo?  
1️⃣ Con ensalada y arroz (por defecto)  
2️⃣ Sin ensalada, con arroz  
3️⃣ Con ensalada, sin arroz  
4️⃣ Sin ensalada y sin arroz  
Responde con el número (ej: "1").`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "defining_single_lunch_drink";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🥤 ¿Qué bebida quieres?  
1. Limonada de panela  
2. Jugo - Natural del día`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  const num = parseInt(lowercaseMessage);
  let saladRicePreference = { salad: true, rice: true }; // Por defecto
  if (!isNaN(num) && num >= 1 && num <= 4) {
    saladRicePreference = num === 1 ? { salad: true, rice: true } :
                         num === 2 ? { salad: false, rice: true } :
                         num === 3 ? { salad: true, rice: false } :
                         { salad: false, rice: false };
  }
  conversation.currentLunch.salad = saladRicePreference.salad;
  conversation.currentLunch.rice = saladRicePreference.rice;
  conversation.lunches.push({ ...conversation.currentLunch });
  conversation.remainingCount--;
  conversation.step = "ordering_time";
  return {
    main: `✅ ¡Listo!  
⏰ ¿A qué hora quieres tu pedido? (Ej: "1 pm", "ahora")`,
    secondary: getSecondaryMessage(conversation.step)
  };
}