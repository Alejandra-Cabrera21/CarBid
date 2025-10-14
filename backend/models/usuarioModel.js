const db = require('../db');

// Función para insertar un nuevo usuario
exports.crearUsuario = (usuario, callback) => {
  const { nombre, correo, contraseña, es_vendedor, es_comprador } = usuario;
  const sql = `
    INSERT INTO usuarios (nombre, correo, contraseña, es_vendedor, es_comprador)
    VALUES (?, ?, ?, ?, ?)
  `;
  db.query(sql, [nombre, correo, contraseña, es_vendedor, es_comprador], callback);
};

// Función para buscar un usuario por correo
exports.buscarPorCorreo = (correo, callback) => {
  const sql = 'SELECT * FROM usuarios WHERE correo = ?';
  db.query(sql, [correo], callback);
};
