const db = require('../db');

// 🟢 Crear usuario nuevo
exports.crearUsuario = (usuario, callback) => {
  const { nombre, correo, contraseña, es_vendedor, es_comprador } = usuario;

  // Convertimos booleanos a CHAR(1)
  const vendedorChar = es_vendedor ? 'S' : 'N';
  const compradorChar = es_comprador ? 'S' : 'N';

  const sql = `
    INSERT INTO usuarios (nombre, correo, contraseña, es_vendedor, es_comprador)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(sql, [nombre, correo, contraseña, vendedorChar, compradorChar], (err, result) => {
    if (err) {
      console.error("❌ Error al insertar usuario:", err.sqlMessage);
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
      console.error("❌ Error al buscar usuario:", err.sqlMessage);
      return callback(err);
    }
    callback(null, result);
  });
};
