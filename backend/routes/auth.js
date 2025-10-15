const express = require("express");
const router = express.Router();
const db = require("../db");
const jwt = require("jsonwebtoken");

const bcrypt = require("bcryptjs");

const SECRET_KEY = "carbid-secret";

// 🕒 Función para sumar horas (para fecha_expiracion)
function sumarHoras(horas) {
  const fecha = new Date();
  fecha.setHours(fecha.getHours() + horas);
  return fecha;
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

    // Validar que el usuario sea comprador
    if (user.es_comprador !== "S") {
      return res.status(403).json({
        message: "Este usuario no tiene permisos de comprador.",
      });
    }

    // ✅ Comparar contraseña cifrada
    const esValida = bcrypt.compareSync(password, user.contraseña);
    if (!esValida)
      return res.status(401).json({ message: "Contraseña incorrecta." });

    // Generar token
    const token = jwt.sign({ id: user.id, correo: user.correo }, SECRET_KEY, {
      expiresIn: "2h",
    });

    // Insertar sesión
    const insert =
      "INSERT INTO sesiones (id_usuario, token, tipo_vendedor, tipo_comprador, fecha_inicio, fecha_expiracion) VALUES (?, ?, ?, ?, NOW(), ?)";
    db.query(insert, [user.id, token, "N", "S", sumarHoras(2)], (err2) => {
      if (err2) {
        console.error("❌ Error al registrar sesión:", err2);
        return res.status(500).json({ message: "Error al registrar sesión." });
      }

      res.json({
        message: "Inicio de sesión exitoso",
        redirect: "indexcomprador.html",
        token,
        usuario: {
          id: user.id,
          correo: user.correo,
          rol: "comprador",
        },
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

    // Validar que el usuario sea vendedor
    if (user.es_vendedor !== "S") {
      return res.status(403).json({
        message: "Este usuario no tiene permisos de vendedor.",
      });
    }

    // ✅ Comparar contraseña cifrada
    const esValida = bcrypt.compareSync(password, user.contraseña);
    if (!esValida)
      return res.status(401).json({ message: "Contraseña incorrecta." });

    // Generar token
    const token = jwt.sign({ id: user.id, correo: user.correo }, SECRET_KEY, {
      expiresIn: "2h",
    });

    // Insertar sesión
    const insert =
      "INSERT INTO sesiones (id_usuario, token, tipo_vendedor, tipo_comprador, fecha_inicio, fecha_expiracion) VALUES (?, ?, ?, ?, NOW(), ?)";
    db.query(insert, [user.id, token, "S", "N", sumarHoras(2)], (err2) => {
      if (err2) {
        console.error("❌ Error al registrar sesión:", err2);
        return res.status(500).json({ message: "Error al registrar sesión." });
      }

      res.json({
        message: "Inicio de sesión exitoso",
        redirect: "indexvendedor.html",
        token,
        usuario: {
          id: user.id,
          correo: user.correo,
          rol: "vendedor",
        },
      });
    });
  });
});

module.exports = router;
