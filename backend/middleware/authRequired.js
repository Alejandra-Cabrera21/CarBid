// backend/middleware/authRequired.js
const jwt = require("jsonwebtoken");
const db  = require("../db");
const SECRET_KEY = process.env.JWT_SECRET || "carbid-secret";

/**
 * Valida:
 *  - Authorization: Bearer <token>
 *  - JWT válido
 *  - que exista en la tabla 'sesiones' y no esté expirada (fecha_expiracion > NOW())
 */
function authRequired(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Falta token" });

  let payload;
  try {
    payload = jwt.verify(token, SECRET_KEY);
  } catch (e) {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }

  const q = `
    SELECT id, tipo_vendedor, tipo_comprador, fecha_expiracion
    FROM sesiones
    WHERE token = ? AND id_usuario = ?
    LIMIT 1
  `;
  db.query(q, [token, payload.id], (err, rows) => {
    if (err)  return res.status(500).json({ message: "Error DB" });
    if (!rows.length) return res.status(401).json({ message: "Sesión no válida" });

    const ses = rows[0];
    if (new Date(ses.fecha_expiracion) <= new Date())
      return res.status(401).json({ message: "Sesión expirada" });

    req.user = { id: payload.id, correo: payload.correo };
    req.session = { id: ses.id, vendedor: ses.tipo_vendedor === "S", comprador: ses.tipo_comprador === "S" };
    next();
  });
}

module.exports = authRequired;
