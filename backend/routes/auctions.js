const express = require("express");
const router = express.Router();
const Auction = require("../models/Auction");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// === Crear carpeta 'uploads' si no existe ===
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
  console.log("📁 Carpeta 'uploads' creada automáticamente");
}

// === Configuración de multer (para guardar imágenes) ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // guarda dentro de /backend/uploads
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // nombre único
  }
});

const upload = multer({ storage });

// === Crear subasta con imagen ===
router.post("/create", upload.single("imagen"), async (req, res) => {
  try {
    const { modelo, descripcion, precioBase, fechaCierre, vendedorId } = req.body;

    // Validaciones básicas
    if (!modelo || !precioBase || !vendedorId) {
      return res.status(400).json({ error: "Faltan datos obligatorios." });
    }

    // Guardar ruta de imagen si se subió
    const imagen = req.file ? `/uploads/${req.file.filename}` : null;

    // Crear subasta en la base de datos
    const auction = await Auction.create({
      modelo,
      descripcion,
      precioBase,
      fechaCierre,
      vendedorId,
      imagen
    });

    console.log("✅ Subasta creada:", auction.modelo);
    res.json({ message: "Subasta creada con éxito", auction });
  } catch (err) {
    console.error("❌ Error al crear subasta:", err);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// === Listar todas las subastas ===
router.get("/", async (req, res) => {
  try {
    const auctions = await Auction.findAll();
    res.json(auctions);
  } catch (err) {
    console.error("❌ Error al obtener subastas:", err);
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
    console.error("❌ Error al obtener detalle:", err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;