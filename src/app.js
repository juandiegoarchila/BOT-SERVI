// src/app.js
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import fastifyJWT from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swaggerConfig from './config/swagger-config.js';
import userRoutes from './routes/users.routes.js';
import whatsappWebhookRoutes from './routes/whatsapp-webhook.routes.js';
import sanitizeHtml from 'sanitize-html';
import { errorHandler } from './middlewares/error-handler.js';
import envConfig from './config/env-config.js';
// Eliminamos las importaciones de UnauthorizedError y NotFoundError, ya que no se usan

const app = Fastify({
  logger: {
    level: 'info',
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        host: req.headers.host,
        remoteAddress: req.ip,
        remotePort: req.socket.remotePort,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
  },
});
app.addHook('preValidation', (request, reply, done) => {
  // eslint-disable-line no-unused-vars
  // Silenciamos la advertencia de 'reply' no usado, ya que es parte de la firma de Fastify
  if (request.body) {
    for (const key in request.body) {
      if (typeof request.body[key] === 'string') {
        request.body[key] = sanitizeHtml(request.body[key], {
          allowedTags: [],
          allowedAttributes: {},
        });
      }
    }
  }
  done();
});

app.register(cors, {
  origin: envConfig.env === 'production' ? ['https://tuapp.com'] : true,
});
app.register(helmet, { global: true });
app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

app.register(fastifyJWT, {
  secret: envConfig.jwtSecret,
  sign: { expiresIn: '15m' },
});

app.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply
      .status(401)
      .send({
        success: false,
        message: 'Token inválido o expirado',
        code: 'ERR_UNAUTHORIZED',
      });
  }
});

swaggerConfig(app);
app.register(userRoutes, { prefix: '/api' });
app.register(whatsappWebhookRoutes);

// Usamos tu versión alternativa de setNotFoundHandler
app.setNotFoundHandler((request, reply) => {
  reply.status(404).type('text/html').send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error 404 - Página No Encontrada</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;700&display=swap" rel="stylesheet">
        <style>
            /* Estilos Generales */
            body {
                font-family: 'Poppins', sans-serif;
                background: #121212;
                color: white;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
            }
            /* Contenedor principal */
            .container {
                background: #22223b;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.3);
                max-width: 500px;
                text-align: center;
                animation: fadeIn 0.8s ease-in-out;
            }
            /* Título */
            h1 {
                font-size: 22px;
                font-weight: 700;
                color: #ff4b5c;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            /* Icono de error */
            h1 .icon {
                font-size: 26px;
            }
            /* Texto de error */
            p {
                font-size: 16px;
                margin: 10px 0;
            }
            /* Ruta en negrita */
            .ruta {
                font-weight: bold;
            }
            /* Link de la documentación */
            .link {
                color: #ff4b5c;
                font-weight: bold;
                text-decoration: none;
                pointer-events: all;
            }
            .link:hover {
                text-decoration: none;
                color: #ff4b5c;
            }
            /* Botón de regreso */
            .back-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 12px 24px;
                font-size: 16px;
                font-weight: 500;
                color: white;
                background: #007bff;
                border: none;
                border-radius: 8px;
                text-decoration: none;
                margin-top: 20px;
                transition: 0.3s;
                box-shadow: 0px 5px 15px rgba(0, 123, 255, 0.2);
            }
            .back-btn:hover {
                background: #0056b3;
                transform: scale(1.05);
            }
            /* Animación de aparición */
            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1><span>❌</span> Error 404 - Página No Encontrada</h1>
            <p>La ruta <strong>'${request.url}'</strong> no existe en este servidor.</p>
            <p>Verifica la URL o revisa la <a href="/api-docs" class="link">documentación de la API</a>.</p>
            <a href="/" class="back-btn">🔙 Regresar al inicio</a>
        </div>
    </body>
    </html>
  `);
});

app.setErrorHandler(errorHandler);

export default app;
