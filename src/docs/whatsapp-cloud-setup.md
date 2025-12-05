# WhatsApp Business Cloud API - Setup

Esta guía te lleva de cero a funcional usando Cloud API (oficial), incluyendo verificación del webhook, pruebas locales con ngrok y uso de botones.

## 1) Variables de entorno

En tu `.env` define:

```
WHATSAPP_PROVIDER=cloud
WA_CLOUD_API_VERSION=v20.0
WA_CLOUD_PHONE_ID=<PHONE_NUMBER_ID>
WA_CLOUD_ACCESS_TOKEN=<ACCESS_TOKEN>
WA_CLOUD_VERIFY_TOKEN=<UN_TOKEN_QUE_ELIJAS>
```

Mantén además tus variables de la API (`JWT_SECRET`, DB, etc.).

## 2) Levanta la API

```
npm run dev
```

Endpoints registrados:
- Verificación: `GET /webhook/whatsapp`
- Recepción: `POST /webhook/whatsapp`

## 3) Exposición pública (ngrok)

```
ngrok http 5000
```

Copia la URL pública de ngrok, por ejemplo: `https://abcd-xx.ngrok-free.app`.

## 4) Configuración en Meta (App Dashboard)

1. Crea una aplicación y añade el producto “WhatsApp”.
2. Agrega o selecciona un número de teléfono (obtendrás el `PHONE_NUMBER_ID`).
3. Genera un “Permanent Access Token” para producción.
4. En “Configuration” → “Webhook”:
   - Callback URL: `https://<tu-ngrok>/webhook/whatsapp`
   - Verify Token: el de `WA_CLOUD_VERIFY_TOKEN`.
   - Suscribe el campo `messages`.

## 5) Verificación manual (opcional)

```
curl "http://localhost:5000/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=<VERIFY_TOKEN>&hub.challenge=123"
```

Deberías recibir `123` como respuesta.

## 6) Probar recepción de mensajes

Meta enviará eventos reales a tu webhook cuando escribas desde WhatsApp al número Cloud. Para simular:

```
curl -X POST "http://localhost:5000/webhook/whatsapp" \
  -H "Content-Type: application/json" \
  -d '{
    "entry":[{ "changes":[{ "value":{
      "messages":[{ "from":"573001112233", "id":"wamid.TEST", "timestamp":"1700000000",
        "type":"text", "text": {"body":"hola"}
      }],
      "contacts":[{"wa_id":"573001112233"}]
    }}]}]
  }'
```

La ruta `POST /webhook/whatsapp` extrae el mensaje, invoca `processOrder(...)` y responde al usuario con Cloud API.

## 7) Botones interactivos

Tu flujo puede responder con botones devolviendo un objeto así desde los handlers:

```js
{
  reply: "Elige una opción:",
  options: {
    buttons: [
      { id: "opt_1", title: "Pedir 1" },
      { id: "opt_2", title: "Pedir 2" },
      { id: "ayuda", title: "Ayuda" }
    ]
  }
}
```

El adaptador `wa-cloud-adapter.js` enviará un mensaje interactivo tipo botón. Cuando el usuario pulse, el webhook recibirá `interactive.button_reply` y lo traducirá a texto para tu flujo.

## 8) Producción

- No ejecutes `npm run bot` si usas Cloud API (no es necesario ni recomendable).
- Usa un Access Token permanente y guárdalo de forma segura.
- Configura HTTPS real (no ngrok) o un proxy con TLS.
- Monitorea errores de Graph (rate limits, permisos, etc.).

## 9) Troubleshooting

- 403 en verificación: revisa `WA_CLOUD_VERIFY_TOKEN` (debe coincidir exactamente).
- No llegan eventos: revisa suscripciones a `messages` y que ngrok esté activo.
- Mensajes no se envían: valida `WA_CLOUD_PHONE_ID` y `WA_CLOUD_ACCESS_TOKEN`.
- Formato del `to`: Cloud usa MSISDN sin `+` (ej. `57300XXXXXXX`).
