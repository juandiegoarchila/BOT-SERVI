import envConfig from '../../config/env-config.js';
import logger from '../../utils/logger.js';

const baseUrl = `https://graph.facebook.com/${envConfig.whatsapp.cloud.apiVersion}`;
const phoneId = envConfig.whatsapp.cloud.phoneId;
const accessToken = envConfig.whatsapp.cloud.accessToken;

async function graphFetch(path, body) {
  const res = await fetch(`${baseUrl}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    logger.error('WhatsApp Cloud API error', { status: res.status, body: json });
    throw new Error(`WhatsApp Cloud API error: ${res.status}`);
  }
  return json;
}

export async function sendText(to, text) {
  return graphFetch(`${phoneId}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text },
  });
}

export async function sendImageLink(to, link, caption) {
  return graphFetch(`${phoneId}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'image',
    image: { link, caption },
  });
}

export async function sendInteractiveButtons(to, bodyText, buttons) {
  // buttons: [{ id: 'opt_1', title: 'Opción 1' }, ...] máx 3
  const mapped = buttons.slice(0, 3).map((b) => ({
    type: 'reply',
    reply: { id: b.id, title: b.title },
  }));
  return graphFetch(`${phoneId}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: { buttons: mapped },
    },
  });
}

export async function markRead(messageId) {
  return graphFetch(`${phoneId}/messages`, {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
  });
}

export default {
  sendText,
  sendImageLink,
  sendInteractiveButtons,
  markRead,
};
