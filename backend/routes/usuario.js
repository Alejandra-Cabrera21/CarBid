const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const Usuario = require('../models/usuarioModel');

// 🟢 REGISTRO DE USUARIO (permite ambos roles)
router.post('/register', (req, res) => {
  let { nombre, correo, contraseña, es_vendedor, es_comprador } = req.body;

  if (!nombre || !correo || !contraseña) {
    return res.status(400).json({ mensaje: 'Faltan datos.' });
  }

  // Normalizar a 'S' o 'N'
  const toS_N = (val) => (val === true || val === 'S' || val === '1' ? 'S' : 'N');
  es_vendedor  = toS_N(es_vendedor);
  es_comprador = toS_N(es_comprador);

  // Debe tener al menos uno seleccionado
  if (es_vendedor === 'N' && es_comprador === 'N') {
    return res.status(400).json({ mensaje: 'Selecciona vender o comprar.' });
  }

  // Verificar si el correo ya existe
  Usuario.buscarPorCorreo(correo, (err, results) => {
    if (err) return res.status(500).json({ mensaje: 'Error en la base de datos.' });
    if (results.length > 0) {
      return res.status(400).json({ mensaje: 'El correo ya está registrado.' });
    }

    // Encriptar la contraseña
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
      res.json({ mensaje: 'Registro correcto' });
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
      console.error('Error al verificar correo:', err);
      return res.status(500).json({ encontrado: false, mensaje: 'Error en la base de datos.' });
    }

    res.json({ encontrado: results.length > 0 });
  });
});

module.exports = router;
