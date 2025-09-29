const { Sequelize } = require("sequelize");

// Render te da la URL en las variables de entorno
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  protocol: "postgres",
  logging: false,
  dialectOptions: {
    ssl: {
      require: true, // Render usa SSL
      rejectUnauthorized: false
    }
  }
});

module.exports = sequelize;
