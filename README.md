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

---

## 👤 Autor
**Juan Diego** - Desarrollador principal.

