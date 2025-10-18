// backend/routes/auctions.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("../db");
const authRequired = require("../middleware/authRequired");

const router = express.Router();

/* ========= Multer: almacenamiento local en /uploads ========= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(__dirname, "..", "uploads");
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    // nombre-único.ext
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB por imagen
  fileFilter: (_req, file, cb) => {
    const ok = /(jpe?g|png)$/i.test(path.extname(file.originalname));
    cb(ok ? null : new Error("Formato no permitido (use JPG/PNG)"), ok);
  },
});

/* ========= Helper: validar rol vendedor en la sesión ========= */
function requireVendedor(req, res, next) {
  if (!req.session?.vendedor)
    return res.status(403).json({ message: "Requiere rol vendedor" });
  next();
}

/* ========= POST /api/subastas  (crear publicación) =========
   Campos (multipart/form-data):
   - marca, modelo, anio, descripcion, precio_base, fin
   - images[]: hasta 6 imágenes (jpg/png). Query ?principal=0..N (opcional)
*/
router.post(
  "/",
  authRequired,
  requireVendedor,
  upload.array("images", 6),
  (req, res) => {
    try {
      const { marca, modelo, anio, descripcion, precio_base, fin } = req.body;

      if (!marca || !modelo || !precio_base || !fin) {
        return res.status(400).json({ message: "Faltan campos obligatorios." });
      }

      // Insertar subasta
      const qSub = `
        INSERT INTO subastas
          (id_vendedor, marca, modelo, anio, descripcion, precio_base, estado, fin)
        VALUES (?, ?, ?, ?, ?, ?, 'ABIERTA', ?)
      `;
      const anioNum = anio ? parseInt(anio, 10) : null;

      db.query(
        qSub,
        [req.user.id, marca, modelo, anioNum, descripcion || null, precio_base, fin],
        (err, result) => {
          if (err) {
            console.error("Error insert subasta:", err);
            return res.status(500).json({ message: "Error al crear subasta" });
          }
          const subastaId = result.insertId;

          // Si hay imágenes, registrarlas
          if (req.files && req.files.length) {
            // principal= índice de la imagen principal (default 0)
            const principalIdx = Number.isInteger(Number(req.query.principal))
              ? parseInt(req.query.principal, 10)
              : 0;

            const qImg = `
              INSERT INTO imagenes_subasta
                (id_subasta, url, es_principal, size_bytes, mime)
              VALUES ?
            `;

            const values = req.files.map((f, idx) => [
              subastaId,
              `/uploads/${f.filename}`,
              idx === principalIdx ? 1 : 0,
              f.size,
              f.mimetype,
            ]);

            db.query(qImg, [values], (err2) => {
              if (err2) {
                console.error("Error insert imágenes:", err2);
                // No hacemos rollback para simplificar; podrías borrar archivos si falla
              }
              return res.status(201).json({
                message: "Publicación creada",
                id_subasta: subastaId,
              });
            });
          } else {
            return res.status(201).json({
              message: "Publicación creada (sin imágenes)",
              id_subasta: subastaId,
            });
          }
        }
      );
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Error al crear publicación" });
    }
  }
);

/* ========= GET /api/subastas/:id  (detalle con imágenes + oferta actual) ========= */
router.get("/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const qSub = `SELECT * FROM subastas WHERE id = ? LIMIT 1`;
  const qImg = `SELECT url, es_principal FROM imagenes_subasta WHERE id_subasta = ? ORDER BY es_principal DESC, id ASC`;
  const qTop = `SELECT monto FROM pujas WHERE id_subasta = ? ORDER BY monto DESC, created_at DESC LIMIT 1`;

  db.query(qSub, [id], (e1, r1) => {
    if (e1) return res.status(500).json({ message: "Error DB" });
    if (!r1.length) return res.status(404).json({ message: "No encontrada" });
    const sub = r1[0];

    db.query(qImg, [id], (e2, imgs) => {
      if (e2) return res.status(500).json({ message: "Error DB" });

      db.query(qTop, [id], (e3, top) => {
        if (e3) return res.status(500).json({ message: "Error DB" });
        res.json({
          subasta: sub,
          imagenes: imgs,
          oferta_actual: top.length ? top[0].monto : null,
        });
      });
    });
  });
});

/* ========= GET /api/subastas  (listado público por estado=ABIERTA/CERRADA) ========= */
router.get("/", (req, res) => {
  const estado = (req.query.estado || "ABIERTA").toUpperCase() === "CERRADA" ? "CERRADA" : "ABIERTA";
  const q = `
    SELECT id, marca, modelo, anio, precio_base, estado, fin
    FROM subastas
    WHERE estado = ?
    ORDER BY fin ASC
  `;
  db.query(q, [estado], (err, rows) => {
    if (err) return res.status(500).json({ message: "Error DB" });
    res.json(rows);
  });
});

/* ========= GET /api/subastas/mias (vendedor autenticado) ========= */
router.get("/mias/listado", authRequired, requireVendedor, (req, res) => {
  const q = `
    SELECT id, marca, modelo, anio, precio_base, estado, fin, created_at
    FROM subastas
    WHERE id_vendedor = ?
    ORDER BY created_at DESC
  `;
  db.query(q, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Error DB" });
    res.json(rows);
  });
});

module.exports = router;
