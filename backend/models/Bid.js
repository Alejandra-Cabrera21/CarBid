const { DataTypes } = require("sequelize");
const sequelize = require("../db");
const User = require("./User");
const Auction = require("./Auction");

const Bid = sequelize.define("Bid", {
  monto: { type: DataTypes.FLOAT, allowNull: false },
  ganada: { type: DataTypes.BOOLEAN, defaultValue: false }
});

// Relación: un usuario puede hacer muchas pujas
Bid.belongsTo(User, { foreignKey: "userId" });
User.hasMany(Bid, { foreignKey: "userId" });

// Relación: una subasta puede tener muchas pujas
Bid.belongsTo(Auction, { foreignKey: "auctionId" });
Auction.hasMany(Bid, { foreignKey: "auctionId" });

module.exports = Bid;
