//src/utils/conversation-utils.js
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

export const PROTEIN_MENU = `1. Res  
2. Pollo  
3. Cerdo  
4. Mojarra ($16.000)`;

export const PRINCIPLE_MENU = `1. Arveja  
2. Frijol  
3. Lenteja  
4. Garbanzo  
5. Espagueti`;

export function validateAndMatchField(field, input) {
  const fields = {
    soup: VALID_SOUPS.concat(["sancocho", "huevo", "papa"]), // Añadimos términos parciales comunes
    principle: VALID_PRINCIPLES.concat(["pasta", "spagetti", "macarron"]), // Sinónimos y formas parciales
    protein: VALID_PROTEINS,
    drink: VALID_DRINKS,
    payment: VALID_PAYMENTS,
    address: /.+/,
  };

  const options = fields[field];
  if (!options) return { isValid: false };

  const lowercaseInput = input.toLowerCase().trim();
  if (field === "address") {
    return { isValid: options.test(lowercaseInput), value: input.trim() };
  }

  // Coincidencia exacta
  const exactMatch = options.find((option) => option === lowercaseInput);
  if (exactMatch) return { isValid: true, value: exactMatch };

  // Coincidencia parcial con stringSimilarity (umbral 0.5 para más flexibilidad)
  const closestMatch = stringSimilarity.findBestMatch(lowercaseInput, options).bestMatch;
  if (closestMatch.rating > 0.5) return { isValid: true, value: closestMatch.target };

  return { isValid: false };
}

export function generateSummary(conversation) {
  let summary = `✅ *Resumen de tu pedido*:\n`;
  summary += `🍽️ ${conversation.lunches.length} almuerzo${conversation.lunches.length > 1 ? "s" : ""}:\n\n`;

  // Agrupar almuerzos iguales
  const groupedLunches = {};
  conversation.lunches.forEach((lunch, index) => {
    const key = `${lunch.soup}|${lunch.principle || "ninguno"}|${lunch.protein || "ninguna"}|${lunch.drink}|${conversation.addresses[index]}`;
    if (!groupedLunches[key]) {
      groupedLunches[key] = { count: 0, details: lunch, address: conversation.addresses[index] };
    }
    groupedLunches[key].count++;
  });

  Object.values(groupedLunches).forEach((group) => {
    if (group.count > 1) {
      summary += `(${group.count}) Almuerzos iguales:\n`;
    } else {
      summary += `(1) Almuerzo:\n`;
    }
    const soupDisplay = group.details.soup === "sopa" || group.details.soup === "sopa del día" ? "sopa" : group.details.soup;
    summary += `🥣 Sopa: ${soupDisplay}\n`;
    summary += `🥗 Principio: ${group.details.principle || "ninguno"}\n`;
    summary += `🍗 Proteína: ${group.details.protein || "ninguna"}${group.details.extraProtein ? " (adicional $5,000)" : ""}\n`;
    summary += `🥤 Bebida: ${group.details.drink}\n`;
    summary += `📍 Dirección: ${group.address}\n\n`;
  });

  summary += `📞 Teléfono: ${conversation.phone.replace('@c.us', '')}\n`;
  summary += `⏰ Hora: ${conversation.deliveryTime}\n`;
  summary += `💳 Pago: ${conversation.paymentMethod}\n`;
  summary += `🍴 Cubiertos: ${conversation.cutlery ? "Sí" : "No"}\n`;
  summary += `\n¿Todo bien? Responde:\n1. Sí\n2. No`;

  return summary;
}

export function getSecondaryMessage(step) {
  const options = {
    initial: "🌟 Usa 'Atrás' para cancelar o escribe 'Hola' para empezar.",
    awaiting_order_count: "🌟 Usa 'Atrás' para cancelar si cambias de idea.",
    repeating_last_order: "🌟 Usa 'Atrás' para cancelar o elegir otro pedido.",
    defining_groups: "🌟 Usa 'Atrás' para cambiar la cantidad de almuerzos.",
    defining_group_soup: "🌟 Usa 'Atrás' para ajustar cómo organizamos los almuerzos.",
    defining_group_principle: "🌟 Usa 'Atrás' para cambiar la sopa.",
    defining_group_no_principle: "🌟 Usa 'Atrás' para elegir un principio diferente.",
    defining_group_protein: "🌟 Usa 'Atrás' para cambiar el principio o su reemplazo.",
    defining_group_drink: "🌟 Usa 'Atrás' para cambiar la proteína.",
    defining_remaining: "🌟 Usa 'Atrás' para rehacer los almuerzos anteriores.",
    defining_different_soup: "🌟 Usa 'Atrás' para ajustar cómo organizamos los almuerzos.",
    defining_different_principle: "🌟 Usa 'Atrás' para cambiar la sopa.",
    defining_different_no_principle: "🌟 Usa 'Atrás' para elegir un principio diferente.",
    defining_different_protein: "🌟 Usa 'Atrás' para cambiar el principio o su reemplazo.",
    defining_different_drink: "🌟 Usa 'Atrás' para cambiar la proteína.",
    defining_single_lunch_soup: "🌟 Usa 'Atrás' para cambiar la cantidad de almuerzos.",
    defining_single_lunch_principle: "🌟 Usa 'Atrás' para cambiar la sopa.",
    defining_single_lunch_no_principle: "🌟 Usa 'Atrás' para elegir un principio diferente.",
    defining_single_lunch_protein: "🌟 Usa 'Atrás' para cambiar el principio o su reemplazo.",
    defining_single_lunch_drink: "🌟 Usa 'Atrás' para cambiar la proteína.",
    ordering_time: "🌟 Usa 'Atrás' para ajustar las bebidas o los almuerzos.",
    ordering_same_address: "🌟 Usa 'Atrás' para cambiar la hora de entrega.",
    ordering_address_single: "🌟 Usa 'Atrás' para decidir si van a la misma dirección.",
    confirming_address_single: "🌟 Usa 'Atrás' para cambiar la dirección.",
    ordering_address_multiple: "🌟 Usa 'Atrás' para ajustar la dirección anterior.",
    ordering_payment: "🌟 Usa 'Atrás' para cambiar las direcciones.",
    ordering_cutlery: "🌟 Usa 'Atrás' para cambiar el método de pago.",
    preview_order: "🌟 Usa 'Atrás' para ajustar los cubiertos.",
    completed: "🌟 Usa 'Editar' para rehacer el pedido o escribe algo para continuar."
  };
  return options[step] || "🌟 Usa 'Atrás' para regresar, 'Editar' para rehacer, o 'Cancelar' para empezar de nuevo.";
}