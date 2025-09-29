const { Sequelize } = require("sequelize");

// Usaremos SQLite (archivo carbid.sqlite en tu carpeta raíz)
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "carbid.sqlite", // aquí se guardará la base de datos
  logging: false
});

module.exports = sequelize;
