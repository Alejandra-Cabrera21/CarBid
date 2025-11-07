//registrar un nuevo usuario en la base de datos, asegurando que la contraseña quede encriptada
import { db } from "../backend/db.js"; //importar la conexión a la base de datos
import bcrypt from "bcrypt"; //para encriptar contraseñas

//async porque bcrypt.hash es una operación asíncrona ya que queda encriptar la contraseña
//post /usuarios/registro practicamente
export const registrarUsuario = async (req, res) => {
  // Extraer los datos del cuerpo de la solicitud
  const { correo, usuario, password, vendedor, comprador } = req.body;

  // Validar que los campos obligatorios no estén vacíos
  if (!correo || !usuario || !password) {
    return res.status(400).json({ message: "Faltan datos obligatorios" });
  }

  try {
    // Encriptar la contraseña antes de guardarla en la base de datos
    //await para esperar a que termine la operación asíncrona
    const hashed = await bcrypt.hash(password, 10);

    // Insertar el nuevo usuario en la base de datos
    const sql = `
      INSERT INTO usuarios (correo, usuario, password, vendedor, comprador)
      VALUES (?, ?, ?, ?, ?)
    `;
 
    // Ejecutar la consulta
    db.query(sql, [correo, usuario, hashed, vendedor, comprador], (err, result) => {
      if (err) {
        console.error("Error al registrar:", err);
        return res.status(500).json({ message: "Error en el servidor" });
      }
      res.status(201).json({ message: "Usuario registrado correctamente" });
    });

  } catch (error) {
    res.status(500).json({ message: "Error interno del servidor" });
  }
};
