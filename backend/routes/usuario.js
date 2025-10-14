const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const Usuario = require('../models/usuarioModel');

// 🟢 REGISTRO DE USUARIO (rol único)
router.post('/register', (req, res) => {
  let { nombre, correo, contraseña, rol } = req.body;

  if (!nombre || !correo || !contraseña) {
    return res.status(400).json({ mensaje: 'Faltan datos.' });
  }

  // Validar y normalizar rol
  rol = (rol === 'v' || rol === 'c') ? rol : null;
  if (!rol) {
    return res.status(400).json({ mensaje: 'Debes elegir Vender (v) o Comprar (c).' });
  }

  // Derivar flags desde el rol (exclusivos)
  const es_vendedor  = (rol === 'v') ? 'S' : 'N';
  const es_comprador = (rol === 'c') ? 'S' : 'N';

  // Verificar si el correo ya existe
  Usuario.buscarPorCorreo(correo, (err, results) => {
    if (err) return res.status(500).json({ mensaje: 'Error en la base de datos.' });
    if (results.length > 0) {
      return res.status(400).json({ mensaje: 'El correo ya está registrado.' });
    }

    // Encriptar la contraseña antes de guardar
    const hash = bcrypt.hashSync(contraseña, 10);

    const nuevoUsuario = {
      nombre,
      correo,
      contraseña: hash,
      es_vendedor,
      es_comprador,
    };

    Usuario.crearUsuario(nuevoUsuario, (err2) => {
      if (err2) return res.status(500).json({ mensaje: 'Error al registrar usuario.' });
      res.json({ mensaje: 'Usuario registrado correctamente ✅' });
    });
  });
});

// 🔍 VERIFICAR SI UN CORREO YA EXISTE (para validación previa del frontend)
router.post('/check', (req, res) => {
  const { correo } = req.body;

  if (!correo) {
    return res.status(400).json({ encontrado: false, mensaje: 'Correo no proporcionado.' });
  }

  Usuario.buscarPorCorreo(correo, (err, results) => {
    if (err) {
      console.error('❌ Error al verificar correo:', err);
      return res.status(500).json({ encontrado: false, mensaje: 'Error en la base de datos.' });
    }

    if (results.length > 0) {
      return res.json({ encontrado: true });
    } else {
      return res.json({ encontrado: false });
    }
  });
});

module.exports = router;
