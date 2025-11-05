const express = require('express');
const router = express.Router();

// según tu estructura real de carpetas:
const db = require('../db');                   
const authRequired = require('../middleware/authRequired');

router.get('/', authRequired, async (req, res) => {
  try {
    const userId = req.user?.id;               // viene del middleware authRequired
    if (!userId) return res.status(401).json({ error: 'Usuario no autenticado' });

    const sql = `
      /* Subastas CERRADAS en las que el usuario participó */
      SELECT
        s.id AS id_subasta,
        TRIM(CONCAT(s.marca,' ',s.modelo,' ',COALESCE(s.anio,'')))           AS vehiculo,
        s.precio_base                                                        AS precio_base,
        s.estado,
        s.fin                                                                AS fecha_cierre,

        /* Mi mejor oferta en esa subasta */
        COALESCE(mb.mi_mejor_oferta, 0)                                      AS mi_oferta,

        /* Ganador y oferta ganadora:
           1) Preferimos la tabla ganadores (wg)
           2) Fallback: cálculo desde pujas (wf) con desempate por fecha más antigua */
        COALESCE(wg.oferta_ganadora, wf.oferta_ganadora, 0)                  AS oferta_ganadora,

        CASE
          WHEN COALESCE(wg.ganador_id, wf.ganador_id) = ? THEN 'Ganaste'
          ELSE 'Perdiste'
        END                                                                  AS resultado

      FROM subastas s

      /* Solo subastas donde yo pujé al menos una vez */
      JOIN (
        SELECT DISTINCT id_subasta
        FROM pujas
        WHERE id_postor = ?
      ) mis ON mis.id_subasta = s.id

      /* Mi mejor oferta */
      LEFT JOIN (
        SELECT id_subasta, MAX(monto) AS mi_mejor_oferta
        FROM pujas
        WHERE id_postor = ?
        GROUP BY id_subasta
      ) mb ON mb.id_subasta = s.id

      /* 1) Ganador desde tabla ganadores (si existe) */
      LEFT JOIN (
        SELECT g.id_subasta, g.id_postor AS ganador_id, g.monto AS oferta_ganadora
        FROM ganadores g
      ) wg ON wg.id_subasta = s.id

      /* 2) Fallback: ganador calculado desde pujas con desempate por created_at más antigua */
      LEFT JOIN (
        SELECT p1.id_subasta, p1.id_postor AS ganador_id, p1.monto AS oferta_ganadora
        FROM pujas p1
        JOIN (
          SELECT id_subasta, MAX(monto) AS max_monto
          FROM pujas
          GROUP BY id_subasta
        ) m ON m.id_subasta = p1.id_subasta AND m.max_monto = p1.monto
        JOIN (
          SELECT x.id_subasta, x.monto, MIN(x.created_at) AS first_time
          FROM pujas x
          JOIN (
            SELECT id_subasta, MAX(monto) AS max_monto
            FROM pujas
            GROUP BY id_subasta
          ) mm ON mm.id_subasta = x.id_subasta AND mm.max_monto = x.monto
          GROUP BY x.id_subasta, x.monto
        ) t ON t.id_subasta = p1.id_subasta AND t.monto = p1.monto AND t.first_time = p1.created_at
      ) wf ON wf.id_subasta = s.id

      WHERE s.estado = 'CERRADA'
      ORDER BY s.fin DESC;
    `;

    // Orden de parámetros: (comparación ganador), (mis subastas), (mi mejor oferta)
    const params = [userId, userId, userId];
   const [rows] = await db.promise().query(sql, params);

    const data = rows.map(r => ({
      id_subasta: r.id_subasta,
      vehiculo: r.vehiculo || 'Publicación',
      precio_base: Number(r.precio_base || 0),
      estado: r.estado || 'CERRADA',
      fecha_cierre: r.fecha_cierre,
      mi_oferta: Number(r.mi_oferta || 0),
      oferta_ganadora: Number(r.oferta_ganadora || 0),
      resultado: r.resultado
    }));

    res.json(data);
  } catch (e) {
    console.error('historial-subastas:', e);
    res.status(500).json({ error: 'Error al obtener historial de subastas' });
  }
});

module.exports = router;
