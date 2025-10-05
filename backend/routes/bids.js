const express = require("express");
const router = express.Router();
const Bid = require("../models/Bid");
const Buyer = require("../models/Buyer"); // 👈 Importante para incluir datos del comprador
const Auction = require("../models/Auction");

// === Hacer una puja ===
router.post("/ofertar", async (req, res) => {
  try {
    const { userId, auctionId, monto } = req.body;

    // Verificar que existan los datos
    if (!userId || !auctionId || !monto) {
      return res.status(400).json({ error: "Datos incompletos para realizar la puja." });
    }

    // Buscar la subasta
    const auction = await Auction.findByPk(auctionId);
    if (!auction) return res.status(404).json({ error: "Subasta no encontrada" });
    if (auction.estado === "cerrada") return res.status(400).json({ error: "La subasta ya cerró" });

    // Crear la puja
    const bid = await Bid.create({ userId, auctionId, monto });

    // Actualizar oferta ganadora si es la más alta
    if (!auction.ofertaGanadora || monto > auction.ofertaGanadora) {
      auction.ofertaGanadora = monto;
      await auction.save();
    }

    res.json({ message: "Puja registrada con éxito", bid });
  } catch (err) {
    console.error("Error al registrar puja:", err);
    res.status(400).json({ error: err.message });
  }
});

// === Historial de pujas (con nombre y correo del comprador) ===
router.get("/historial/:auctionId", async (req, res) => {
  try {
    const { auctionId } = req.params;

    const bids = await Bid.findAll({
      where: { auctionId },
      include: [
        {
          model: Buyer,
          attributes: ["nombre", "correo"], // 👈 Datos del comprador
        },
        {
          model: Auction,
          attributes: ["modelo", "ofertaGanadora", "estado"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json(bids);
  } catch (err) {
    console.error("Error al obtener historial de pujas:", err);
    res.status(500).json({ error: "Error al cargar historial de pujas" });
  }
});

module.exports = router;