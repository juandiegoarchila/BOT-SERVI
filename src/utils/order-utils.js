// src/utils/order-utils.js
export function isWithinBusinessHours() {
  return true; // Forzado a siempre abierto para pruebas
}

export function wordToNumber(word) {
  const numberWords = {
    uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
    seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  };
  return numberWords[word.toLowerCase()] || null;
}

export function normalizeTime(timeStr) {
  const lowercaseTime = timeStr.toLowerCase().trim();
  const immediateWords = ["ahora", "para ya", "de una vez", "lo quiero ya"];

  // Manejar palabras que indican entrega inmediata
  if (immediateWords.includes(lowercaseTime)) {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  }

  // Manejar formatos numéricos flexibles (ej: "1", "13:30", "1.30", "13h30")
  const timeMatch = lowercaseTime.match(/^(?:para la\s*)?(\d{1,2})(?::|\.|h)?(\d{2})?\s*(am|pm)?$/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const period = timeMatch[3]?.toLowerCase();

    // Si no se especifica AM/PM, asumir horario lógico según el contexto (11:30 AM - 3:45 PM)
    if (!period) {
      if (hours >= 1 && hours <= 3) {
        hours += 12; // Asumir PM para 1-3
      } else if (hours === 12) {
        hours = 12; // Mediodía
      } else if (hours < 11) {
        return null; // Fuera de horario sin AM/PM
      }
    } else if (period === "pm" && hours < 12) {
      hours += 12;
    } else if (period === "am" && hours === 12) {
      hours = 0;
    }

    if (hours > 23 || minutes > 59) return null;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  }

  return null;
}

export function extractOrderCount(message) {
  const lowercaseMessage = message.toLowerCase().trim();
  const digitMatch = lowercaseMessage.match(/(\d+)\s*almuerzo(s)?/) || lowercaseMessage.match(/^(\d+)$/);
  if (digitMatch) return parseInt(digitMatch[1], 10);
  const wordMatch = lowercaseMessage.match(/(uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s*almuerzo(s)?/i) ||
    lowercaseMessage.match(/^(uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)$/i);
  return wordMatch ? wordToNumber(wordMatch[1]) : null;
}

export function levenshteinDistance(a, b) {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  return matrix[b.length][a.length];
}

export function findClosestMatch(input, options) {
  const lowerInput = input.toLowerCase().trim();
  const exactMatch = options.find((option) => option.toLowerCase() === lowerInput);
  if (exactMatch) return exactMatch;
  const partialMatch = options.find((option) => option.toLowerCase().includes(lowerInput));
  if (partialMatch) return partialMatch;
  if (lowerInput.length >= 3) {
    let minDistance = Infinity;
    let closestMatch = null;
    options.forEach((option) => {
      const distance = levenshteinDistance(lowerInput, option.toLowerCase());
      if (distance < minDistance && distance <= 2) {
        minDistance = distance;
        closestMatch = option;
      }
    });
    return closestMatch;
  }
  return null;
}

export function mapNumberToOption(number, optionsArray) {
  const index = parseInt(number) - 1;
  return index >= 0 && index < optionsArray.length ? optionsArray[index] : null;
}

export function generateNotifyMessage(conversation, totalCost) {
  let notifyMessage = `📝 Nuevo pedido\n`;
  notifyMessage += `👤 Cliente: ${conversation.phone.replace("@c.us", "")}\n`;
  notifyMessage += `🍽️ ${conversation.lunches.length} almuerzos:\n\n`;

  const groupedLunches = {};
  conversation.lunches.forEach((lunch, index) => {
    const key = `${lunch.soup || "sin sopa"}|${lunch.principle || "ninguno"}|${
      lunch.protein || "ninguna"
    }|${lunch.extraProtein ? lunch.extraProteinType : "none"}|${lunch.drink}|${
      conversation.addresses[index]
    }|${lunch.salad}|${lunch.rice}`;
    if (!groupedLunches[key]) {
      groupedLunches[key] = { count: 0, details: lunch, address: conversation.addresses[index] };
    }
    groupedLunches[key].count++;
  });

  Object.values(groupedLunches).forEach((group) => {
    notifyMessage += `(${group.count}) Almuerzos iguales:\n`;
    const soupDisplay = group.details.soup === "sopa del día" ? "sopa" : group.details.soup || "sin sopa";
    notifyMessage += `🥣 Sopa: ${soupDisplay}\n`;
    notifyMessage += `🥗 Principio: ${group.details.principle || "ninguno"}\n`;
    notifyMessage += `🍗 Proteína: ${group.details.protein || "ninguna"}${
      group.details.extraProtein ? ` + ${group.extraProteinType}` : ""
    }\n`;
    notifyMessage += `🥤 Bebida: ${group.details.drink}\n`;
    notifyMessage += `📍 Dirección: ${group.address}\n`;
    notifyMessage += `\n`; // Simplificamos, quitamos personalización aquí porque ya está en el pedido
  });

  notifyMessage += `⏰ Hora: ${conversation.deliveryTime}\n`;
  notifyMessage += `💳 Pago: ${conversation.paymentMethod}\n`;
  notifyMessage += `🍴 Cubiertos: ${conversation.cutlery ? "Sí" : "No"}\n`;
  notifyMessage += `💰 Total: $${totalCost.toLocaleString()}`;
  return notifyMessage;
}