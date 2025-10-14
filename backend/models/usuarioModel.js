// backend/models/usuarioModel.js
const db = require('../db');  // ← ruta correcta, relativo a /models

// Normaliza a 'S'/'N' solo si el valor realmente significa "sí"
function toSN(v) {
  return (v === 'S' || v === true || v === 1 || v === '1' || v === 'true') ? 'S' : 'N';
}

// 🟢 Crear usuario nuevo
exports.crearUsuario = (usuario, callback) => {
  const { nombre, correo, contraseña, es_vendedor, es_comprador } = usuario;

  // Normalización estricta (evita que 'N' se trate como true en JS)
  const vendedorChar  = toSN(es_vendedor);
  const compradorChar = toSN(es_comprador);

  const sql = `
    INSERT INTO usuarios (nombre, correo, contraseña, es_vendedor, es_comprador)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(sql, [nombre, correo, contraseña, vendedorChar, compradorChar], (err, result) => {
    if (err) {
      console.error("❌ Error al insertar usuario:", err.sqlMessage || err);
      return callback(err);
    }
    console.log("✅ Usuario insertado correctamente");
    callback(null, result);
  });
};

// 🔍 Buscar usuario por correo
exports.buscarPorCorreo = (correo, callback) => {
  const sql = 'SELECT * FROM usuarios WHERE correo = ?';
  db.query(sql, [correo], (err, result) => {
    if (err) {
      console.error("❌ Error al buscar usuario:", err.sqlMessage || err);
      return callback(err);
    }
    callback(null, result);
  });
};
