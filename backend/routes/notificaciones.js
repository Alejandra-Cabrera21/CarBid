// routes/notificaciones.js
const express = require("express");
const db = require("../db");
const authRequired = require("../middleware/authRequired");

const router = express.Router();

/**
 * GET /api/notificaciones
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
      console.error("Error DB:", err);
      return res.status(500).json({ message: "Error al consultar ganadores" });
    }
    res.json(rows);
  });
});

/**
 * DELETE /api/notificaciones/:id_subasta
 * Elimina la notificación (ganador) para un usuario específico.
 */
router.delete("/:id_subasta", authRequired, (req, res) => {
  const userId = req.user.id;
  const { id_subasta } = req.params;

  const q = `
    DELETE FROM ganadores 
    WHERE id_subasta = ? AND id_postor = ?
  `;

  db.query(q, [id_subasta, userId], (err, result) => {
    if (err) {
      console.error("Error al eliminar notificación:", err);
      return res.status(500).json({ message: "Error al eliminar notificación" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Notificación no encontrada" });
    }
    res.json({ ok: true });
  });
});

module.exports = router;
