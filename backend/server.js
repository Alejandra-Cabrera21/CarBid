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

const corsOptions = {
  origin: "*", // acepta peticiones desde cualquier dominio (por ahora)
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());


/* ===== Servir imágenes subidas ===== */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ===== Rutas API ===== */
const usuarioRoutes       = require('./routes/usuario');
const authRoutes          = require('./routes/auth');
const auctionsRoutes      = require('./routes/auctions');
const bidsRoutes          = require('./routes/bids');
const notificacionesRoutes = require('./routes/notificaciones');
const historialPujasRoutes = require('./routes/historialPujas'); //nueva ruta
const perfilRoutes = require('./routes/perfil');   // NUEVO
// server.js
// backend/server.js
const historialSubastas = require('./routes/historialSubastas');


app.use('/api/usuario', usuarioRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/subastas', auctionsRoutes);
app.use('/api/pujas', bidsRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/historial-pujas', historialPujasRoutes); // nueva línea añadida
app.use('/api/historial-subastas', historialSubastas);

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
  console.log('Cliente conectado a tiempo real');
  socket.emit('hello', { message: 'Conectado a tiempo real' });
});

/* ===== Servir frontend (carpeta docs) ===== */
app.use(express.static(path.join(__dirname, 'docs')));

/* ====== Cierre automático de subastas vencidas ====== */
function closeExpiredAuctionsOnce() {
  const qSel = `
    SELECT id 
    FROM subastas 
    WHERE estado='ABIERTA' 
    AND fin <= NOW()
  `;

  db.query(qSel, [], (err, subastas) => {
    if (err) {
      console.error('Error buscando subastas vencidas:', err);
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
        console.error('Error actualizando subastas:', err2);
        return;
      }

      const io = app.get('io');
      io.emit('auction:closed', { ids });
      io.emit('auction:updated', { ids }); //nuevo evento para refrescar el frontend dinámicamente
      console.log(` cerradas automáticamente: ${ids.join(', ')}`);

      //Notificar ganadores automáticamente
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
            console.error(`Error buscando ganador subasta ${id}:`, err3);
            return;
          }
      if (rows.length) {
  const ganador = rows[0];

  // guardar en tabla ganadores si aún no existe
  const qInsert = `
    INSERT INTO ganadores (id_subasta, id_postor, monto)
    SELECT ?, ?, ?
    WHERE NOT EXISTS (
      SELECT 1 FROM ganadores WHERE id_subasta = ?
    )
  `;
  db.query(qInsert, [id, ganador.id_postor, ganador.monto, id], (err4) => {
    if (err4) console.error("Error insertando ganador:", err4);
  });

  //Emitir evento al frontend
  const io = app.get('io');
  io.emit('auction:won', { id_subasta: id, id_postor: ganador.id_postor });
  console.log(`Notificado ganador subasta ${id} → usuario ${ganador.id_postor}`);
}

        });
      });
    });
  });
}

setInterval(closeExpiredAuctionsOnce, 20000);

/* ===== Pings de prueba ===== */
app.get('/', (_req, res) => res.status(200).send('OK'));
app.get('/__ping', async (req, res) => {
  try {
    const [rows] = await db.promise().query('SELECT NOW() AS time');
    res.json({ ok: true, db: true, time: rows[0].time });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});



/* ===== Iniciar servidor ===== */
httpServer.listen(PORT, () => {
  console.log(`HTTP + Socket.IO escuchando en http://localhost:${PORT}`);
});
