const { Sequelize } = require("sequelize");
require("dotenv").config();

// 🔗 Conexión a MySQL local (usando variables del archivo .env)
const sequelize = new Sequelize(
  process.env.DB_NAME,      // Nombre de la base de datos
  process.env.DB_USER,      // Usuario
  process.env.DB_PASSWORD,  // Contraseña
  {
    host: process.env.DB_HOST,  // Servidor (localhost)
    port: process.env.DB_PORT,  // Puerto (3306)
    dialect: "mysql",           // Tipo de base de datos
    logging: false,             // Oculta logs SQL en consola
  }
);

// 🔍 Probar la conexión
sequelize
  .authenticate()
  .then(() => {
    console.log("✅ Conectado correctamente a MySQL");
  })
  .catch((err) => {
    console.error("❌ Error al conectar con MySQL:", err);
  });

module.exports = sequelize;
