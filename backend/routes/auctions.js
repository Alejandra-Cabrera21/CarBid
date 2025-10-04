const express = require("express");
const router = express.Router();
const Auction = require("../models/Auction");
const multer = require("multer");
const { storage } = require("../config/cloudinary");

// Usamos multer con Cloudinary
const upload = multer({ storage });

// === Crear subasta con imagen ===
router.post("/create", upload.single("imagen"), async (req, res) => {
  try {
    const { modelo, descripcion, precioBase, fechaCierre, vendedorId } = req.body;

    if (!modelo || !precioBase || !vendedorId) {
      return res.status(400).json({ error: "Datos incompletos." });
    }

    // Cloudinary ya devuelve la URL pública
    const imagen = req.file ? req.file.path : null;

    const auction = await Auction.create({
      modelo,
      descripcion,
      precioBase,
      fechaCierre,
      vendedorId,
      imagen,
    });

    res.json({ message: "Subasta creada con éxito", auction });
  } catch (err) {
    console.error("❌ Error al crear subasta:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// === Listar todas las subastas ===
router.get("/", async (req, res) => {
  try {
    const auctions = await Auction.findAll();
    res.json(auctions);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// === Obtener detalle de subasta ===
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
