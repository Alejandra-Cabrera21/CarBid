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

/* CORS + JSON */
app.use(cors());
app.use(express.json());

/* Servir imágenes subidas */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* Rutas */
const usuarioRoutes  = require('./routes/usuario');   // si no existen, comenta
const authRoutes     = require('./routes/auth');      // si no existen, comenta
const auctionsRoutes = require('./routes/auctions');  // importante

app.use('/api/usuario', usuarioRoutes);
app.use('/api/auth',    authRoutes);
app.use('/api/subastas', auctionsRoutes);

/* Pings */
app.get('/__ping', (_req, res) => res.json({ ok: true, where: 'root' }));
app.get('/api/subastas/__ping', (_req, res) => res.json({ ok: true, where: 'subastas-GET' }));
app.post('/api/subastas/__ping', (_req, res) => res.json({ ok: true, where: 'subastas-POST' }));

/* ====== Socket.IO ====== */
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET','POST','PATCH'] },
  path: '/socket.io'
});
app.set('io', io);

io.on('connection', (socket) => {
  socket.emit('hello', { message: 'Conectado a tiempo real' });
});

/* ====== Cierre automático de subastas vencidas ====== */
function closeExpiredAuctionsOnce() {
  const qSel = "SELECT id FROM subastas WHERE estado='ABIERTA' AND fin <= NOW()";
  db.query(qSel, [], (e, rows) => {
    if (e || !rows.length) return;
    const ids = rows.map(r => r.id);
    const qUpd = "UPDATE subastas SET estado='CERRADA', updated_at=NOW() WHERE id IN (" + ids.map(()=>'?').join(',') + ")";
    db.query(qUpd, ids, (e2) => {
      if (!e2) io.emit('auction:closed', { ids });
    });
  });
}
setInterval(closeExpiredAuctionsOnce, 20000);

/* Start */
httpServer.listen(PORT, () => {
  console.log(`🚀 HTTP+Socket.IO en puerto ${PORT}`);
});
