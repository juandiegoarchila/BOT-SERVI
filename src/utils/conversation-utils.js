// src/utils/conversation-utils.js
import stringSimilarity from "string-similarity";
import { VALID_SOUPS, VALID_PRINCIPLES, VALID_PROTEINS, VALID_DRINKS, VALID_PAYMENTS } from "../config/order-config.js";

export const PRINCIPLES_WITH_PROTEIN = [
  "espagueti",
  "espaguetis",
  "spaghetti",
  "macarrones",
  "macarrón",
  "arroz paisa, papa a la francesa, ensalada dulce no viene con proteina porque el arroz ya la tiene incorporada",
  "arroz tres carnes ya la proteina esta incorporada, papa a la francesa y ensalada dulce",
  "arroz con pollo ya la proteina esta incorporada, papa a la francesa y ensalada",
  "spagetti a la boloñesa",
  "macarrones en salsa carbonara",
];

export const PROTEIN_MENU = `1️⃣ Res  
2️⃣ Pollo  
3️⃣ Cerdo  
4️⃣ Mojarra ($15.000)`;

export const PRINCIPLE_MENU = `1️⃣ Arveja  
2️⃣ Frijol  
3️⃣ Lenteja  
4️⃣ Garbanzo  
5️⃣ Espagueti`;

