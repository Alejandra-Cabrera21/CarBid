const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const User = sequelize.define("User", {
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM("comprador", "vendedor"), defaultValue: "comprador" },
  vendorCode: { type: DataTypes.STRING, allowNull: true, unique: true }
});

module.exports = User;
