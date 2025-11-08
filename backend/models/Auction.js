//sirve para definir el modelo de datos de una subasta en la base de datos
const { DataTypes } = require("sequelize"); // Importa los tipos de datos de Sequelize
const sequelize = require("../db"); // Importa la instancia de Sequelize configurada
const User = require("./User"); // Importa el modelo de Usuario para establecer relaciones

// Define el modelo de Subasta con sus atributos
const Auction = sequelize.define("Auction", {
  modelo: { type: DataTypes.STRING, allowNull: false },  // Modelo del artículo en subasta
  descripcion: { type: DataTypes.TEXT, allowNull: true }, // Descripción del artículo
  precioBase: { type: DataTypes.FLOAT, allowNull: false }, // Precio base de la subasta
  ofertaGanadora: { type: DataTypes.FLOAT, allowNull: true }, // Oferta ganadora actual
  estado: { type: DataTypes.STRING, defaultValue: "activa" }, // Estado de la subasta
  fechaCierre: { type: DataTypes.DATE, allowNull: false },
  imagen: { type: DataTypes.TEXT, allowNull: true } // 📸 nuevo campo
});


// Relación: un vendedor puede tener varias subastas
Auction.belongsTo(User, { as: "Vendedor", foreignKey: "vendedorId" });
User.hasMany(Auction, { foreignKey: "vendedorId" });

module.exports = Auction;

