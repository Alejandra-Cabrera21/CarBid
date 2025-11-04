const express = require('express');
const db = require('../db');
const authRequired = require('../middleware/authRequired');

const router = express.Router();

/**
 * GET /api/historial-pujas
 * Devuelve las pujas del usuario autenticado.
 * Si es vendedor → pujas en sus subastas.
 * Si es comprador → pujas que él realizó.
 */
router.get('/', authRequired, (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT
      p.id AS id_puja,
      s.id AS id_subasta,
      COALESCE(NULLIF(CONCAT_WS(' ', s.marca, s.modelo, s.anio), ''), s.descripcion, 'Publicación') AS vehiculo,
      u.nombre AS nombre_postor,
      p.monto AS oferta,
      DATE_FORMAT(p.created_at, '%Y-%m-%d') AS fecha,
      DATE_FORMAT(p.created_at, '%H:%i') AS hora,
      p.created_at
    FROM pujas p
    INNER JOIN subastas s ON s.id = p.id_subasta
    INNER JOIN usuarios u ON u.id = p.id_postor
    WHERE s.id_vendedor = ? OR p.id_postor = ?
    ORDER BY p.created_at DESC, p.id DESC
  `;

  db.query(sql, [userId, userId], (err, rows) => {
    if (err) {
      console.error('❌ Error DB (historial-pujas):', err);
      return res.status(500).json({ message: 'Error en el servidor' });
    }
    return res.json(rows);
  });
});

module.exports = router;
