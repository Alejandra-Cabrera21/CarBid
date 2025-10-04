const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const Vendor = sequelize.define("Vendor", {
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true // no permite dos vendedores con el mismo correo
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  vendorCode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true // cada vendedor tiene su código único
  }
});

module.exports = Vendor;