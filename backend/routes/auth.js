// routes/auth.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

// Usa variable de entorno en producción
const SECRET_KEY = process.env.JWT_SECRET || "carbid-secret";
//JWT secret key para firmar y verificar tokens(usada en autenticación)
//como funciona jwt.sign(payload, SECRET_KEY) y jwt.verify(token, SECRET_KEY)
//la clave secreta debe ser segura y no compartida públicamente
//la clave se usa para asegurar que el token no ha sido alterado

// === Nodemailer (SMTP) ===
const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, // contraseña del SMTP
  },
});

//Suma horas a la fecha actual (para fecha_expiracion)
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

  // Verificar sesión en BD
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
   LOGIN COMPRADOR
====================================================== */
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Correo y contraseña requeridos." });

  const sql = "SELECT * FROM usuarios WHERE correo = ?";
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error("Error DB:", err);
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
        console.error("Error al registrar sesión:", err2);
        return res.status(500).json({ message: "Error al registrar sesión." });
      }

      res.json({
        message: "Inicio de sesión exitoso",
        redirect: "/indexcomprador",
        token,
        usuario: { id: user.id, correo: user.correo, rol: "comprador" },
      });
    });
  });
});

/* ======================================================
   LOGIN VENDEDOR
====================================================== */
router.post("/login-vendedor", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Correo y contraseña requeridos." });

  const sql = "SELECT * FROM usuarios WHERE correo = ?";
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error("Error DB:", err);
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
        console.error("Error al registrar sesión:", err2);
        return res.status(500).json({ message: "Error al registrar sesión." });
      }

      res.json({
        message: "Inicio de sesión exitoso",
        redirect: "/indexvendedor",
        token,
        usuario: { id: user.id, correo: user.correo, rol: "vendedor" },
      });
    });
  });
});

/* ======================================================
    PING protegido (para validar sesión en el cliente)
====================================================== */
router.get("/ping", authRequired, (_req, res) => {
  res.json({ ok: true });
});

/* ======================================================
   LOGOUT: expira la sesión en BD de inmediato
====================================================== */
router.post("/logout", authRequired, (req, res) => {
  const q = "UPDATE sesiones SET fecha_expiracion = NOW() WHERE id = ?";
  db.query(q, [req.sessionId], (err) => {
    if (err) return res.status(500).json({ message: "Error al cerrar sesión" });
    return res.json({ message: "Sesión cerrada" });
  });
});

/* ======================================================
   OLVIDÉ MI CONTRASEÑA (solicitar código)
   POST /api/auth/forgot  { email }
   - Genera un código de 6 dígitos, válido 15 min
   - En dev devuelve devHint con el código
   - NO crea la tabla (ya existe)
====================================================== */
router.post("/forgot", (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ message: "Correo requerido" });

  const qUser = "SELECT id FROM usuarios WHERE correo = ? LIMIT 1";
  db.query(qUser, [email], (err, rows) => {
    if (err) return res.status(500).json({ message: "Error DB" });

    // Siempre respondemos 200 para no filtrar existencia del email
    const code = ("" + Math.floor(100000 + Math.random() * 900000)).slice(-6);
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    // Si NO existe el usuario → no guardamos nada, pero respondemos igual
    if (!rows.length) {
      return res.json({
        message: "Si el correo existe, te enviamos un código.",
        ...(process.env.NODE_ENV !== "production" ? { devHint: "xxxxxx" } : {}),
      });
    }

    // Insertar el código en la tabla EXISTENTE password_resets
    const insert = `
      INSERT INTO password_resets (email, code, expires_at)
      VALUES (?, ?, ?)
    `;
    db.query(insert, [email, code, expires], async (e2) => {
      if (e2) return res.status(500).json({ message: "Error generando código" });

      // Enviar email (best-effort, no rompemos si falla)
      try {
        await mailer.sendMail({
          from: process.env.MAIL_FROM || process.env.SMTP_USER,
          to: email,
          subject: "CarBid – Código para restablecer tu contraseña",
          html: `
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111">
              <p>Recibimos una solicitud para restablecer tu contraseña.</p>
              <p>Tu código es:</p>
              <p style="font-size:28px;font-weight:700;letter-spacing:2px;margin:10px 0">${code}</p>
              <p>Este código caduca en <strong>15 minutos</strong>.</p>
              <p>Si no hiciste esta solicitud, ignora este correo.</p>
              <hr/>
              <p style="font-size:12px;color:#555">CarBid</p>
            </div>
          `,
          text: `Tu código de recuperación es: ${code} (válido 15 minutos)`,
        });
      } catch (mailErr) {
        console.warn("⚠️ Error enviando correo de reset:", mailErr.message);
      }

      const dev = process.env.NODE_ENV !== "production";
      return res.json({
        message: "Si el correo existe, te enviamos un código.",
        ...(dev ? { devHint: code } : {}),
      });
    });
  });
});

/* ======================================================
   VERIFICAR CÓDIGO Y CAMBIAR CONTRASEÑA
   POST /api/auth/forgot/verify
   body: { email, code, newPassword }
====================================================== */
router.post("/forgot/verify", (req, res) => {
  const { email, code, newPassword } = req.body || {};
  if (!email || !code || !newPassword) {
    return res.status(400).json({ message: "Faltan datos" });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres" });
  }

  const qSel = `
    SELECT id, expires_at, used
    FROM password_resets
    WHERE email = ? AND code = ?
    ORDER BY id DESC
    LIMIT 1
  `;
  db.query(qSel, [email, code], (err, rows) => {
    if (err) return res.status(500).json({ message: "Error DB" });
    if (!rows.length) return res.status(400).json({ message: "Código inválido" });

    const row = rows[0];
    if (row.used) return res.status(400).json({ message: "Código ya utilizado" });
    if (new Date(row.expires_at) <= new Date()) {
      return res.status(400).json({ message: "Código expirado" });
    }

    const hash = bcrypt.hashSync(newPassword, 10);

    // Cambiar contraseña del usuario
    const qUpdUser = `UPDATE usuarios SET contraseña = ? WHERE correo = ? LIMIT 1`;
    db.query(qUpdUser, [hash, email], (e2, result2) => {
      if (e2) return res.status(500).json({ message: "Error actualizando contraseña" });
      if (result2.affectedRows === 0) {
        // Si no existe el usuario (edge case), marcamos usado igual para invalidar el código
        db.query(`UPDATE password_resets SET used = 1 WHERE id = ?`, [row.id], () => {});
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      // Marcar reset como usado
      db.query(`UPDATE password_resets SET used = 1 WHERE id = ?`, [row.id], () => {});

      // Invalidar sesiones activas del usuario de ese correo
      const qDelSes = `
        DELETE s
        FROM sesiones s
        JOIN usuarios u ON u.id = s.id_usuario
        WHERE u.correo = ?
      `;
      db.query(qDelSes, [email], () => {});

      return res.json({ message: "Contraseña actualizada" });
    });
  });
});

module.exports = router;

/* ====== Sugerencia SQL opcional para índice ======
CREATE INDEX idx_sesiones_token ON sesiones (token(120));
==================================================== */
