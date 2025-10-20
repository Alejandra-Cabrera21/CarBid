// backend/routes/perfil.js
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

const Perfil = require('../models/perfilModel');
const Usuario = require('../models/usuarioModel'); // solo para validar correo único

// GET /api/perfil/:id  -> { id, nombre, correo, es_vendedor, es_comprador }
router.get('/:id', (req, res) => {
  Perfil.obtenerPerfilPorId(req.params.id, (err, user) => {
    if (err)   return res.status(500).json({ mensaje: 'Error en la base de datos.' });
    if (!user) return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    return res.json(user);
  });
});

// PATCH /api/perfil/:id  -> Actualiza parcialmente (contraseña sólo si se envía)
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  let { nombre, correo, contraseña, es_vendedor, es_comprador } = req.body;

  const toSN = v => (v === true || v === 'S' || v === 1 || v === '1' || v === 'true') ? 'S' : 'N';
  if (es_vendedor  !== undefined) es_vendedor  = toSN(es_vendedor);
  if (es_comprador !== undefined) es_comprador = toSN(es_comprador);

  if (es_vendedor !== undefined && es_comprador !== undefined) {
    if (es_vendedor === 'N' && es_comprador === 'N')
      return res.status(400).json({ mensaje: 'Selecciona vender o comprar.' });
  }

  const continuar = () => {
    const payload = {};
    if (nombre !== undefined)       payload.nombre = nombre;
    if (correo !== undefined)       payload.correo = correo;
    if (es_vendedor !== undefined)  payload.es_vendedor = es_vendedor;
    if (es_comprador !== undefined) payload.es_comprador = es_comprador;
    if (contraseña)                 payload.contraseña = bcrypt.hashSync(contraseña, 10);

    Perfil.actualizarPerfil(id, payload, (err2, r) => {
      if (err2) return res.status(500).json({ mensaje: 'Error al actualizar.' });
      return res.json({ ok: true, actualizado: r.affectedRows > 0 });
    });
  };

  // validar correo único si se envía
  if (correo !== undefined) {
    Usuario.buscarPorCorreo(correo, (err, rows) => {
      if (err) return res.status(500).json({ mensaje: 'Error validando correo.' });
      const usadoPorOtro = rows.some(u => String(u.id) !== String(id));
      if (usadoPorOtro) return res.status(400).json({ mensaje: 'El correo ya está registrado por otro usuario.' });
      continuar();
    });
  } else {
    continuar();
  }
});

module.exports = router;
