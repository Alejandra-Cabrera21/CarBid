const express = require("express");
const router = express.Router();
const db = require("../db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Usa variable de entorno en producción
const SECRET_KEY = process.env.JWT_SECRET || "carbid-secret";

// 🕒 Suma horas a la fecha actual (para fecha_expiracion)
function sumarHoras(horas) {
  const fecha = new Date();
  fecha.setHours(fecha.getHours() + horas);
  return fecha;
}

/* ------------------------------------------------------
   Middleware: requiere token válido y sesión no vencida
-------------------------------------------------------*/
function authRequired(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Falta token" });

  let payload;
  try {
    payload = jwt.verify(token, SECRET_KEY);
  } catch (_e) {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }

  const q = `
    SELECT id, fecha_expiracion 
    FROM sesiones 
    WHERE token = ? AND id_usuario = ?
    LIMIT 1
  `;
  db.query(q, [token, payload.id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Error DB" });
    if (rows.length === 0)
      return res.status(401).json({ message: "Sesión no válida" });

    const ses = rows[0];
    if (new Date(ses.fecha_expiracion) <= new Date())
      return res.status(401).json({ message: "Sesión expirada" });

    req.user = payload;
    req.sessionId = ses.id;
    req.token = token;
    next();
  });
}

/* ======================================================
   🔹 LOGIN COMPRADOR
====================================================== */
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Correo y contraseña requeridos." });

  const sql = "SELECT * FROM usuarios WHERE correo = ?";
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error("❌ Error DB:", err);
      return res.status(500).json({ message: "Error en el servidor." });
    }
    if (results.length === 0)
      return res.status(401).json({ message: "Usuario no encontrado." });

    const user = results[0];

    if (user.es_comprador !== "S") {
      return res.status(403).json({
        message: "Este usuario no tiene permisos de comprador.",
      });
    }

    const esValida = bcrypt.compareSync(password, user.contraseña);
    if (!esValida)
      return res.status(401).json({ message: "Contraseña incorrecta." });

    const token = jwt.sign({ id: user.id, correo: user.correo }, SECRET_KEY, {
      expiresIn: "2h",
    });

    const insert = `
      INSERT INTO sesiones (id_usuario, token, tipo_vendedor, tipo_comprador, fecha_inicio, fecha_expiracion)
      VALUES (?, ?, ?, ?, NOW(), ?)
    `;
    db.query(insert, [user.id, token, "N", "S", sumarHoras(2)], (err2) => {
      if (err2) {
        console.error("❌ Error al registrar sesión:", err2);
        return res.status(500).json({ message: "Error al registrar sesión." });
      }

      res.json({
        message: "Inicio de sesión exitoso",
        redirect: "indexcomprador.html",
        token,
        usuario: { id: user.id, correo: user.correo, rol: "comprador" },
      });
    });
  });
});

/* ======================================================
   🔹 LOGIN VENDEDOR
====================================================== */
router.post("/login-vendedor", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Correo y contraseña requeridos." });

  const sql = "SELECT * FROM usuarios WHERE correo = ?";
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error("❌ Error DB:", err);
      return res.status(500).json({ message: "Error en el servidor." });
    }
    if (results.length === 0)
      return res.status(401).json({ message: "Usuario no encontrado." });

    const user = results[0];

    if (user.es_vendedor !== "S") {
      return res.status(403).json({
        message: "Este usuario no tiene permisos de vendedor.",
      });
    }

    const esValida = bcrypt.compareSync(password, user.contraseña);
    if (!esValida)
      return res.status(401).json({ message: "Contraseña incorrecta." });

    const token = jwt.sign({ id: user.id, correo: user.correo }, SECRET_KEY, {
      expiresIn: "2h",
    });

    const insert = `
      INSERT INTO sesiones (id_usuario, token, tipo_vendedor, tipo_comprador, fecha_inicio, fecha_expiracion)
      VALUES (?, ?, ?, ?, NOW(), ?)
    `;
    db.query(insert, [user.id, token, "S", "N", sumarHoras(2)], (err2) => {
      if (err2) {
        console.error("❌ Error al registrar sesión:", err2);
        return res.status(500).json({ message: "Error al registrar sesión." });
      }

      res.json({
        message: "Inicio de sesión exitoso",
        redirect: "indexvendedor.html",
        token,
        usuario: { id: user.id, correo: user.correo, rol: "vendedor" },
      });
    });
  });
});

/* ======================================================
   🔹 PING protegido (para validar sesión en el cliente)
====================================================== */
router.get("/ping", authRequired, (_req, res) => {
  res.json({ ok: true });
});

/* ======================================================
   🔹 LOGOUT: expira la sesión en BD de inmediato
====================================================== */
router.post("/logout", authRequired, (req, res) => {
  const q = "UPDATE sesiones SET fecha_expiracion = NOW() WHERE id = ?";
  db.query(q, [req.sessionId], (err) => {
    if (err) return res.status(500).json({ message: "Error al cerrar sesión" });
    return res.json({ message: "Sesión cerrada" });
  });
});

module.exports = router;

/* ====== Sugerencia SQL opcional para índice ======
CREATE INDEX idx_sesiones_token ON sesiones (token(120));
==================================================== */
