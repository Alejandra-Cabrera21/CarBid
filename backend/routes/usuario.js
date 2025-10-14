const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const Usuario = require('../models/usuarioModel');

// 🟢 REGISTRO
router.post('/register', (req, res) => {
  const { nombre, correo, contraseña, es_vendedor, es_comprador } = req.body;

  if (!nombre || !correo || !contraseña) {
    return res.status(400).json({ mensaje: 'Faltan datos.' });
  }

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

module.exports = router;
