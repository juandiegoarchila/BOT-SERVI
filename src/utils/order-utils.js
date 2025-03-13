//src/utils/order-utils.js
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
    if (lowercaseTime === "ahora") {
      const now = new Date();
      return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    }
    const timeMatch = lowercaseTime.match(/^(?:para la\s*)?(\d{1,2})(?::|\.|h)?(\d{2})?\s*(am|pm)?$/i);
    if (!timeMatch) return null;
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const period = timeMatch[3];
    if (period) {
      if (period === "pm" && hours < 12) hours += 12;
      if (period === "am" && hours === 12) hours = 0;
    }
    if (hours > 23 || minutes > 59) return null;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
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