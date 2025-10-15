const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ✅ Importar rutas correctamente
const usuarioRoutes = require('./routes/usuario'); // singular, igual al nombre del archivo
const authRoutes = require('./routes/auth'); // login / autenticación

// ✅ Usar rutas con prefijo correcto
app.use('/api/usuario', usuarioRoutes);
app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
