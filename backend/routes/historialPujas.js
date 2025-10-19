const express = require('express');
const db = require('../db');
const authRequired = require('../middleware/authRequired');

const router = express.Router();

/**
 * GET /api/historial-pujas
 * Devuelve TODAS las pujas de TODAS las subastas creadas por el vendedor logueado.
 * Campos devueltos: vehiculo, nombre_postor, oferta, hora, id_subasta, id_puja
 */
router.get('/', authRequired, (req, res) => {
  const vendedorId = req.user.id;

  const sql = `
    SELECT
      p.id                  AS id_puja,
      s.id                  AS id_subasta,
      -- Vehículo (usa marca + modelo + año; si todo viniera null, cae en 'Publicación')
      COALESCE(NULLIF(CONCAT_WS(' ', s.marca, s.modelo, s.anio), ''), s.descripcion, 'Publicación') AS vehiculo,
      u.nombre              AS nombre_postor,
      p.monto               AS oferta,
      DATE_FORMAT(p.created_at, '%H:%i') AS hora,
      p.created_at
    FROM pujas p
    INNER JOIN subastas s ON s.id = p.id_subasta
    INNER JOIN usuarios u ON u.id = p.id_postor
    WHERE s.id_vendedor = ?
    ORDER BY p.created_at DESC, p.id DESC
  `;

  db.query(sql, [vendedorId], (err, rows) => {
    if (err) {
      console.error('❌ Error DB (historial-pujas):', err);
      return res.status(500).json({ message: 'Error en el servidor' });
    }
    return res.json(rows);
  });
});

module.exports = router;
