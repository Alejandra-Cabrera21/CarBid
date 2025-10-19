// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

/* ===== Middleware base ===== */
app.use(cors());
app.use(express.json());

/* ===== Servir imágenes subidas ===== */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ===== Rutas API ===== */
const usuarioRoutes  = require('./routes/usuario');   // si no existen, comenta
const authRoutes     = require('./routes/auth');      // si no existen, comenta
const auctionsRoutes = require('./routes/auctions');  // importante
const bidsRoutes     = require('./routes/bids');      // asegúrate que exista este archivo

app.use('/api/usuario', usuarioRoutes);
app.use('/api/auth',    authRoutes);
app.use('/api/subastas', auctionsRoutes);
app.use('/api/pujas', bidsRoutes);

/* ===== Pings de prueba ===== */
app.get('/__ping', (_req, res) => res.json({ ok: true, where: 'root' }));
app.get('/api/subastas/__ping', (_req, res) => res.json({ ok: true, where: 'subastas-GET' }));
app.post('/api/subastas/__ping', (_req, res) => res.json({ ok: true, where: 'subastas-POST' }));

/* ===== Socket.IO ===== */
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

/* ===== Servir frontend (carpeta docs) ===== */
app.use(express.static(path.join(__dirname, 'docs')));

/* ===== Cierre automático de subastas vencidas ===== */
/* ====== Cierre automático de subastas vencidas ====== */
function closeExpiredAuctionsOnce() {
  const qSel = "SELECT id FROM subastas WHERE estado='ABIERTA' AND fin <= NOW()";
  db.query(qSel, [], (e, rows) => {
    if (e || !rows.length) return;
    const ids = rows.map(r => r.id);
    const qUpd = `
      UPDATE subastas 
      SET estado='CERRADA', updated_at=NOW() 
      WHERE id IN (${ids.map(() => '?').join(',')})
    `;
    db.query(qUpd, ids, (e2) => {
      if (!e2) {
        const io = app.get('io');
        io.emit('auction:closed', { ids });

        // 🔔 Notificar ganadores automáticamente
        ids.forEach(id => {
          const qGanador = `
            SELECT id_postor, monto 
            FROM pujas 
            WHERE id_subasta=? 
            ORDER BY monto DESC, created_at ASC 
            LIMIT 1
          `;
          db.query(qGanador, [id], (err, rows) => {
            if (!err && rows.length) {
              const ganador = rows[0];
              io.emit('auction:won', { id_subasta: id, id_postor: ganador.id_postor });
              console.log(`🏆 Notificado ganador de subasta ${id}`);
            }
          });
        });
      }
    });
  });
}

setInterval(closeExpiredAuctionsOnce, 20000);

/* ===== Iniciar servidor ===== */
httpServer.listen(PORT, () => {
  console.log(`🚀 HTTP + Socket.IO escuchando en http://localhost:${PORT}`);
});
