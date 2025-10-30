// backend/models/usuarioModel.js
const db = require('../db');

// Helper para normalizar a 'S'/'N'
const toSN = (v) =>
  (v === 'S' || v === true || v === 1 || v === '1' || v === 'true') ? 'S' : 'N';

// =====================
//      CREAR USUARIO
// =====================
exports.crearUsuario = (usuario, callback) => {
  const { nombre, correo, contraseña, es_vendedor, es_comprador } = usuario;

  const vendedorChar  = toSN(es_vendedor);
  const compradorChar = toSN(es_comprador);

  const sql = `
    INSERT INTO usuarios (nombre, correo, contraseña, es_vendedor, es_comprador)
    VALUES (?, ?, ?, ?, ?)
  `;
  db.query(sql, [nombre, correo, contraseña, vendedorChar, compradorChar], (err, result) => {
    if (err) return callback(err);
    callback(null, result);
  });
};

// =====================
//  BUSCAR POR CORREO
// =====================
exports.buscarPorCorreo = (correo, callback) => {
  const sql = 'SELECT * FROM usuarios WHERE correo = ?';
  db.query(sql, [correo], (err, rows) => {
    if (err) return callback(err);
    callback(null, rows);
  });
};

// =====================
//    BUSCAR POR ID
// =====================
exports.buscarPorId = (id, callback) => {
  const sql = `
    SELECT id, nombre, correo, es_vendedor, es_comprador
    FROM usuarios
    WHERE id = ?
  `;
  db.query(sql, [id], (err, rows) => {
    if (err) return callback(err);
    callback(null, rows && rows[0] ? rows[0] : null);
  });
};

// =====================
//  ACTUALIZAR PARCIAL
// =====================
exports.actualizarUsuario = (id, data, callback) => {
  const campos = [];
  const vals   = [];

  if (Object.prototype.hasOwnProperty.call(data, 'nombre'))          { campos.push('nombre=?');          vals.push(data.nombre); }
  if (Object.prototype.hasOwnProperty.call(data, 'correo'))          { campos.push('correo=?');          vals.push(data.correo); }
  // Si te pasan contraseña **ya hasheada** como `contraseña_hash`, se guarda en columna `contraseña`
  if (Object.prototype.hasOwnProperty.call(data, 'contraseña_hash')) { campos.push('contraseña=?');      vals.push(data.contraseña_hash); }
  if (Object.prototype.hasOwnProperty.call(data, 'es_vendedor'))     { campos.push('es_vendedor=?');     vals.push(toSN(data.es_vendedor)); }
  if (Object.prototype.hasOwnProperty.call(data, 'es_comprador'))    { campos.push('es_comprador=?');    vals.push(toSN(data.es_comprador)); }

  if (!campos.length) return callback(null, { affectedRows: 0 });

  const sql = `UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`;
  vals.push(id);

  db.query(sql, vals, (err, r) => {
    if (err) return callback(err);
    callback(null, r);
  });
};
