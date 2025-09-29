const express = require("express");
const router = express.Router();
const Auction = require("../models/Auction");
const multer = require("multer");
const path = require("path");

// === Configuración de multer para guardar imágenes en /uploads ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads")); // carpeta uploads dentro del backend
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // nombre único
  }
});
const upload = multer({ storage });

// === Crear subasta con foto (solo vendedor) ===
router.post("/create", upload.single("imagen"), async (req, res) => {
  try {
    const { modelo, descripcion, precioBase, fechaCierre, vendedorId } = req.body;

    // Guardamos la ruta pública de la imagen
    const imagen = req.file ? `/uploads/${req.file.filename}` : null;

    const auction = await Auction.create({
      modelo,
      descripcion,
      precioBase,
      fechaCierre,
      vendedorId,
      imagen
    });

    res.json({ message: "Subasta creada con éxito", auction });
  } catch (err) {
    console.error("Error al crear subasta:", err);
    res.status(400).json({ error: err.message });
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

// === Obtener detalle de una subasta ===
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
