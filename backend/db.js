const mysql = require("mysql2");
require("dotenv").config();

// Crear un pool de conexiones en lugar de una sola conexión
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true, // Espera si no hay conexiones libres
  connectionLimit: 10,      // 🔹 Número máximo de conexiones simultáneas
  queueLimit: 0             // 0 = sin límite en la cola de espera
});

// Verificar conexión inicial
pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Error al conectar al pool MySQL:", err);
  } else {
    console.log("✅ Pool de conexiones MySQL activo");
    connection.release(); // Liberar la conexión de prueba
  }
});

module.exports = pool.promise(); // Usa .promise() si usas async/await
