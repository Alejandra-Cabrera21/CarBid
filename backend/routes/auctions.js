const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("../db");
const authRequired = require("../middleware/authRequired");

// ⬅️ NUEVO: ruta compartida para /uploads
const { UPLOADS_DIR } = require("../configUploads");

const router = express.Router();

/* ====== Multer: almacenamiento local en /uploads ====== */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // ⬅️ AHORA usamos siempre UPLOADS_DIR
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    const ok = /(jpe?g|png)$/i.test(path.extname(file.originalname));
    cb(ok ? null : new Error("Formato no permitido (use JPG/PNG)"), ok);
  },
});

/* ====== Helpers ====== */
function requireVendedor(req, res, next) {
  if (!req.session?.vendedor) return res.status(403).json({ message: "Requiere rol vendedor" });
  next();
}
function toMySQLDateTime(s) { if (!s) return s; return s.replace("T", " ").padEnd(19, ":00"); }
function isValidFutureDatetime(s) { const d = new Date(s); return s && !isNaN(d) && d > new Date(); }
/** Año válido: >=1900 y <= año actual (si viene informado) */
function isValidYear(y) {
  if (y === undefined || y === null || y === "") return true; // opcional
  const n = parseInt(y, 10);
  const current = new Date().getFullYear();
  return !isNaN(n) && n >= 1900 && n <= current;
}

/* ========== POST /api/subastas (crear) ========== */
router.post("/", authRequired, requireVendedor, (req, res) => {
  upload.array("images", 6)(req, res, (multerErr) => {
    if (multerErr) {
      const msg = /File too large/i.test(multerErr.message)
        ? "Imagen supera 2MB"
        : /Formato/i.test(multerErr.message) ? "Formato no permitido (usa JPG/PNG)" : "Error al procesar imágenes";
      return res.status(400).json({ message: msg });
    }

    try {
      const { marca, modelo, anio, descripcion, precio_base } = req.body;
      let { fin } = req.body;

      if (!marca || !modelo) return res.status(400).json({ message: "Marca y modelo son obligatorios" });

      const precio = Number(precio_base);
      if (!(precio > 0)) return res.status(400).json({ message: "El precio base debe ser mayor a 0" });

      // Fin > ahora
      fin = toMySQLDateTime(fin);
      if (!isValidFutureDatetime(fin)) return res.status(400).json({ message: "La fecha de cierre debe ser posterior a ahora" });

      // Año <= actual
      const currentYear = new Date().getFullYear();
      if (!isValidYear(anio)) return res.status(400).json({ message: `Año inválido (1900–${currentYear})` });
      if (anio && parseInt(anio, 10) > currentYear) {
        return res.status(400).json({ message: "El año del modelo no puede ser superior al año actual" });
      }

      if (!req.files?.length) return res.status(400).json({ message: "Debes subir al menos una imagen" });

      const qSub = `
        INSERT INTO subastas
          (id_vendedor, marca, modelo, anio, descripcion, precio_base, estado, fin)
        VALUES (?, ?, ?, ?, ?, ?, 'ABIERTA', ?)
      `;
      const anioNum = anio ? parseInt(anio, 10) : null;

      db.query(qSub, [req.user.id, marca, modelo, anioNum, descripcion || null, precio, fin], (err, result) => {
        if (err) {
          console.error("Error insert subasta:", err);
          return res.status(500).json({ message: "Error al crear subasta" });
        }
        const subastaId = result.insertId;

        // EMITIR evento de creación
        const io = req.app.get('io');
        if (io) {
          io.emit('auction:created', {
            id: subastaId, marca, modelo, anio: anioNum, precio_base: precio, estado: 'ABIERTA', fin
          });
        }

        const principalIdx = Number.isInteger(Number(req.query.principal)) ? parseInt(req.query.principal, 10) : 0;
        const qImg = `
          INSERT INTO imagenes_subasta (id_subasta, url, es_principal, size_bytes, mime)
          VALUES ?
        `;
        const values = (req.files || []).map((f, idx) => [
          subastaId, `/uploads/${f.filename}`, idx === principalIdx ? 1 : 0, f.size, f.mimetype,
        ]);

        if (!values.length) return res.status(201).json({ message: "Publicación creada", id_subasta: subastaId });

        db.query(qImg, [values], (err2) => {
          if (err2) console.error("Error insert imágenes:", err2);
          return res.status(201).json({ message: "Publicación creada", id_subasta: subastaId });
        });
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Error al crear publicación" });
    }
  });
});

/* ========== PATCH /api/subastas/:id/cerrar (cierre manual) ========== */
router.patch("/:id/cerrar", authRequired, requireVendedor, (req, res) => {
  const id = parseInt(req.params.id, 10);

  const qGet = "SELECT id_vendedor, estado FROM subastas WHERE id=? LIMIT 1";
  db.query(qGet, [id], (e, r) => {
    if (e) return res.status(500).json({ message: "Error DB" });
    if (!r.length) return res.status(404).json({ message: "No encontrada" });
    const sub = r[0];
    if (sub.estado === 'CERRADA') return res.json({ message: "Ya estaba cerrada" });

    const qUpd = "UPDATE subastas SET estado='CERRADA', fin=IF(fin<NOW(), fin, NOW()), updated_at=NOW() WHERE id=?";
    db.query(qUpd, [id], (e2) => {
      if (e2) return res.status(500).json({ message: "Error al cerrar" });

      const io = req.app.get('io');
      if (io) io.emit('auction:closed', { ids: [id] });

      res.json({ message: "Subasta cerrada", id });
    });
  });
});

/* ========== GET /api/subastas/mias/listado ========== */
router.get("/mias/listado", authRequired, requireVendedor, (req, res) => {
  const q = `
    SELECT 
      s.id, 
      s.marca, 
      s.modelo, 
      s.anio, 
      s.precio_base, 
      s.estado, 
      s.fin, 
      s.created_at,
      COALESCE(MAX(p.monto), 0) AS oferta_max
    FROM subastas s
    LEFT JOIN pujas p ON p.id_subasta = s.id
    WHERE s.id_vendedor = ?
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `;

  db.query(q, [req.user.id], (err, rows) => {
    if (err) {
      console.error("Error DB /mias/listado:", err);
      return res.status(500).json({ message: "Error al obtener subastas" });
    }
    res.json(rows);
  });
});

/* ========== GET /api/subastas/:id (detalle) ========== */
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
        res.json({ subasta: sub, imagenes: imgs, oferta_actual: top.length ? top[0].monto : null });
      });
    });
  });
});

