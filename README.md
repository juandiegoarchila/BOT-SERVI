# 🚀 SERVI - BOT

## ✅ WhatsApp Business Cloud API (oficial)
Si prefieres ir por el camino oficial (recomendado para producción y para usar botones interactivos), este proyecto ya soporta Cloud API mediante webhook.

- Guía completa: ver `src/docs/whatsapp-cloud-setup.md`.
- Resumen rápido:
  - En `.env` define `WHATSAPP_PROVIDER=cloud` y completa `WA_CLOUD_*`.
  - Levanta la API: `npm run dev`.
  - Expón local con ngrok y configura el webhook en Meta: `https://<ngrok>/webhook/whatsapp`.
  - No ejecutes `npm run bot` cuando uses Cloud API (no es necesario).
  - Ya puedes enviar texto, imágenes y botones.
# 🚀 SERVI - BOT

## SERVI-BOT
SERVI-BOT es un asistente automatizado de WhatsApp diseñado para el Restaurante Cocina Casera. Permite a los clientes realizar pedidos de almuerzos de manera interactiva, especificando cantidades, opciones de comida (sopa, principio, proteína, bebida), dirección de entrega, método de pago y más. Este bot está construido con Node.js y utiliza la librería whatsapp-web.js para integrarse con WhatsApp.

---

## 📖 Descripción General
El bot guía al usuario a través de un flujo conversacional para:

- Elegir cuántos almuerzos desea.
- Configurar cada almuerzo (sopa, principio, proteína, bebida).
- Especificar la hora de entrega (entre 11:30 AM y 3:45 PM).
- Indicar direcciones de entrega (misma o diferente por almuerzo).
- Seleccionar método de pago (Efectivo, Nequi, Daviplata).
- Confirmar el pedido y enviar una notificación al restaurante.
- Manejo de errores, soporte para imágenes (como el menú) y limpieza automática de conversaciones inactivas.

---

## 📚 Estructura del Proyecto
```
C:\Users\juand\Cominezo-de-proyectos-Express\SERVI\
├── src/
│   ├── config/
│   │   └── order-config.js          # Configuraciones como MENU_PHOTO_URL, CLOSED_MESSAGE, CONVERSATION_TIMEOUT
│   ├── handlers/
│   │   ├── adjustment-handlers.js   # Funciones para ajustar almuerzos existentes (sopa, proteína, etc.)
│   │   ├── initial-handlers.js      # Maneja el estado inicial: envía mensaje de bienvenida con imagen del menú
│   │   ├── lunch-handlers.js        # Define los detalles de los almuerzos (grupos o individuales)
│   │   ├── order-handlers.js        # Gestiona el flujo final: hora, dirección, pago, confirmación
│   │   └── state-dispatcher.js      # Despacha mensajes a los handlers según el estado de la conversación
│   ├── services/
│   │   └── order.service.js         # Lógica central: gestiona conversaciones y procesa mensajes
│   ├── utils/
│   │   ├── conversation-utils.js    # Utilidades para validar campos y generar resúmenes de pedidos
│   │   ├── logger.js                # Configuración del logger para registrar eventos
│   │   └── order-utils.js           # Funciones como normalizar tiempo y encontrar coincidencias
│   └── whatsapp-bot.js              # Archivo principal: inicializa el cliente de WhatsApp
├── package.json                     # Dependencias y scripts del proyecto
└── .eslintrc.js                     # Configuración de ESLint para mantener el código limpio
```

---

## 🛠️ Requisitos
### Dependencias
- **Node.js:** v16 o superior.
- **npm:** Para instalar las dependencias.
- **Paquetes requeridos (definidos en package.json):**
  - `whatsapp-web.js`: Para la integración con WhatsApp.
  - `qrcode-terminal`: Muestra el código QR en la terminal para autenticación.
  - `winston`: Para el manejo de logs.
  - `eslint`: Herramienta de linting (desarrollo).

### Configuración
- Un enlace público de Google Drive para el menú (MENU_PHOTO_URL en `order-config.js`).
- Un número de WhatsApp para recibir notificaciones del restaurante (ajustar en `whatsapp-bot.js`).

---

## ⚙️ Instalación y Ejecución
### Clonar el proyecto:
```bash
git clone <URL_DEL_REPOSITORIO>
cd SERVI
```

### Instalar dependencias:
```bash
npm install
```

### Configurar variables:
- Edita `src/config/order-config.js` con el enlace correcto de `MENU_PHOTO_URL`.
- Ajusta `whatsapp-bot.js` con el número del restaurante en la sección de `notify`.

### Iniciar el bot:
```bash
npm run bot
```
- Escanea el código QR que aparece en la terminal con tu WhatsApp.
- Prueba enviando "Hola" al número conectado al bot para iniciar un pedido.

### Linting (opcional):
```bash
npm run lint
```

---

