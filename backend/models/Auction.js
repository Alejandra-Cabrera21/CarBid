const { DataTypes } = require("sequelize");
const sequelize = require("../db");
const User = require("./User");

const Auction = sequelize.define("Auction", {
  modelo: { type: DataTypes.STRING, allowNull: false },
  descripcion: { type: DataTypes.STRING, allowNull: true },
  precioBase: { type: DataTypes.FLOAT, allowNull: false },
  ofertaGanadora: { type: DataTypes.FLOAT, allowNull: true },
  estado: { type: DataTypes.ENUM("abierta", "cerrada"), defaultValue: "abierta" },
  fechaCierre: { type: DataTypes.DATE, allowNull: false }
});

// Relación: un vendedor crea muchas subastas
Auction.belongsTo(User, { as: "vendedor", foreignKey: "vendedorId" });
User.hasMany(Auction, { foreignKey: "vendedorId" });

module.exports = Auction;
