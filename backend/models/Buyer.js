//sirve para definir el modelo de datos de un comprador en la base de datos
const { DataTypes } = require("sequelize");
const sequelize = require("../db");

// Define el modelo de Comprador con sus atributos
const Buyer = sequelize.define("Buyer", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: true
  },
  correo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: "Buyers",
  timestamps: true
});

module.exports = Buyer;