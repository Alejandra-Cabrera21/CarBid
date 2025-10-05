const { DataTypes } = require("sequelize");
const sequelize = require("../db");
const User = require("./User");
const Buyer = require("./Buyer");
const Auction = require("./Auction");

const Bid = sequelize.define("Bid", {
  monto: { type: DataTypes.FLOAT, allowNull: false },
  ganada: { type: DataTypes.BOOLEAN, defaultValue: false }
});

// === Relaciones ===

// Relación con Buyer (para mostrar nombre/correo del comprador)
Bid.belongsTo(Buyer, { foreignKey: "userId" });
Buyer.hasMany(Bid, { foreignKey: "userId" });

// Relación con Auction (subasta a la que pertenece la puja)
Bid.belongsTo(Auction, { foreignKey: "auctionId" });
Auction.hasMany(Bid, { foreignKey: "auctionId" });

// Si todavía usas "User" para otro propósito (por ejemplo login general)
Bid.belongsTo(User, { foreignKey: "userId", constraints: false });

module.exports = Bid;