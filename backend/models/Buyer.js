const { DataTypes } = require("sequelize");
const sequelize = require("../db");

// Definición del modelo para los compradores
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