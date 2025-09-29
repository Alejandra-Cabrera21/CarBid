const express = require("express");
const router = express.Router();
const Bid = require("../models/Bid");
const Auction = require("../models/Auction");

// Hacer una puja
router.post("/ofertar", async (req, res) => {
  try {
    const { userId, auctionId, monto } = req.body;

    // Buscar subasta
    const auction = await Auction.findByPk(auctionId);
    if (!auction) return res.status(404).json({ error: "Subasta no encontrada" });
    if (auction.estado === "cerrada") return res.status(400).json({ error: "La subasta ya cerró" });

    // Crear la puja
    const bid = await Bid.create({ userId, auctionId, monto });

    // Actualizar oferta más alta si es mayor
    if (!auction.ofertaGanadora || monto > auction.ofertaGanadora) {
      auction.ofertaGanadora = monto;
      await auction.save();
    }

    res.json({ message: "Puja registrada con éxito", bid });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Historial de pujas por subasta
router.get("/historial/:auctionId", async (req, res) => {
  try {
    const { auctionId } = req.params;
    const bids = await Bid.findAll({
      where: { auctionId },
      include: [{ model: Auction }]
    });
    res.json(bids);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
