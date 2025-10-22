const express = require("express");
const db = require("../db");
const authRequired = require("../middleware/authRequired");

const router = express.Router();

/**
 * GET /api/historial-subastas
 * Devuelve las subastas en las que el comprador participó (cerradas o ganadas/perdidas)
 */
router.get("/", authRequired, (req, res) => {
  const compradorId = req.user.id;

  const sql = `
    SELECT
      s.id AS id_subasta,
      COALESCE(NULLIF(CONCAT_WS(' ', s.marca, s.modelo, s.anio), ''), s.descripcion, 'Publicación') AS vehiculo,
      MAX(p.monto) AS mi_oferta,
      g.monto AS oferta_ganadora,
      CASE
        WHEN g.id_postor = ? THEN 'Ganaste'
        ELSE 'Perdí la puja'
      END AS resultado,
      s.estado,
      s.fin AS fecha_cierre
    FROM subastas s
    INNER JOIN pujas p ON p.id_subasta = s.id
    LEFT JOIN ganadores g ON g.id_subasta = s.id
    WHERE p.id_postor = ?
    GROUP BY s.id, g.id_postor, g.monto, s.estado, s.fin
    ORDER BY s.fin DESC
  `;

  db.query(sql, [compradorId, compradorId], (err, rows) => {
    if (err) {
      console.error("❌ Error DB (historial-subastas):", err);
      return res.status(500).json({ message: "Error en el servidor" });
    }
    return res.json(rows);
  });
});

module.exports = router;