// =============================
// 📦 IMPORTS BÁSICOS
// =============================
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');
const db = require('./db');

// =============================
// 🧠 SENTRY (MONITOREO DE ERRORES)
// =============================
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: "https://97b0fdfbb4f73052653206ef49078728@o4510314853105664.ingest.us.sentry.io/4510314860642304",
  sendDefaultPii: true, // Captura información útil (como IPs y usuarios si los agregas)
  tracesSampleRate: 1.0, // Captura 100% de las trazas (puedes bajarlo en producción)
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware Sentry para capturar errores de request
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// =============================
// ⚙️ CONFIGURACIÓN BASE
// =============================
const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
app.use(express.json());

// =============================
// 🖼️ SERVIR IMÁGENES
// =============================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =============================
// 🚏 RUTAS API
// =============================
const usuarioRoutes        = require('./routes/usuario');
const authRoutes           = require('./routes/auth');
const auctionsRoutes       = require('./routes/auctions');
const bidsRoutes           = require('./routes/bids');
const notificacionesRoutes = require('./routes/notificaciones');
const historialPujasRoutes = require('./routes/historialPujas');
const historialSubastas    = require('./routes/historialSubastas');
const perfilRoutes         = require('./routes/perfil');

app.use('/api/usuario', usuarioRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/subastas', auctionsRoutes);
app.use('/api/pujas', bidsRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/historial-pujas', historialPujasRoutes);
app.use('/api/historial-subastas', historialSubastas);
app.use('/api/perfil', perfilRoutes);

// =============================
// 🧪 PINGS DE PRUEBA
// =============================
app.get('/__ping', (_req, res) => res.json({ ok: true, where: 'root' }));
app.get('/api/subastas/__ping', (_req, res) => res.json({ ok: true, where: 'subastas-GET' }));
app.post('/api/subastas/__ping', (_req, res) => res.json({ ok: true, where: 'subastas-POST' }));

// =============================
// ⚡ SOCKET.IO
// =============================
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET','POST','PATCH'] },
  path: '/socket.io'
});
app.set('io', io);

io.on('connection', (socket) => {
  console.log('🟢 Cliente conectado a tiempo real');
  socket.emit('hello', { message: 'Conectado a tiempo real' });
});

// =============================
// 📁 SERVIR FRONTEND (docs/)
// =============================
app.use(express.static(path.join(__dirname, 'docs')));

// =============================
// 🔒 CIERRE AUTOMÁTICO DE SUBASTAS
// =============================
function closeExpiredAuctionsOnce() {
  const qSel = `
    SELECT id 
    FROM subastas 
    WHERE estado='ABIERTA' 
    AND fin <= NOW()
  `;

  db.query(qSel, [], (err, subastas) => {
    if (err) {
      console.error('❌ Error buscando subastas vencidas:', err);
      return;
    }

    if (!subastas.length) return;

    const ids = subastas.map(s => s.id);
    const qUpd = `
      UPDATE subastas 
      SET estado='CERRADA', updated_at=NOW() 
      WHERE id IN (${ids.map(() => '?').join(',')})
    `;

    db.query(qUpd, ids, (err2) => {
      if (err2) {
        console.error('❌ Error actualizando subastas:', err2);
        return;
      }

      const io = app.get('io');
      io.emit('auction:closed', { ids });
      io.emit('auction:updated', { ids });
      console.log(`🔒 Subastas cerradas automáticamente: ${ids.join(', ')}`);

      ids.forEach(id => {
        const qGanador = `
          SELECT id_postor, monto 
          FROM pujas 
          WHERE id_subasta=? 
          ORDER BY monto DESC, created_at ASC 
          LIMIT 1
        `;
        db.query(qGanador, [id], (err3, rows) => {
          if (err3) {
            console.error(`❌ Error buscando ganador subasta ${id}:`, err3);
            return;
          }
          if (rows.length) {
            const ganador = rows[0];

            const qInsert = `
              INSERT INTO ganadores (id_subasta, id_postor, monto)
              SELECT ?, ?, ?
              WHERE NOT EXISTS (
                SELECT 1 FROM ganadores WHERE id_subasta = ?
              )
            `;
            db.query(qInsert, [id, ganador.id_postor, ganador.monto, id], (err4) => {
              if (err4) console.error("⚠️ Error insertando ganador:", err4);
            });

            const io = app.get('io');
            io.emit('auction:won', { id_subasta: id, id_postor: ganador.id_postor });
            console.log(`🏁 Notificado ganador subasta ${id} → usuario ${ganador.id_postor}`);
          }
        });
      });
    });
  });
}

setInterval(closeExpiredAuctionsOnce, 20000);

// =============================
// 🧩 PRUEBA DE CONEXIÓN A BD
// =============================
app.get('/', (_req, res) => res.status(200).send('OK'));
app.get('/__ping', async (req, res) => {
  try {
    const [rows] = await db.promise().query('SELECT NOW() AS time');
    res.json({ ok: true, db: true, time: rows[0].time });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// =============================
// 🚨 SENTRY: CAPTURA DE ERRORES
// =============================
app.use(Sentry.Handlers.errorHandler());

// Middleware genérico por si ocurre un error no capturado
app.use((err, req, res, next) => {
  console.error("🔥 Error no manejado:", err);
  res.status(500).json({ error: "Error interno del servidor" });
});

// =============================
// 🚀 INICIAR SERVIDOR
// =============================
httpServer.listen(PORT, () => {
  console.log(`🚀 HTTP + Socket.IO escuchando en http://localhost:${PORT}`);
});

app.get('/debug-sentry', function mainHandler(req, res) {
  throw new Error("⚡ Prueba de Sentry funcionando correctamente!");
});