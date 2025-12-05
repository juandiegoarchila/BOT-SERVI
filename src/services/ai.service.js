import envConfig from '../config/env-config.js';
import logger from '../utils/logger.js';
import OpenAI from 'openai';

let client;
if (envConfig.openai.apiKey) {
  client = new OpenAI({ apiKey: envConfig.openai.apiKey });
} else {
  logger.warn('OpenAI client no inicializado: falta OPENAI_API_KEY');
}

const CACHE_TTL = Number(process.env.AI_CACHE_TTL_MS || 45000);
const MAX_CALLS = Number(process.env.AI_MAX_CALLS_PER_CONVO || 12);
const aiCache = new Map(); // key => { text, expires }
const convoUsage = new Map(); // phone => count

function cacheKey(phone, phase, snippet) {
  return `${phone}::${phase}::${snippet.slice(0,40)}`;
}

function getCached(key) {
  const entry = aiCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    aiCache.delete(key);
    return null;
  }
  return entry.text;
}

function setCached(key, text) {
  aiCache.set(key, { text, expires: Date.now() + CACHE_TTL });
}

const BASE_SYSTEM = `Eres un asistente cordial de Cocina Casera. Mantén respuestas breves (máx 4 líneas), amables, sin inventar precios ni tiempos exactos. Usa "veci" con moderación. Nunca des información financiera distinta a la ya conocida (solo Bancolombia, Daviplata). Si piden ayuda humana, anima a usar la página y tranquiliza. Si repiten sin enviar pedido, refuerza usar el link. No prometas cosas que no están confirmadas.`;

export async function generateContextualReply(phone, phase, userMessage, state) {
  if (!client) return null;
  try {
    const current = convoUsage.get(phone) || 0;
    if (current >= MAX_CALLS) return null; // límite alcanzado

    const snippet = userMessage.trim().toLowerCase();
    const key = cacheKey(phone, phase, snippet);
    const cached = getCached(key);
    if (cached) return cached;

    const phaseHint = {
      greeting: 'El usuario inicia interacción, saluda o prueba un mensaje suelto.',
      explanation: 'El usuario no ha usado la página, explícale brevemente cómo hacerlo.',
      assistance: 'El usuario necesita opciones de ayuda, responde empático y breve.',
      confirm_web: 'Pedido web recibido, refuerza confirmación sin repetir literal todo.',
      thanks: 'Usuario dijo gracias tras confirmación.',
      follow_up: 'Preguntamos si desea otro pedido.',
      option_1: 'Pidió ayuda humana (opción 1). Dar tranquilidad y alternativa.',
      option_2: 'Reporta problema al enviar pedido.',
      option_3: 'Quiere saber cómo hacer más pedidos.',
      option_4: 'Pregunta si llegamos a su dirección.',
      default: 'Contexto genérico.'
    }[phase] || 'Contexto genérico.';

    const system = `${BASE_SYSTEM}\nFase: ${phase}. Contexto: ${phaseHint}. Estado previo: ${JSON.stringify(state)}`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.65,
      max_tokens: 160,
    });
    const text = completion.choices?.[0]?.message?.content?.trim();
    if (text) {
      setCached(key, text);
      convoUsage.set(phone, current + 1);
    }
    return text || null;
  } catch (err) {
    logger.error('Error IA contextual:', err);
    return null;
  }
}

export default { generateContextualReply };