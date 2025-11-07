//para rutas que requieren autenticación
// backend/middleware/authRequired.js
const jwt = require("jsonwebtoken"); //para verificar tokens JWT(JSON Web Tokens son una forma segura de transmitir información entre partes como un objeto JSON para autenticación y autorización)
const db  = require("../db"); //importar la conexión a la base de datos
const SECRET_KEY = process.env.JWT_SECRET || "carbid-secret"; //clave secreta para verificar los tokens JWT

//verificar que la solicitud tenga un token válido y una sesión activa
function authRequired(req, res, next) {
  const auth = req.headers.authorization || ""; //obtener el encabezado de autorización
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null; //extraer el token del encabezado
  if (!token) return res.status(401).json({ message: "Falta token" }); //si no hay token, responder con error 401

  //verificar el token JWT
  let payload;
  try {
    payload = jwt.verify(token, SECRET_KEY);
  } catch (e) {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }

  //verificar que la sesión esté activa en la base de datos
  const q = `
    SELECT id, tipo_vendedor, tipo_comprador, fecha_expiracion
    FROM sesiones
    WHERE token = ? AND id_usuario = ?
    LIMIT 1
  `;
  //ejecutar la consulta para verificar la sesión
  db.query(q, [token, payload.id], (err, rows) => {
    if (err)  return res.status(500).json({ message: "Error DB" });
    if (!rows.length) return res.status(401).json({ message: "Sesión no válida" });

    //verificar si la sesión ha expirado
    const ses = rows[0];
    if (new Date(ses.fecha_expiracion) <= new Date())
      return res.status(401).json({ message: "Sesión expirada" });

    req.user = { id: payload.id, correo: payload.correo };
    req.session = { id: ses.id, vendedor: ses.tipo_vendedor === "S", comprador: ses.tipo_comprador === "S" };
    next();
  });
}

//exportar el middleware
module.exports = authRequired;