## 🌟 Características Principales
- **Interfaz conversacional:** Responde a números (ej. "1") o palabras (ej. "uno").
- **Soporte multimedia:** Envía la imagen del menú al iniciar.
- **Gestión de pedidos múltiples:** Permite configurar almuerzos iguales o diferentes.
- **Ajustes:** Los usuarios pueden modificar detalles de los almuerzos antes de confirmar.
- **Notificaciones:** Envía el pedido confirmado al restaurante vía WhatsApp.
- **Horario:** Solo acepta pedidos entre 11:30 AM y 3:45 PM.
- **Feedback:** Pide una calificación (1-4) tras completar el pedido.

---

## 📋 Flujo de Uso
1. **Inicio:** El usuario envía "Hola" y recibe un mensaje de bienvenida con el menú.
2. **Cantidad:** Indica cuántos almuerzos quiere (ej. "2").
3. **Configuración:** Define sopa, principio, proteína y bebida para cada almuerzo.
4. **Entrega:** Especifica hora y dirección(es).
5. **Pago:** Elige método de pago y si desea cubiertos.
6. **Confirmación:** Revisa el resumen y confirma con "1" o ajusta con "2".
7. **Final:** Recibe confirmación y da feedback (1-4).

---

## 🧰 Detalles Técnicos
### Estados de la Conversación
Manejados por `state-dispatcher.js`:

- `initial`: Bienvenida y solicitud de cantidad.
- `defining_*`: Configuración de almuerzos (sopa, principio, etc.).
- `ordering_*`: Hora, dirección, pago, cubiertos.
- `preview_order`: Resumen del pedido.
- `completed`: Confirmación y feedback.

### Manejo de Errores
- **Mensajes no entendidos:** Incrementa `errorCount` y sugiere "ayuda" tras 3 errores.
- **Inactividad:** Elimina conversaciones tras 15 minutos (`CONVERSATION_TIMEOUT`).
- **Horario:** Rechaza pedidos fuera del horario con `CLOSED_MESSAGE`.

### Logs
- Usando `winston`, registra eventos como procesamiento de mensajes y errores en la consola.

---

## 📦 Dependencias Clave
| Dependencia       | Versión  | Propósito                                |
|-------------------|---------|------------------------------------------|
| whatsapp-web.js  | ^1.23.0 | Comunicación con WhatsApp                |
| qrcode-terminal  | ^0.12.0 | Generación de QR para autenticación     |
| winston         | ^3.11.0 | Registro de logs                         |
| eslint          | ^8.57.0 | Linting y corrección de código           |

---

## 🔧 Posibles Mejoras
- **Base de datos:** Almacenar pedidos y conversaciones en lugar de memoria (`Map`).
- **Multi-idioma:** Soporte para inglés u otros idiomas.
- **Menú dinámico:** Actualizar el menú desde un archivo o API.
- **Validación avanzada:** Mejor detección de direcciones y horarios.
- **Notificaciones push:** Enviar recordatorios al cliente antes de la entrega.
- **Tests:** Añadir pruebas unitarias con Jest o Mocha.

---

## 📅 Historial de Desarrollo
- **Marzo 13, 2025:** Versión inicial funcional con ESLint, envío de imagen del menú y notificaciones.
- **Diciembre 5, 2025:** Implementación completa del sistema de opciones de ayuda con detección automática de pedidos web y gestión inteligente de timers.

---

## 📋 INFORME FINAL DE FLUJO — BOT COCINA CASERA

### ✅ **Flujo de Opciones de Ayuda (2, 3, 4, 5)**

#### 1️⃣ **Cliente selecciona opción → Bot responde con video**
- El bot envía el video tutorial con el mensaje explicativo como caption (todo en UN solo mensaje)
- Se programa un timer de 10 minutos para recordatorio

#### 2️⃣ **10 minutos sin respuesta → Envío de recordatorio**
- Se envía mensaje: "¿Aún no sabes qué pedir, veci? 😊..." 
- Seguido del menú de opciones completo

#### 3️⃣ **Cliente escribe ANTES de los 10 min → Cancelación y refuerzo**
- ✅ Se cancela inmediatamente el timeout pendiente
- ✅ Se envía video de apoyo con mensaje de reexplicación (segunda oportunidad)
- ✅ Se programa nuevo timer de 10 minutos

#### 4️⃣ **Después del refuerzo → Nuevo ciclo de espera**
- Si el cliente no escribe en 10 min → Se envía recordatorio final + menú
- Si el cliente escribe → Ya no se envían más videos de refuerzo

### ✅ **Detección Automática de Pedido Web**

#### 1️⃣ **Sistema de detección prioritaria**
- El bot detecta automáticamente pedidos por el texto: `"¡Hola Cocina Casera!"`
- Esta detección tiene **PRIORIDAD MÁXIMA** sobre cualquier otro flujo

