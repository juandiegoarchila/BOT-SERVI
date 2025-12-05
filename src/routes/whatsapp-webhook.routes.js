import envConfig from '../config/env-config.js';
import logger from '../utils/logger.js';
import { processOrder } from '../services/order.service.js';
import waCloud from '../services/messaging/wa-cloud-adapter.js';

function extractMessage(payload) {
  try {
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages?.[0];
    const contacts = value?.contacts?.[0];
    if (!messages) return null;
    const from = messages.from; // msisdn sin +, con código país
    let text = '';
    if (messages.type === 'text') text = messages.text?.body || '';
    else if (messages.type === 'button') text = messages.button?.text || messages.button?.payload || '';
    else if (messages.type === 'interactive') {
      const ir = messages.interactive;
      if (ir.type === 'button_reply') text = ir.button_reply?.title || ir.button_reply?.id || '';
      if (ir.type === 'list_reply') text = ir.list_reply?.title || ir.list_reply?.id || '';
    }
    return { from, text, contacts, id: messages.id };
  } catch (e) {
    logger.error('Error extrayendo mensaje del webhook', e);
    return null;
  }
}

export default async function whatsappWebhookRoutes(fastify) {
  // Verificación webhook (GET)
  fastify.get('/webhook/whatsapp', async (request, reply) => {
    const mode = request.query['hub.mode'];
    const token = request.query['hub.verify_token'];
    const challenge = request.query['hub.challenge'];
    if (mode === 'subscribe' && token === envConfig.whatsapp.cloud.verifyToken) {
      return reply.status(200).send(challenge);
    }
    return reply.status(403).send('Forbidden');
  });

  // Recepción de mensajes (POST)
  fastify.post('/webhook/whatsapp', async (request, reply) => {
    try {
      const msg = extractMessage(request.body);
      if (!msg) return reply.status(200).send({ received: true });

      const fromJid = `${msg.from}@c.us`;
      const response = await processOrder(fromJid, msg.text || '', null);

      // Enviar respuestas usando Cloud API
      const to = msg.from.startsWith('+') ? msg.from.slice(1) : msg.from;
      if (response) {
        if (response.messages && Array.isArray(response.messages)) {
          for (const m of response.messages) {
            if (typeof m === 'string') await waCloud.sendText(to, m);
            else if (m?.imageLink) await waCloud.sendImageLink(to, m.imageLink, m.caption || '');
          }
        } else if (typeof response === 'string') {
          await waCloud.sendText(to, response);
        } else if (response.main && response.secondary) {
          await waCloud.sendText(to, response.main);
          await waCloud.sendText(to, response.secondary);
        } else if (response.reply) {
          // Intentar botones si vienen definidos
          if (response.options?.buttons?.length) {
            const buttons = response.options.buttons.map((b, idx) => ({ id: b.id || `opt_${idx+1}`, title: b.title || String(b) })).slice(0,3);
            await waCloud.sendInteractiveButtons(to, response.reply, buttons);
          } else {
            await waCloud.sendText(to, response.reply);
          }
        } else {
          await waCloud.sendText(to, 'Hubo un error inesperado. Intenta de nuevo.');
        }
      }

      return reply.status(200).send({ received: true });
    } catch (err) {
      logger.error('Error manejando webhook:', err);
      return reply.status(200).send({ received: true });
    }
  });
}
