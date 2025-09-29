const express = require("express");
const router = express.Router();
const Auction = require("../models/Auction");

// Crear subasta (solo vendedor)
router.post("/create", async (req, res) => {
  try {
    const { modelo, descripcion, precioBase, fechaCierre, vendedorId } = req.body;
    const auction = await Auction.create({ modelo, descripcion, precioBase, fechaCierre, vendedorId });
    res.json({ message: "Subasta creada con éxito", auction });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Listar todas las subastas
router.get("/", async (req, res) => {
  try {
    const auctions = await Auction.findAll();
    res.json(auctions);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Obtener detalle de una subasta
router.get("/:id", async (req, res) => {
  try {
    const auction = await Auction.findByPk(req.params.id);
    if (!auction) return res.status(404).json({ error: "Subasta no encontrada" });
    res.json(auction);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