#### 2️⃣ **Cancelación inmediata de timers**
```javascript
// Se cancelan TODOS los timers de:
- Recordatorios de opciones
- Videos de refuerzo
- Menús pendientes
```

#### 3️⃣ **Reseteo de banderas del flujo**
```javascript
// Se resetean automáticamente:
- option5Selected = false
- explanationSentAfterOption5 = false
- awaitingExplanationAfterVideo = false
- menuReminderSent = true
- assistanceShown = false
```

#### 4️⃣ **Respuesta de confirmación única**
- ✅ Se envía SOLO el mensaje de confirmación del pedido
- ✅ NO se envían más videos tutoriales
- ✅ NO se envían más menús de opciones
- ✅ El flujo cambia completamente a gestión de pago

### ✅ **Sistema de Detección de Método de Pago**

#### Métodos soportados:
1. **Efectivo** → No se esperan comprobantes, no hay recordatorios
2. **Nequi** → Se activan recordatorios de pago (1, 3 y 5 minutos)
3. **Daviplata** → Se activan recordatorios de pago (1, 3 y 5 minutos)
4. **Bancolombia** → Se activan recordatorios de pago (1, 3 y 5 minutos)

### ✅ **Flujo de Recordatorios de Pago**

#### Cronología de recordatorios:
- **1 minuto** después → "Por favor, comparte el comprobante de pago 📲💳"
- **3 minutos** después → Segundo recordatorio
- **5 minutos** después → Tercer y último recordatorio

#### Cancelación automática:
- Al enviar el comprobante → Se cancelan todos los recordatorios pendientes
- Al detectar la imagen → Se procesa con Google Cloud Vision API

### ✅ **Comportamiento Post-Pedido**

#### Después de recibir el pedido web:
1. ❌ **NO más videos tutoriales**
2. ❌ **NO más menús de opciones**
3. ❌ **NO más explicaciones de uso**
4. ✅ **SOLO gestión de pago y entrega**

#### El bot únicamente:
- Confirma recepción del pedido
- Solicita comprobante (si aplica)
- Procesa el comprobante recibido
- Espera mensajes del domiciliario (flujo externo)

### 🔧 **Mecanismos Técnicos Implementados**

#### Sistema de cancelación de timers:
```javascript
function cancelReminderTimeout(phone) {
  const state = conversations.get(phone);
  if (state && state.reminderTimeout) {
    clearTimeout(state.reminderTimeout);
    state.reminderTimeout = null;
    logger.info(`✅ Timeout CANCELADO para ${phone}`);
    return true;
  }
}
```

#### Detección prioritaria de pedido web:
```javascript
// Se ejecuta ANTES de cualquier otra lógica
if (normalized.includes('hola cocina casera')) {
  // Cancelar timers
  // Resetear flags
  // Procesar pedido
  // Activar flujo de pago
  return confirmationMessage;
}
```

#### Protección contra doble procesamiento:
```javascript
if (state.awaitingExplanationAfterVideo && !state.webOrderReceived) {
  // Solo entra si NO se ha recibido pedido web
}
```

### 📊 **Estados del Bot**

| Estado | Descripción | Próximo paso |
|--------|-------------|--------------|
| `initial` | Menú principal mostrado | Espera selección de opción |
| `option5Selected` | Opción 2-5 seleccionada | Envía video + programa timer |
| `awaitingExplanationAfterVideo` | Esperando respuesta tras video | Si escribe: refuerzo / Si no: recordatorio |
| `webOrderReceived` | Pedido web detectado | Flujo de pago activo |
| `waitingForPayment` | Esperando comprobante | Recordatorios de pago activos |
| `paymentReceived` | Comprobante recibido | Fin del flujo automatizado |

### 🎯 **Garantías del Sistema**

1. ✅ **Timer único activo** - Solo un timer de recordatorio puede estar activo por usuario
2. ✅ **Cancelación garantizada** - Los timers se cancelan al detectar actividad del usuario
3. ✅ **Detección prioritaria** - Los pedidos web se detectan antes que cualquier otro flujo
4. ✅ **Sin mensajes duplicados** - Los recordatorios no se envían si el usuario ya respondió
5. ✅ **Flujo limpio post-pedido** - Ningún mensaje de ayuda se envía después del pedido
6. ✅ **Recordatorios de pago inteligentes** - Solo se activan para métodos digitales

### 🚀 **Ventajas del Sistema Actual**

- **Experiencia fluida**: El cliente nunca recibe mensajes duplicados o irrelevantes
- **Detección automática**: No requiere intervención manual para detectar pedidos
- **Gestión inteligente**: El bot sabe cuándo cambiar de contexto (ayuda → pedido → pago)
- **Escalabilidad**: El sistema puede manejar múltiples conversaciones simultáneas
- **Cancelación eficiente**: Los recursos se liberan inmediatamente al detectar cambios

---

## 👤 Autor
**Juan Diego** - Desarrollador principal.

