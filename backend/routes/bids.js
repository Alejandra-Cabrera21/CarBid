const express = require("express");
const db = require("../db");
const authRequired = require("../middleware/authRequired");

const router = express.Router();

/* ========== POST /api/pujas (crear nueva puja) ========== */
router.post("/", authRequired, (req, res) => {
  const { id_subasta, monto } = req.body;
  const id_postor = req.user.id;

  if (!id_subasta || !monto)
    return res.status(400).json({ message: "Datos incompletos" });

  // Verificar subasta activa
  const qSub = `SELECT estado, fin FROM subastas WHERE id=?`;
  db.query(qSub, [id_subasta], (err, r1) => {
    if (err) return res.status(500).json({ message: "Error DB" });
    if (!r1.length) return res.status(404).json({ message: "Subasta no encontrada" });
    if (r1[0].estado !== "ABIERTA")
      return res.status(400).json({ message: "Subasta cerrada" });

    const qIns = `INSERT INTO pujas (id_subasta, id_postor, monto) VALUES (?, ?, ?)`;
    db.query(qIns, [id_subasta, id_postor, monto], (err2, result) => {
      if (err2) return res.status(500).json({ message: "Error al registrar puja" });

      const io = req.app.get("io");
      const newBidId = result.insertId;

      // 🔹 Obtener datos completos de la puja recién creada
      const qData = `
        SELECT 
          p.id            AS id_puja,
          p.id_subasta,
          p.id_postor,
          u.nombre        AS nombre_postor,
          p.monto         AS monto,
          p.created_at
        FROM pujas p
        INNER JOIN usuarios u ON u.id = p.id_postor
        WHERE p.id = ?;
      `;

      db.query(qData, [newBidId], (err3, rows) => {
        if (err3 || !rows.length) {
          console.error("Error al obtener datos de la nueva puja:", err3);
          // Fallback: comportamiento antiguo
          if (io) io.emit("auction:bid", { id_subasta, monto, id_postor });
          return res.json({ message: "Puja registrada correctamente" });
        }

        const newBid = rows[0];

        // Emitir SIEMPRE que alguien puje
        if (io) io.emit("auction:bid", newBid);

        return res.json({
          message: "Puja registrada correctamente",
          ...newBid,
        });
      });
    });
  });
});

/* (Opcional) evento de ganador cuando cierre */
router.post("/ganador/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const q = `
    SELECT id_postor, monto FROM pujas 
    WHERE id_subasta=? ORDER BY monto DESC, created_at ASC LIMIT 1
  `;
  db.query(q, [id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Error DB" });
    if (!rows.length) return res.json({ message: "Sin pujas" });

    const ganador = rows[0];
    const io = req.app.get("io");
    if (io) io.emit("auction:won", { id_subasta: id, id_postor: ganador.id_postor });
    res.json({ message: "Notificación enviada al ganador" });
  });
});

module.exports = router;
