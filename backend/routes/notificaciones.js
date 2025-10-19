// routes/notificaciones.js
const express = require("express");
const db = require("../db");
const authRequired = require("../middleware/authRequired");

const router = express.Router();

/**
 * 📬 GET /api/notificaciones
 * Devuelve las subastas ganadas por el usuario autenticado.
 */
router.get("/", authRequired, (req, res) => {
  const userId = req.user.id;

  const q = `
    SELECT g.id_subasta, s.marca, s.modelo, g.monto, g.fecha
    FROM ganadores g
    JOIN subastas s ON s.id = g.id_subasta
    WHERE g.id_postor = ?
    ORDER BY g.fecha DESC
  `;

  db.query(q, [userId], (err, rows) => {
    if (err) {
      console.error("❌ Error DB:", err);
      return res.status(500).json({ message: "Error al consultar ganadores" });
    }
    res.json(rows);
  });
});

module.exports = router;
