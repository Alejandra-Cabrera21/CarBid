import { db } from "../backend/db.js";
import bcrypt from "bcrypt";

export const registrarUsuario = async (req, res) => {
  const { correo, usuario, password, vendedor, comprador } = req.body;

  if (!correo || !usuario || !password) {
    return res.status(400).json({ message: "Faltan datos obligatorios" });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO usuarios (correo, usuario, password, vendedor, comprador)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.query(sql, [correo, usuario, hashed, vendedor, comprador], (err, result) => {
      if (err) {
        console.error("❌ Error al registrar:", err);
        return res.status(500).json({ message: "Error en el servidor" });
      }
      res.status(201).json({ message: "Usuario registrado correctamente" });
    });

  } catch (error) {
    res.status(500).json({ message: "Error interno del servidor" });
  }
};
