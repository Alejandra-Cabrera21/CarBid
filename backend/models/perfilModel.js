// backend/models/perfilModel.js
const db = require('../db');

// perfil por ID (los campos que muestra la pantalla)
exports.obtenerPerfilPorId = (id, cb) => {
  const sql = `
    SELECT id, nombre, correo, es_vendedor, es_comprador
    FROM usuarios
    WHERE id = ?
  `;
  db.query(sql, [id], (err, rows) => {
    if (err) return cb(err);
    cb(null, rows && rows[0] ? rows[0] : null);
  });
};

// ✍️ Actualizar perfil (parcial)
exports.actualizarPerfil = (id, data, cb) => {
  const campos = [];
  const vals = [];

  if (Object.prototype.hasOwnProperty.call(data, 'nombre'))       { campos.push('nombre=?');       vals.push(data.nombre); }
  if (Object.prototype.hasOwnProperty.call(data, 'correo'))       { campos.push('correo=?');       vals.push(data.correo); }
  if (Object.prototype.hasOwnProperty.call(data, 'contraseña'))   { campos.push('contraseña=?');   vals.push(data.contraseña); }
  if (Object.prototype.hasOwnProperty.call(data, 'es_vendedor'))  { campos.push('es_vendedor=?');  vals.push(data.es_vendedor); }
  if (Object.prototype.hasOwnProperty.call(data, 'es_comprador')) { campos.push('es_comprador=?'); vals.push(data.es_comprador); }

  if (!campos.length) return cb(null, { affectedRows: 0 });

  const sql = `UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`;
  vals.push(id);

  db.query(sql, vals, (err, r) => (err ? cb(err) : cb(null, r)));
};
