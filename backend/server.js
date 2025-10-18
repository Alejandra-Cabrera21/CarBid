const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

/* CORS + JSON */
app.use(cors());
app.use(express.json());

/* Servir imágenes subidas */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* Rutas */
const usuarioRoutes  = require('./routes/usuario');   // si no existen, coméntalas
const authRoutes     = require('./routes/auth');      // idem
const auctionsRoutes = require('./routes/auctions');  // << ESTA ES LA IMPORTANTE

app.use('/api/usuario', usuarioRoutes);
app.use('/api/auth',    authRoutes);
app.use('/api/subastas', auctionsRoutes);

/* Pings (útiles si algo falla) */
app.get('/__ping', (_req, res) => res.json({ ok: true, where: 'root' }));
app.get('/api/subastas/__ping', (_req, res) => res.json({ ok: true, where: 'subastas-GET' }));
app.post('/api/subastas/__ping', (_req, res) => res.json({ ok: true, where: 'subastas-POST' }));

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