/* ========== GET /api/subastas (listado público) ========== */
router.get("/", (req, res) => {
  const estado =
    (req.query.estado || "ABIERTA").toUpperCase() === "CERRADA"
      ? "CERRADA"
      : "ABIERTA";

  // 1) Subastas + oferta_max en una sola consulta
  const qSub = `
    SELECT 
      s.id,
      s.marca,
      s.modelo,
      s.anio,
      s.descripcion,
      s.precio_base,
      s.estado,
      s.fin,
      COALESCE(MAX(p.monto), 0) AS oferta_max
    FROM subastas s
    LEFT JOIN pujas p ON p.id_subasta = s.id
    WHERE s.estado = ?
    GROUP BY 
      s.id,
      s.marca,
      s.modelo,
      s.anio,
      s.descripcion,
      s.precio_base,
      s.estado,
      s.fin
    ORDER BY s.fin ASC
  `;

  db.query(qSub, [estado], (err, subastas) => {
    if (err) {
      console.error("Error DB /api/subastas:", err);
      return res.status(500).json({ message: "Error DB" });
    }

    if (!subastas.length) {
      return res.json([]);
    }

    // 2) Traer todas las imágenes de esas subastas en una sola consulta
    const ids = subastas.map((s) => s.id);
    const qImgs = `
      SELECT id_subasta, url, es_principal
      FROM imagenes_subasta
      WHERE id_subasta IN (?)
      ORDER BY es_principal DESC, id ASC
    `;

    db.query(qImgs, [ids], (err2, imgs) => {
      if (err2) {
        console.error("Error DB imágenes /api/subastas:", err2);
        return res.json(
          subastas.map((s) => ({
            ...s,
            imagenes: [],
          }))
        );
      }

      const mapImgs = {};
      imgs.forEach((img) => {
        if (!mapImgs[img.id_subasta]) mapImgs[img.id_subasta] = [];
        mapImgs[img.id_subasta].push({
          url: img.url,
          es_principal: img.es_principal,
        });
      });

      const result = subastas.map((s) => ({
        ...s,
        imagenes: mapImgs[s.id] || [],
      }));

      res.json(result);
    });
  });
});

/* ========== PUT /api/subastas/:id/estado (abrir/cerrar) ========== */
/*  🔐 FIX: Validación atómica en SQL: si fin <= NOW() y se quiere 'ABIERTA',
    el UPDATE no hace nada (affectedRows=0) y devolvemos 400. */
router.put("/:id/estado", authRequired, requireVendedor, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { estado } = req.body || {};

  if (!["ABIERTA", "CERRADA"].includes(estado)) {
    return res.status(400).json({ message: "Estado inválido" });
  }

  const qUpd = `
    UPDATE subastas
    SET estado = ?, updated_at = NOW()
    WHERE id = ? 
      AND id_vendedor = ?
      AND ( ? <> 'ABIERTA' OR fin > NOW() )
  `;

  db.query(qUpd, [estado, id, req.user.id, estado], (err, result) => {
    if (err) {
      console.error("Error update estado:", err);
      return res.status(500).json({ message: "Error al actualizar estado" });
    }

    if (result.affectedRows === 0) {
      // Si intentaba abrir y no se pudo, probablemente vencida.
      if (estado === 'ABIERTA') {
        return res.status(400).json({ message: "No puedes reabrir una subasta vencida." });
      }
      // También puede ser que no exista o no sea del vendedor
      return res.status(404).json({ message: "Subasta no encontrada" });
    }

    try {
      const io = req.app.get("io");
      if (io) io.emit("auction:updated", { id, estado });
    } catch (_) {}

    return res.json({ message: "Estado actualizado", id, estado });
  });
});

module.exports = router;