export function validateAndMatchField(field, input, customMappings = {}) {
  const lowercaseInput = input.toLowerCase().trim();

  const fields = {
    soup: {
      "1": "huevo",
      "2": "papa a la francesa",
      "3": "solo bandeja",
      "sancocho": "sancocho de pescado",
      "sopa": "sopa del dia",
      "huevo frito": "huevo",
      "papa": "papa a la francesa",
      "sin sopa": "solo bandeja",
      ...VALID_SOUPS.reduce((acc, s) => ({ ...acc, [s.toLowerCase()]: s }), {}),
      ...customMappings
    },
    principle: {
      "1": "arveja",
      "2": "frijol",
      "3": "lenteja",
      "4": "garbanzo",
      "5": "espagueti",
      "sin principio": "ninguno",
      "ninguno": "ninguno",
      ...VALID_PRINCIPLES.reduce((acc, p) => ({ ...acc, [p.toLowerCase()]: p }), {}),
      ...customMappings
    },
    principleReplacement: {
      "1": "huevo frito",
      "2": "papa a la francesa",
      "3": "doble porción de arroz",
      "4": "más ensalada",
      "huevo frito": "huevo frito",
      "huevo": "huevo frito",
      "papa a la francesa": "papa a la francesa",
      "papa": "papa a la francesa",
      "doble porcion de arroz": "doble porción de arroz",
      "doble porción de arroz": "doble porción de arroz",
      "mas ensalada": "más ensalada",
      "más ensalada": "más ensalada",
      ...customMappings
    },
    protein: {
      "1": "res",
      "2": "pollo",
      "3": "cerdo",
      "4": "mojarra",
      "ninguna": "ninguna",
      ...VALID_PROTEINS.reduce((acc, p) => ({ ...acc, [p.toLowerCase()]: p }), {}),
      ...customMappings
    },
    drink: {
      "1": "limonada de panela",
      "2": "jugo",
      "limonada": "limonada de panela",
      "jugo natural del dia": "jugo",
      ...VALID_DRINKS.reduce((acc, d) => ({ ...acc, [d.toLowerCase()]: d }), {}),
      ...customMappings
    },
    payment: {
      "1": "efectivo",
      "2": "nequi",
      "3": "daviplata",
      ...VALID_PAYMENTS.reduce((acc, p) => ({ ...acc, [p.toLowerCase()]: p }), {}),
      ...customMappings
    },
    address: /.+/,
  };

  const options = fields[field];
  if (!options) return { isValid: false, value: null };

  if (field === "address") {
    // Expresión regular para validar formatos como "CL 130N130-16", "CL 130#130-16", "Calle 130 #130-16", etc.
    const addressPattern = /^(calle|cll|cl|cra|carrera|av|avenida|diagonal)\s*\d+[a-zA-Z]?\s*(?:#|n|-)?\s*\d+(?:-\d+)?/i;
    const isValid = addressPattern.test(lowercaseInput);
    return { isValid, value: input.trim() };
  }

  const exactMatch = options[lowercaseInput];
  if (exactMatch) return { isValid: true, value: exactMatch };

  const optionKeys = Object.keys(options);
  const closestMatch = stringSimilarity.findBestMatch(lowercaseInput, optionKeys).bestMatch;
  if (closestMatch.rating > 0.5) return { isValid: true, value: options[closestMatch.target] };

  return { isValid: false, value: null };
}

export function generateOrderSummary(conversation) {
  let total = 0;
  const groupedLunches = {};

  conversation.lunches.forEach((lunch, index) => {
    const key = `${lunch.soup}|${lunch.principle || "ninguno"}|${lunch.principleReplacement || "ninguno"}|${lunch.protein || "ninguna"}|${lunch.extraProtein ? lunch.extraProteinType : "sin extra"}|${lunch.drink}|${lunch.salad}|${lunch.rice}|${conversation.addresses[index]}`;
    if (!groupedLunches[key]) {
      groupedLunches[key] = { count: 0, details: lunch, address: conversation.addresses[index] };
    }
    groupedLunches[key].count++;
  });

  const lunchDetails = Object.values(groupedLunches).map((group) => {
    const lunch = group.details;
    const soupDisplay = ["huevo", "papa a la francesa", "solo bandeja"].includes(lunch.soup)
      ? `Sin sopa (reemplazo: ${lunch.soup})`
      : lunch.soup === "sopa" || lunch.soup === "sopa del dia"
        ? "Sopa del día"
        : lunch.soup || "Sin sopa";
    const principleDisplay = lunch.principle === "ninguno" && lunch.principleReplacement
      ? `Sin principio (reemplazo: ${lunch.principleReplacement})`
      : lunch.principle || "Ninguno";
    const customization = `${lunch.salad ? "Con ensalada" : "Sin ensalada"}, ${lunch.rice ? "con arroz" : "sin arroz"}`;

    let lunchText = `${group.count > 1 ? `(${group.count}) Almuerzos iguales:` : "(1) Almuerzo:"}\n`;
    lunchText += `🥣 ${soupDisplay}\n`;
    lunchText += `🥗 ${principleDisplay}\n`;
    lunchText += `🍗 Proteína: ${lunch.protein || "ninguna"}${lunch.extraProtein ? ` + ${lunch.extraProteinType} ${lunch.extraProteinType === "mojarra" ? "(sin costo adicional)" : "($5,000)"}` : ""}\n`;
    lunchText += `🥤 Bebida: ${lunch.drink || "sin bebida"}\n`;
    lunchText += `📍 Dirección: ${group.address}\n`;
    lunchText += `🥗🍚 Personalización: ${customization}`;

    let lunchCost = lunch.soup === "solo bandeja" ? 12000 : 13000;
    if (lunch.protein === "mojarra" || (lunch.extraProtein && lunch.extraProteinType === "mojarra")) lunchCost = 15000;
    if (lunch.extraProtein && lunch.extraProteinType !== "mojarra") lunchCost += 5000;
    total += lunchCost * group.count;

    return lunchText;
  });

  const paymentDetails = conversation.paymentMethod.toLowerCase() === "efectivo"
    ? `💵 Por favor, ten el efectivo listo. Si no tienes, envía $${total.toLocaleString()} al 3138505647 (Nequi o Daviplata) y comparte el comprobante.`
    : `📲 Envía $${total.toLocaleString()} al 3138505647 (${conversation.paymentMethod}) y comparte el comprobante.`;

  const summary = `✅ ¡Listo! Aquí está tu pedido:\n` +
    `🍽️ ${conversation.lunches.length} almuerzo${conversation.lunches.length > 1 ? "s" : ""}:\n\n` +
    `${lunchDetails.join("\n\n")}\n\n` +
    `📞 Teléfono: ${conversation.phone.replace('@c.us', '')}\n` +
    `⏰ Hora: ${formatTime(conversation.deliveryTime)}\n` +
    `💳 Pago: ${conversation.paymentMethod}\n` +
    `${paymentDetails}\n` +
    `🍴 Cubiertos: ${conversation.cutlery ? "Sí" : "No"}\n` +
    `💰 Total: $${total.toLocaleString()}`;

  conversation.total = total;
  return { main: summary, secondary: getSecondaryMessage(conversation.step) };
}

function formatTime(time) {
  const immediateWords = ["ahora", "para ya", "de una vez", "lo quiero ya"];
  if (immediateWords.includes(time.toLowerCase().trim())) {
    return "Ahora";
  }
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export function getSecondaryMessage(step) {
  const options = {
    awaiting_order_count: "🌟 Usa 'Atrás' para cancelar si cambias de idea.",
    defining_lunch_groups: "🌟 Usa 'Atrás' para cambiar la cantidad de almuerzos.",
    defining_group_soup: "🌟 Usa 'Atrás' para ajustar cómo organizamos los almuerzos.",
    defining_group_principle: "🌟 Usa 'Atrás' para cambiar la sopa.",
    defining_group_protein: "🌟 Usa 'Atrás' para cambiar el principio.",
    defining_group_extra_protein: "🌟 Usa 'Atrás' para cambiar la proteína.",
    defining_group_extra_protein_type: "🌟 Usa 'Atrás' para decidir si quieres proteína adicional.",
    defining_group_drink: "🌟 Usa 'Atrás' para cambiar la proteína adicional.",
    defining_different_soup: "🌟 Usa 'Atrás' para ajustar cómo organizamos los almuerzos.",
    defining_different_principle: "🌟 Usa 'Atrás' para cambiar la sopa.",
    defining_different_protein: "🌟 Usa 'Atrás' para cambiar el principio.",
    defining_different_extra_protein: "🌟 Usa 'Atrás' para cambiar la proteína.",
    defining_different_extra_protein_type: "🌟 Usa 'Atrás' para decidir si quieres proteína adicional.",
    defining_different_drink: "🌟 Usa 'Atrás' para cambiar la proteína adicional.",
    defining_single_lunch_soup: "🌟 Usa 'Atrás' para ajustar los almuerzos anteriores.",
    defining_single_lunch_principle: "🌟 Usa 'Atrás' para cambiar la sopa.",
    defining_single_lunch_principle_replacement: "🌟 Usa 'Atrás' para cambiar el principio.",
    defining_single_lunch_protein: "🌟 Usa 'Atrás' para cambiar el reemplazo o principio.",
    defining_single_lunch_extra_protein: "🌟 Usa 'Atrás' para cambiar la proteína.",
    defining_single_lunch_extra_protein_type: "🌟 Usa 'Atrás' para decidir si quieres proteína adicional.",
    defining_single_lunch_drink: "🌟 Usa 'Atrás' para cambiar la proteína adicional.",
    defining_single_lunch_salad_rice: "🌟 Usa 'Atrás' para ajustar las bebidas.",
    ordering_time: "🌟 Usa 'Atrás' para ajustar la personalización.",
    ordering_address_single: "🌟 Usa 'Atrás' para ajustar la hora.",
    confirming_address_single: "🌟 Usa 'Atrás' para ajustar la dirección.",
    ordering_payment: "🌟 Usa 'Atrás' para ajustar la dirección.",
    ordering_cutlery: "🌟 Usa 'Atrás' para ajustar el pago.",
    preview_order: "🌟 Usa 'Atrás' para ajustar los cubiertos.",
    selecting_adjustment: "🌟 Usa 'Atrás' para regresar al resumen."
  };
  return options[step] || "🌟 Usa 'Atrás' para regresar, 'Editar' para rehacer, o 'Cancelar' para empezar de nuevo.";
}