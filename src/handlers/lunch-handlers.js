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

    if (num === 1) {
      conversation.step = "defining_single_lunch_soup";
      return {
        main: `✅ ¡Entendido! 1 almuerzo.  
🥣 ¿Sancocho de pescado, sopa del día o cambiar la sopa por?  
1️⃣ Huevo - frito  
2️⃣ Papa a la francesa  
3️⃣ Solo bandeja ($12.000)`,
        secondary: getSecondaryMessage(conversation.step)
      };
    }

    conversation.step = "defining_lunch_groups";
    const groupOptions = [];
    const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    for (let i = 0; i < num; i++) {
      const equalCount = num - i;
      if (equalCount === num) groupOptions.push(`${numberEmojis[0]} Todos iguales (${num})`);
      else if (equalCount === 1) groupOptions.push(`${numberEmojis[i]} Todos diferentes`);
      else groupOptions.push(`${numberEmojis[i]} ${equalCount} iguales + ${i} diferente${i === 1 ? "" : "s"}`);
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
    const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    for (let i = 0; i < conversation.orderCount; i++) {
      const equalCount = conversation.orderCount - i;
      if (equalCount === conversation.orderCount) groupOptions.push(`${numberEmojis[0]} Todos iguales (${conversation.orderCount})`);
      else if (equalCount === 1) groupOptions.push(`${numberEmojis[i]} Todos diferentes`);
      else groupOptions.push(`${numberEmojis[i]} ${equalCount} iguales + ${i} diferente${i === 1 ? "" : "s"}`);
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
  const num = parseInt(lowercaseMessage) - 1; // Ajustamos a índice base 0
  if (!isNaN(num) && num >= 0 && num < conversation.orderCount) {
    const equalCount = conversation.orderCount - num;
    if (equalCount === 1) { // Todos diferentes
      conversation.step = "defining_different_soup";
      return {
        main: `✅ Serán todos diferentes.  
Definamos el almuerzo ${conversation.currentLunchIndex + 1}:  
🥣 ¿Sancocho de pescado, sopa del día o cambiar la sopa por?  
1️⃣ Huevo - frito  
2️⃣ Papa a la francesa  
3️⃣ Solo bandeja ($12.000)`,
        secondary: getSecondaryMessage(conversation.step)
      };
    } else { // Algunos o todos iguales
      conversation.groups.push({ count: equalCount });
      conversation.step = "defining_group_soup";
      return {
        main: `✅ ${equalCount} almuerzos iguales.  
Para estos ${equalCount}:  
🥣 ¿Sancocho de pescado, sopa del día o cambiar la sopa por?  
1️⃣ Huevo - frito  
2️⃣ Papa a la francesa  
3️⃣ Solo bandeja ($12.000)`,
        secondary: getSecondaryMessage(conversation.step)
      };
    }
  }
  const groupOptions = [];
  const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
  for (let i = 0; i < conversation.orderCount; i++) {
    const equalCount = conversation.orderCount - i;
    if (equalCount === conversation.orderCount) groupOptions.push(`${numberEmojis[0]} Todos iguales (${conversation.orderCount})`);
    else if (equalCount === 1) groupOptions.push(`${numberEmojis[i]} Todos diferentes`);
    else groupOptions.push(`${numberEmojis[i]} ${equalCount} iguales + ${i} diferente${i === 1 ? "" : "s"}`);
  }
  return {
    main: `❌ No entendí. Usa un número de 1 a ${conversation.orderCount}.  
${groupOptions.join("\n")}`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleDefiningGroupSoup(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `🥣 Para este grupo de ${conversation.groups[conversation.currentGroupIndex].count} almuerzos:  
Dime qué quieres de sopa: "Sancocho de pescado", "sopa del día", o cambiar la sopa por:  
1️⃣ Huevo - frito  
2️⃣ Papa a la francesa  
3️⃣ Solo bandeja ($12.000)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "defining_lunch_groups";
    conversation.groups = [];
    const groupOptions = [];
    const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    for (let i = 0; i < conversation.orderCount; i++) {
      const equalCount = conversation.orderCount - i;
      if (equalCount === conversation.orderCount) groupOptions.push(`${numberEmojis[0]} Todos iguales (${conversation.orderCount})`);
      else if (equalCount === 1) groupOptions.push(`${numberEmojis[i]} Todos diferentes`);
      else groupOptions.push(`${numberEmojis[i]} ${equalCount} iguales + ${i} diferente${i === 1 ? "" : "s"}`);
    }
    return {
      main: `✅ ¡Genial! ${conversation.orderCount} almuerzos.  
¿Cómo los organizamos?  
${groupOptions.join("\n")}`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  const { isValid, value } = validateAndMatchField("soup", message);
  if (isValid) {
    if (!conversation.groups[conversation.currentGroupIndex]) {
      conversation.groups[conversation.currentGroupIndex] = { count: conversation.remainingCount };
    }
    conversation.groups[conversation.currentGroupIndex].soup = value;
    conversation.step = "defining_group_principle";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🥗 ¿Qué principio quieres? (Ej: "frijol" o "sin principio")`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Usa "sancocho", "sopa", o:  
1️⃣ Huevo - frito  
2️⃣ Papa a la francesa  
3️⃣ Solo bandeja ($12.000)`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleDefiningGroupPrinciple(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();

  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "defining_group_soup";
    return {
      main: `✅ Para estos ${conversation.orderCount} almuerzos:  
🥣 ¿Sancocho de pescado, sopa del día o cambiar la sopa por?  
1️⃣ Huevo - frito  
2️⃣ Papa a la francesa  
3️⃣ Solo bandeja ($12.000)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }

  if (lowercaseMessage === "sin principio" || lowercaseMessage === "ninguno") {
    conversation.currentLunch.principle = "ninguno";
    conversation.step = "defining_group_principle_replacement";
    return {
      main: `✅ Sin principio. ¿Qué prefieres de reemplazo?  
1️⃣ Huevo frito  
2️⃣ Papa a la francesa  
3️⃣ Doble porción de arroz  
4️⃣ Más ensalada`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }

  const { isValid, value } = validateAndMatchField("principle", message);
  if (isValid) {
    conversation.currentLunch.principle = value;
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

export function handleDefiningGroupPrincipleReplacement(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `🥗 Para este grupo de ${conversation.groups[conversation.currentGroupIndex].count} almuerzos sin principio:  
Elige un reemplazo:  
1️⃣ Huevo frito  
2️⃣ Papa a la francesa`,
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
  const { isValid, value } = validateAndMatchField("principleReplacement", message);
  if (isValid) {
    conversation.groups[conversation.currentGroupIndex].principleReplacement = value;
    conversation.step = "defining_group_protein";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🍗 ¿Qué proteína quieres? (O escribe 'ninguna' si no deseas proteína adicional)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Elige:  
1️⃣ Huevo frito  
2️⃣ Papa a la francesa`,
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
    conversation.step = conversation.groups[conversation.currentGroupIndex].principle === "ninguno" ? "defining_group_principle_replacement" : "defining_group_principle";
    if (conversation.step === "defining_group_principle_replacement") {
      return {
        main: `✅ Sin principio. ¿Qué prefieres de reemplazo?  
1️⃣ Huevo frito  
2️⃣ Papa a la francesa`,
        secondary: getSecondaryMessage(conversation.step)
      };
    }
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
  if (["sí", "si"].includes(lowercaseMessage)) {
    conversation.step = "defining_group_extra_protein_count";
    const options = [];
    const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    const groupCount = conversation.groups[conversation.currentGroupIndex].count;
    for (let i = 0; i <= groupCount; i++) {
      const extraCount = groupCount - i;
      if (extraCount === groupCount) options.push(`${numberEmojis[0]} Todos con proteína adicional (${extraCount})`);
      else if (extraCount === 0) options.push(`${numberEmojis[i]} Ninguno con proteína adicional`);
      else options.push(`${numberEmojis[i]} ${extraCount} con proteína adicional + ${i} normal${i === 1 ? "" : "es"}`);
    }
    return {
      main: `✅ ¡Perfecto! ¿Para cuántos de estos ${groupCount} almuerzos quieres proteína adicional?  
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
1️⃣ Limonada de panela  
2️⃣ Jugo - Natural del día`,
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
    const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    const groupCount = conversation.groups[conversation.currentGroupIndex].count;
    for (let i = 0; i <= groupCount; i++) {
      const extraCount = groupCount - i;
      if (extraCount === groupCount) options.push(`${numberEmojis[0]} Todos con proteína adicional (${extraCount})`);
      else if (extraCount === 0) options.push(`${numberEmojis[i]} Ninguno con proteína adicional`);
      else options.push(`${numberEmojis[i]} ${extraCount} con proteína adicional + ${i} normal${i === 1 ? "" : "es"}`);
    }
    return {
      main: `🍗 ¿Para cuántos de estos ${groupCount} almuerzos quieres proteína adicional?  
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
  const num = parseInt(lowercaseMessage) - 1; // Ajustamos a índice base 0
  const maxCount = conversation.groups[conversation.currentGroupIndex].count;
  if (!isNaN(num) && num >= 0 && num <= maxCount) {
    const extraCount = maxCount - num;
    conversation.groups[conversation.currentGroupIndex].extraProteinCount = extraCount;
    if (extraCount === 0) {
      conversation.step = "defining_group_drink";
      return {
        main: `✅ ¡Perfecto! Ninguno con proteína adicional. Ahora:  
🥤 ¿Qué bebida quieres?  
1️⃣ Limonada de panela  
2️⃣ Jugo - Natural del día`,
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
  const options = [];
  const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
  for (let i = 0; i <= maxCount; i++) {
    const extraCount = maxCount - i;
    if (extraCount === maxCount) options.push(`${numberEmojis[0]} Todos con proteína adicional (${extraCount})`);
    else if (extraCount === 0) options.push(`${numberEmojis[i]} Ninguno con proteína adicional`);
    else options.push(`${numberEmojis[i]} ${extraCount} con proteína adicional + ${i} normal${i === 1 ? "" : "es"}`);
  }
  return {
    main: `❌ No entendí. Usa un número de 1 a ${maxCount + 1}.  
${options.join("\n")}`,
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
    const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    const groupCount = conversation.groups[conversation.currentGroupIndex].count;
    for (let i = 0; i <= groupCount; i++) {
      const extraCount = groupCount - i;
      if (extraCount === groupCount) options.push(`${numberEmojis[0]} Todos con proteína adicional (${extraCount})`);
      else if (extraCount === 0) options.push(`${numberEmojis[i]} Ninguno con proteína adicional`);
      else options.push(`${numberEmojis[i]} ${extraCount} con proteína adicional + ${i} normal${i === 1 ? "" : "es"}`);
    }
    return {
      main: `✅ ¡Perfecto! ¿Para cuántos de estos ${groupCount} almuerzos quieres proteína adicional?  
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
1️⃣ Limonada de panela  
2️⃣ Jugo - Natural del día`,
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
1️⃣ Limonada de panela  
2️⃣ Jugo - Natural del día`,
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
  const { isValid, value } = validateAndMatchField("drink", message);
  if (isValid) {
    conversation.groups[conversation.currentGroupIndex].drink = value;
    conversation.step = "defining_group_salad_rice";
    return {
      main: `✅ ¡Perfecto! Para estos ${conversation.groups[conversation.currentGroupIndex].count}:  
🥗🍚 ¿Cómo quieres este grupo?  
1️⃣ Con ensalada y arroz (por defecto)  
2️⃣ Sin ensalada, con arroz  
3️⃣ Con ensalada, sin arroz  
4️⃣ Sin ensalada y sin arroz`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Elige:  
1️⃣ Limonada de panela  
2️⃣ Jugo - Natural del día`,
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
4️⃣ Sin ensalada y sin arroz`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "defining_group_drink";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🥤 ¿Qué bebida quieres?  
1️⃣ Limonada de panela  
2️⃣ Jugo - Natural del día`,
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
    principleReplacement: conversation.groups[conversation.currentGroupIndex].principleReplacement || null,
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
    const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    for (let i = 0; i < conversation.remainingCount; i++) {
      const equalCount = conversation.remainingCount - i;
      if (equalCount === conversation.remainingCount) remainingOptions.push(`${numberEmojis[0]} Todos iguales (${conversation.remainingCount})`);
      else if (equalCount === 1) remainingOptions.push(`${numberEmojis[i]} Todos diferentes`);
      else remainingOptions.push(`${numberEmojis[i]} ${equalCount} iguales + ${i} diferente${i === 1 ? "" : "s"}`);
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
1️⃣ Huevo - frito  
2️⃣ Papa a la francesa  
3️⃣ Solo bandeja ($12.000)`,
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
    const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    for (let i = 0; i < conversation.remainingCount; i++) {
      const equalCount = conversation.remainingCount - i;
      if (equalCount === conversation.remainingCount) remainingOptions.push(`${numberEmojis[0]} Todos iguales (${conversation.remainingCount})`);
      else if (equalCount === 1) remainingOptions.push(`${numberEmojis[i]} Todos diferentes`);
      else remainingOptions.push(`${numberEmojis[i]} ${equalCount} iguales + ${i} diferente${i === 1 ? "" : "s"}`);
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
4️⃣ Sin ensalada y sin arroz`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  const num = parseInt(lowercaseMessage) - 1; // Ajustamos a índice base 0
  if (!isNaN(num) && num >= 0 && num < conversation.remainingCount) {
    const equalCount = conversation.remainingCount - num;
    if (equalCount === 1) { // Todos diferentes
      conversation.step = "defining_different_soup";
      return {
        main: `✅ Serán todos diferentes.  
Definamos el almuerzo ${conversation.currentLunchIndex + 1}:  
🥣 ¿Sancocho de pescado, sopa del día o cambiar la sopa por?  
1️⃣ Huevo - frito  
2️⃣ Papa a la francesa  
3️⃣ Solo bandeja ($12.000)`,
        secondary: getSecondaryMessage(conversation.step)
      };
    } else { // Algunos o todos iguales
      conversation.groups[conversation.currentGroupIndex] = { count: equalCount };
      conversation.step = "defining_group_soup";
      return {
        main: `✅ ${equalCount} almuerzos iguales.  
Para estos ${equalCount}:  
🥣 ¿Sancocho de pescado, sopa del día o cambiar la sopa por?  
1️⃣ Huevo - frito  
2️⃣ Papa a la francesa  
3️⃣ Solo bandeja ($12.000)`,
        secondary: getSecondaryMessage(conversation.step)
      };
    }
  }
  const remainingOptions = [];
  const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
  for (let i = 0; i < conversation.remainingCount; i++) {
    const equalCount = conversation.remainingCount - i;
    if (equalCount === conversation.remainingCount) remainingOptions.push(`${numberEmojis[0]} Todos iguales (${conversation.remainingCount})`);
    else if (equalCount === 1) remainingOptions.push(`${numberEmojis[i]} Todos diferentes`);
    else remainingOptions.push(`${numberEmojis[i]} ${equalCount} iguales + ${i} diferente${i === 1 ? "" : "s"}`);
  }
  return {
    main: `❌ No entendí. Usa un número de 1 a ${conversation.remainingCount}.  
${remainingOptions.join("\n")}`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleDefiningDifferentSoup(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();
  if (lowercaseMessage === "ayuda") {
    return {
      main: `🥣 Para el almuerzo ${conversation.currentLunchIndex + 1}:  
Dime qué quieres de sopa: "Sancocho de pescado", "sopa del día", o cambiar la sopa por:  
1️⃣ Huevo - frito  
2️⃣ Papa a la francesa  
3️⃣ Solo bandeja ($12.000)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = conversation.lunches.length > 0 ? "defining_remaining" : "defining_lunch_groups";
    if (conversation.step === "defining_remaining") {
      const remainingOptions = [];
      const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
      for (let i = 0; i < conversation.remainingCount; i++) {
        const equalCount = conversation.remainingCount - i;
        if (equalCount === conversation.remainingCount) remainingOptions.push(`${numberEmojis[0]} Todos iguales (${conversation.remainingCount})`);
        else if (equalCount === 1) remainingOptions.push(`${numberEmojis[i]} Todos diferentes`);
        else remainingOptions.push(`${numberEmojis[i]} ${equalCount} iguales + ${i} diferente${i === 1 ? "" : "s"}`);
      }
      return {
        main: `✅ ¡Perfecto! Ya definimos ${conversation.lunches.length} almuerzos.  
¿Cómo organizamos los ${conversation.remainingCount} faltantes?  
${remainingOptions.join("\n")}`,
        secondary: getSecondaryMessage(conversation.step)
      };
    }
    const groupOptions = [];
    const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    for (let i = 0; i < conversation.orderCount; i++) {
      const equalCount = conversation.orderCount - i;
      if (equalCount === conversation.orderCount) groupOptions.push(`${numberEmojis[0]} Todos iguales (${conversation.orderCount})`);
      else if (equalCount === 1) groupOptions.push(`${numberEmojis[i]} Todos diferentes`);
      else groupOptions.push(`${numberEmojis[i]} ${equalCount} iguales + ${i} diferente${i === 1 ? "" : "s"}`);
    }
    return {
      main: `✅ ¡Genial! ${conversation.orderCount} almuerzos.  
¿Cómo los organizamos?  
${groupOptions.join("\n")}`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  const { isValid, value } = validateAndMatchField("soup", message);
  if (isValid) {
    conversation.currentLunch = { soup: value };
    conversation.step = "defining_different_principle";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🥗 ¿Qué principio quieres? (Ej: "frijol" o "sin principio")`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Usa "sancocho", "sopa", o:  
1️⃣ Huevo - frito  
2️⃣ Papa a la francesa  
3️⃣ Solo bandeja ($12.000)`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleDefiningDifferentPrinciple(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();

  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "defining_different_soup";
    return {
      main: `✅ ¡Genial! Definamos el almuerzo ${conversation.lunches.length + 1}:  
🥣 ¿Sancocho de pescado, sopa del día o cambiar la sopa por?  
1️⃣ Huevo - frito  
2️⃣ Papa a la francesa  
3️⃣ Solo bandeja ($12.000)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }

  if (lowercaseMessage === "sin principio" || lowercaseMessage === "ninguno") {
    conversation.currentLunch.principle = "ninguno";
    conversation.step = "defining_different_principle_replacement"; // Nuevo estado
    return {
      main: `✅ Sin principio. ¿Qué prefieres de reemplazo?  
1️⃣ Huevo frito  
2️⃣ Papa a la francesa  
3️⃣ Doble porción de arroz  
4️⃣ Más ensalada`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }

  const { isValid, value } = validateAndMatchField("principle", message);
  if (isValid) {
    conversation.currentLunch.principle = value;
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

export function handleDefiningDifferentPrincipleReplacement(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();

  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "defining_different_principle";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🥗 ¿Qué principio quieres? (Ej: "frijol" o "sin principio")`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }

  const replacements = {
    "1": "Huevo frito",
    "2": "Papa a la francesa",
    "3": "Doble porción de arroz",
    "4": "Más ensalada"
  };

  if (["1", "2", "3", "4"].includes(lowercaseMessage)) {
    conversation.currentLunch.principleReplacement = replacements[lowercaseMessage];
    conversation.step = "defining_different_protein";
    return {
      main: `✅ ¡Perfecto! Reemplazo: ${replacements[lowercaseMessage]}.  
🍗 ¿Qué proteína quieres? (O escribe 'ninguna' si no deseas proteína adicional)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }

  return {
    main: `❌ No entendí. Elige:  
1️⃣ Huevo frito  
2️⃣ Papa a la francesa  
3️⃣ Doble porción de arroz  
4️⃣ Más ensalada`,
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
    conversation.step = conversation.currentLunch.principle === "ninguno" ? "defining_different_principle_replacement" : "defining_different_principle";
    if (conversation.step === "defining_different_principle_replacement") {
      return {
        main: `✅ Sin principio. ¿Qué prefieres de reemplazo?  
1️⃣ Huevo frito  
2️⃣ Papa a la francesa`,
        secondary: getSecondaryMessage(conversation.step)
      };
    }
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
  if (["sí", "si"].includes(lowercaseMessage)) {
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
1️⃣ Limonada de panela  
2️⃣ Jugo - Natural del día`,
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
1️⃣ Limonada de panela  
2️⃣ Jugo - Natural del día`,
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
1️⃣ Limonada de panela  
2️⃣ Jugo - Natural del día`,
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
  const { isValid, value } = validateAndMatchField("drink", message);
  if (isValid) {
    conversation.currentLunch.drink = value;
    conversation.step = "defining_different_salad_rice";
    return {
      main: `✅ ¡Perfecto! Para este almuerzo ${conversation.currentLunchIndex + 1}:  
🥗🍚 ¿Cómo lo quieres?  
1️⃣ Con ensalada y arroz (por defecto)  
2️⃣ Sin ensalada, con arroz  
3️⃣ Con ensalada, sin arroz  
4️⃣ Sin ensalada y sin arroz`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Elige:  
1️⃣ Limonada de panela  
2️⃣ Jugo - Natural del día`,
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
4️⃣ Sin ensalada y sin arroz`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "defining_different_drink";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🥤 ¿Qué bebida quieres?  
1️⃣ Limonada de panela  
2️⃣ Jugo - Natural del día`,
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
      main: `✅ Definamos el almuerzo ${conversation.currentLunchIndex + 1}:  
🥣 ¿Sancocho de pescado, sopa del día o cambiar la sopa por?  
1️⃣ Huevo - frito  
2️⃣ Papa a la francesa  
3️⃣ Solo bandeja ($12.000)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  } else if (conversation.remainingCount === 1) {
    conversation.step = "defining_single_lunch_soup";
    return {
      main: `✅ ¡Genial! Ya definimos ${conversation.lunches.length} almuerzos.  
Para el último:  
🥣 ¿Sancocho de pescado, sopa del día o cambiar la sopa por?  
1️⃣ Huevo - frito  
2️⃣ Papa a la francesa  
3️⃣ Solo bandeja ($12.000)`,
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
      main: `🥣 Para el último almuerzo: Dime qué quieres de sopa: "Sancocho de pescado", "sopa del día", o cambiar la sopa por:  
1️⃣ Huevo - frito  
2️⃣ Papa a la francesa  
3️⃣ Solo bandeja ($12.000)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }

  // Lógica de "atrás"
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    if (conversation.lunches.length === 0) {
      conversation.step = "defining_count"; // O "defining_group_salad_rice" según tu flujo inicial
      return {
        main: `✅ ¡Entendido! No hemos definido almuerzos aún.  
🍽️ Dime cuántos almuerzos quieres (1 a 10). Ejemplo: "2" o "dos".`,
        secondary: getSecondaryMessage(conversation.step)
      };
    } else {
      conversation.lunches.pop(); // Elimina el último almuerzo
      conversation.remainingCount++; // Ajusta el conteo restante
      conversation.currentLunchIndex--;
      conversation.step = "defining_different_salad_rice";
      return {
        main: `✅ ¡Perfecto! Para el almuerzo ${conversation.currentLunchIndex + 1}:  
🥗🍚 ¿Cómo lo quieres?  
1️⃣ Con ensalada y arroz (por defecto)  
2️⃣ Sin ensalada, con arroz  
3️⃣ Con ensalada, sin arroz  
4️⃣ Sin ensalada y sin arroz`,
        secondary: getSecondaryMessage(conversation.step)
      };
    }
  }

  const { isValid, value } = validateAndMatchField("soup", message);
  if (isValid) {
    conversation.currentLunch = { soup: value };
    conversation.step = "defining_single_lunch_principle";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🥗 ¿Qué principio quieres? (Ej: "frijol" o "sin principio")`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }

  return {
    main: `❌ No entendí. Usa "sancocho", "sopa", o:  
1️⃣ Huevo - frito  
2️⃣ Papa a la francesa  
3️⃣ Solo bandeja ($12.000)`,
    secondary: getSecondaryMessage(conversation.step)
  };
}

export function handleDefiningSingleLunchPrinciple(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();

  if (lowercaseMessage === "ayuda") {
    return {
      main: `🥗 Para el último almuerzo: Dime qué principio quieres (ej: "frijol", "arveja") o "sin principio" si no quieres.`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }

  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "defining_single_lunch_soup";
    return {
      main: `✅ ¡Genial! Ya definimos ${conversation.lunches.length} almuerzos. Para el último:  
🥣 ¿Sancocho de pescado, sopa del día o cambiar la sopa por?  
1️⃣ Huevo - frito  
2️⃣ Papa a la francesa  
3️⃣ Solo bandeja ($12.000)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }

  // Lógica para "sin principio" primero
  if (lowercaseMessage === "sin principio" || lowercaseMessage === "ninguno") {
    conversation.currentLunch.principle = "ninguno";
    conversation.step = "defining_single_lunch_principle_replacement";
    return {
      main: `✅ Sin principio. ¿Qué prefieres de reemplazo?  
1️⃣ Huevo frito  
2️⃣ Papa a la francesa  
3️⃣ Doble porción de arroz  
4️⃣ Más ensalada`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }

  // Validar principios válidos después
  const { isValid, value } = validateAndMatchField("principle", message);
  if (isValid) {
    conversation.currentLunch.principle = value;
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
export function handleDefiningAddress(conversation, message) {
  const addressPattern = /(calle|carrera|cl|cr|transversal|diagonal|avenida|av)\s*\d+[a-z]?\s*#?\s*\d+[-]?\d*/i;
  if (addressPattern.test(message)) {
    conversation.addresses.push(message);
    conversation.step = "confirming_address";
    return {
      main: `📍 Dirección: ${message}. ¿Está bien? Responde "sí" o "no".`,
      secondary: getSecondaryMessage(conversation.step)
    };
  } else {
    return {
      main: `❌ No entendí. Dime una dirección válida (Ej: "Calle 10 #5-23, para Juan").`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
}

export function handleDefiningSingleLunchPrincipleReplacement(conversation, message) {
  const lowercaseMessage = message.toLowerCase().trim();

  if (lowercaseMessage === "ayuda") {
    return {
      main: `🥗 Para el último almuerzo sin principio:  
Elige un reemplazo:  
1️⃣ Huevo frito  
2️⃣ Papa a la francesa  
3️⃣ Doble porción de arroz  
4️⃣ Más ensalada`,
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

  const { isValid, value } = validateAndMatchField("principleReplacement", message);
  if (isValid) {
    conversation.currentLunch.principleReplacement = value;
    conversation.step = "defining_single_lunch_protein";
    return {
      main: `✅ ¡Perfecto! Reemplazo: ${value}.  
🍗 ¿Qué proteína quieres? (O escribe 'ninguna' si no deseas proteína adicional)`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }

  return {
    main: `❌ No entendí. Elige:  
1️⃣ Huevo frito  
2️⃣ Papa a la francesa  
3️⃣ Doble porción de arroz  
4️⃣ Más ensalada`,
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
    conversation.step = conversation.currentLunch.principle === "ninguno" ? "defining_single_lunch_principle_replacement" : "defining_single_lunch_principle";
    if (conversation.step === "defining_single_lunch_principle_replacement") {
      return {
        main: `✅ Sin principio. ¿Qué prefieres de reemplazo?  
1️⃣ Huevo frito  
2️⃣ Papa a la francesa`,
        secondary: getSecondaryMessage(conversation.step)
      };
    }
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
  if (["sí", "si"].includes(lowercaseMessage)) {
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
1️⃣ Limonada de panela  
2️⃣ Jugo - Natural del día`,
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
1️⃣ Limonada de panela  
2️⃣ Jugo - Natural del día`,
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
1️⃣ Limonada de panela  
2️⃣ Jugo - Natural del día`,
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
  const { isValid, value } = validateAndMatchField("drink", message);
  if (isValid) {
    conversation.currentLunch.drink = value;
    conversation.step = "defining_single_lunch_salad_rice";
    return {
      main: `✅ ¡Perfecto! Para este último almuerzo:  
🥗🍚 ¿Cómo lo quieres?  
1️⃣ Con ensalada y arroz (por defecto)  
2️⃣ Sin ensalada, con arroz  
3️⃣ Con ensalada, sin arroz  
4️⃣ Sin ensalada y sin arroz`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  return {
    main: `❌ No entendí. Elige:  
1️⃣ Limonada de panela  
2️⃣ Jugo - Natural del día`,
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
4️⃣ Sin ensalada y sin arroz`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  if (lowercaseMessage === "atrás" || lowercaseMessage === "atras" || lowercaseMessage === "volver") {
    conversation.step = "defining_single_lunch_drink";
    return {
      main: `✅ ¡Perfecto! Ahora:  
🥤 ¿Qué bebida quieres?  
1️⃣ Limonada de panela  
2️⃣ Jugo - Natural del día`,
      secondary: getSecondaryMessage(conversation.step)
    };
  }
  const num = parseInt(lowercaseMessage);
  if (!isNaN(num) && num >= 1 && num <= 4) {
    const saladRicePreference = num === 1 ? { salad: true, rice: true } :
                                num === 2 ? { salad: false, rice: true } :
                                num === 3 ? { salad: true, rice: false } :
                                { salad: false, rice: false };
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
  return {
    main: `❌ No entendí. Elige:  
1️⃣ Con ensalada y arroz (por defecto)  
2️⃣ Sin ensalada, con arroz  
3️⃣ Con ensalada, sin arroz  
4️⃣ Sin ensalada y sin arroz`,
    secondary: getSecondaryMessage(conversation.step)
  };
}