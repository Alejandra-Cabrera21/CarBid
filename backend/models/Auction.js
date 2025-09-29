const { DataTypes } = require("sequelize");
const sequelize = require("../db");
const User = require("./User");

const Auction = sequelize.define("Auction", {
  modelo: { type: DataTypes.STRING, allowNull: false },
  descripcion: { type: DataTypes.TEXT, allowNull: true },
  precioBase: { type: DataTypes.FLOAT, allowNull: false },
  ofertaGanadora: { type: DataTypes.FLOAT, allowNull: true },
  estado: { type: DataTypes.STRING, defaultValue: "activa" },
  fechaCierre: { type: DataTypes.DATE, allowNull: false },
  imagen: { type: DataTypes.TEXT, allowNull: true } // 📸 nuevo campo
});


// Relación: un vendedor puede tener varias subastas
Auction.belongsTo(User, { as: "Vendedor", foreignKey: "vendedorId" });
User.hasMany(Auction, { foreignKey: "vendedorId" });

module.exports = Auction;

