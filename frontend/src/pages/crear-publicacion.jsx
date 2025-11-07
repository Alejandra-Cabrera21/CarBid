// src/pages/crear-publicacion.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";

const API = (import.meta.env.VITE_API_BASE || "https://api.carbidp.click/api").replace(/\/$/, "");


export default function CrearPublicacion() {
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [anio, setAnio] = useState("");
  const [precio, setPrecio] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fin, setFin] = useState("");
  const [files, setFiles] = useState([]);
  const [thumbs, setThumbs] = useState([]);

  // errores
  const [errs, setErrs] = useState({});
  const finMinRef = useRef("");

  // 🔧 Asegura que no quede el body sin scroll si vienes de un modal
  useEffect(() => {
    document.body.classList.remove("modal-open");
  }, []);

  const toast = (msg, type = "info") =>
    Toastify({
      text: msg,
      duration: 3000,
      gravity: "top",
      position: "right",
      close: true,
      stopOnFocus: true,
      className: type, // success | error | info (mapeado en CSS)
    }).showToast();

  // Min datetime = ahora redondeado a 5 minutos
  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + ((5 - (now.getMinutes() % 5)) % 5));
    const pad = (n) => String(n).padStart(2, "0");
    const iso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate()
    )}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    finMinRef.current = iso;
  }, []);

  // Thumbnails
  useEffect(() => {
    // revocar urls anteriores
    thumbs.forEach((u) => URL.revokeObjectURL(u));
    const urls = files.slice(0, 6).map((f) => URL.createObjectURL(f));
    setThumbs(urls);
    // cleanup
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const onFilesChange = (e) => {
    const flist = Array.from(e.target.files || []);
    setFiles(flist);
  };

  const validar = () => {
    const e = {};

    const marcaTrim = marca.trim();
    const modeloTrim = modelo.trim();
    const descTrim = descripcion.trim();

    if (!marcaTrim) e.marca = "Requerido";
    else if (marcaTrim.length > 30) e.marca = "Máx. 30 caracteres";

    if (!modeloTrim) e.modelo = "Requerido";
    else if (modeloTrim.length > 30) e.modelo = "Máx. 30 caracteres";

    if (descTrim && descTrim.length > 50)
      e.descripcion = "Máx. 50 caracteres";

    if (anio) {
      const a = parseInt(anio, 10);
      if (Number.isNaN(a) || a < 1900 || a > 2099)
        e.anio = "Año inválido (1900–2099)";
    }
    if (!precio || Number(precio) <= 0) e.precio = "Debe ser mayor a 0";

    if (!fin) e.fin = "Define fecha/hora";
    else {
      const finDate = new Date(fin);
      if (finDate <= new Date()) e.fin = "Debe ser posterior a ahora";
    }

    if (!files.length) e.images = "Sube al menos 1 imagen";

    setErrs(e);
    if (Object.keys(e).length) toast("Revisa los campos marcados", "error");
    return Object.keys(e).length === 0;
  };

  // Para deshabilitar el botón hasta que todo esté correcto
  const formOk = useMemo(() => {
    const marcaTrim = marca.trim();
    const modeloTrim = modelo.trim();
    const descTrim = descripcion.trim();

    if (!marcaTrim || marcaTrim.length > 30) return false;
    if (!modeloTrim || modeloTrim.length > 30) return false;
    if (descTrim && descTrim.length > 50) return false;

    if (anio) {
      const a = parseInt(anio, 10);
      if (Number.isNaN(a) || a < 1900 || a > 2099) return false;
    }

    if (!precio || Number(precio) <= 0) return false;

    if (!fin) return false;
    const finDate = new Date(fin);
    if (finDate <= new Date()) return false;

    if (!files.length) return false;

    return true;
  }, [marca, modelo, descripcion, anio, precio, fin, files]);

  const onCrear = async () => {
    if (!validar()) return;

    const token = localStorage.getItem("token");
    if (!token) {
      toast("Sesión no válida", "error");
      return;
    }

    const fd = new FormData();
    fd.append("marca", marca.trim());
    fd.append("modelo", modelo.trim());
    if (anio) fd.append("anio", anio.trim());
    fd.append("descripcion", descripcion.trim());
    fd.append("precio_base", precio.trim());
    // normaliza 'YYYY-MM-DDTHH:MM' -> 'YYYY-MM-DD HH:MM:SS'
    const finSQL = fin.replace("T", " ").padEnd(19, ":00");
    fd.append("fin", finSQL);
    files.slice(0, 6).forEach((f) => fd.append("images", f));

    try {
      const res = await fetch(`${API}/subastas?principal=0`, {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body: fd,
      });
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }
      if (res.ok) {
        toast((data && data.message) || "Publicación creada", "success");
        setTimeout(() => {
          // redirige al panel vendedor (ruta SPA)
          window.location.href = "/indexvendedor";
        }, 900);
      } else {
        toast((data && data.message) || text || `Error ${res.status}`, "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error de conexión con el servidor", "error");
    }
  };

  const minAttr = useMemo(
    () => finMinRef.current || undefined,
    [finMinRef.current]
  );

  return (
    <>
      <style>{`
      :root{
        --border:#cbd5e1;
        --border-focus:#94a3b8;
        --field-bg:#f2f4f7;
        --field-text:#0f172a;
        --placeholder:#9aa4b2;
        --error:#ff4d4f;
      }

      /* ✅ permite scroll vertical, bloquea horizontal */
      html, body {
        margin: 0;
        padding: 0;
        overflow-y: auto;
        overflow-x: hidden;
        min-height: 100%;
        -webkit-overflow-scrolling: touch;
      }

      .form-grid{
        max-width:920px; margin:40px auto; background:#111; padding:36px; border-radius:14px;
        overflow-y: visible; overflow-x: visible;
        width: min(920px, calc(100vw - 24px));
      }
      .row{ display:grid; grid-template-columns:1fr 1fr; column-gap:32px; row-gap:24px; }
      .row.full{ grid-template-columns:1fr; }
      .row>div{ margin-bottom:8px; }

      label{ display:block; margin:4px 0 10px; color:#fff }
      .req::after{ content:" *"; color:var(--error); font-weight:600 }

      input,textarea,select{
        width:100%; padding:12px; border-radius:10px; border:1.5px solid var(--border);
        background:var(--field-bg); color:var(--field-text); outline:none; box-shadow:none;
        transition:box-shadow .15s ease,border-color .15s ease; max-width:100%;
      }
      input::placeholder,textarea::placeholder{ color:var(--placeholder); }
      input:focus,textarea:focus,select:focus{ border-color:var(--border-focus); box-shadow:0 0 0 3px rgba(148,163,184,.18); }
      textarea{ min-height:120px; }

      input[type="file"]{
        background:var(--field-bg); color:var(--field-text); border:1.5px solid var(--border);
        display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100%;
      }

      .thumbs{ display:flex; gap:14px; flex-wrap:wrap; margin-top:10px; max-width:100%; overflow-x:auto }
      .thumbs img{ width:110px; height:80px; object-fit:cover; border-radius:8px; border:1px solid #333 }

      .actions{
  display:flex;
  gap:12px;
  justify-content:flex-end;
  margin-top:20px;
}

.btn{
  padding:10px 16px;
  border-radius:10px;
  border:none;
  cursor:pointer;
  font-weight:500;
}

/* HABILITADO = AZUL */
.btn-primary{
  background:#2563eb;   /* azul CarBid */
  color:#fff;
}

/* DESHABILITADO = CELESTE */
.btn-primary:disabled,
.btn-primary[disabled]{
  background:#67c7d6;   /* celeste clarito */
  color:#0f172a;
  cursor:not-allowed;
  opacity:1;            /* para que no se vea apagado */
}

.btn-cancel{
  background:#dc2626;
  color:#fff;
}


      /* ===== Toastify: texto blanco y colores por tipo ===== */
      .toastify{
        color:#fff !important;
        border-radius:10px !important;
        box-shadow:0 8px 24px rgba(0,0,0,.25) !important;
        font-weight:600;
      }
      .toastify .toast-close{
        color:#fff !important;
        opacity:1 !important;
      }
      .toastify.success{ background:#16a34a !important; } /* verde */
      .toastify.error  { background:#dc2626 !important; } /* rojo */
      .toastify.info   { background:#2563eb !important; } /* azul */
      .toastify:hover{ filter:brightness(.98); }

      @media (max-width:900px){
        .row{ grid-template-columns:1fr; column-gap:0; row-gap:18px }
      }

      *, *::before, *::after { box-sizing:border-box; }

      @media (max-width:600px){
        header{ padding-left:10px !important; padding-right:10px !important; }
        .form-grid{ width:100%; margin:12px auto; padding:16px; border-radius:12px; }
      }

      /* Forzar que la página pueda crecer y scrollear en Y en esta vista */
      :root, html, body, #root {
        height: auto !important;
        min-height: 100% !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
      }

      /* Título del header */
.header-title{
  color:#fff;
  font-weight:600;
  font-size:20px;   /* móvil */
}

/* En pantallas grandes lo hacemos más grande */
@media (min-width:900px){
  .header-title{
    font-size:26px; /* web/escritorio */
  }
}

/* Link de regresar con texto */
.back-link{
  display:flex;
  align-items:center;
  gap:4px;
  color:#fff;
  text-decoration:none;
  font-size:14px;
}

.back-arrow{
  font-size:18px;
  line-height:1;
}

.back-text{
  font-size:14px;
}

@media (min-width:900px){
  .back-text{
    font-size:16px;
  }
}

      `}</style>

      {/* Header */}
     <header
  style={{
    padding: "12px 20px",
    background: "#0f0f0f",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  }}
>
  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    {/* Flecha + texto Regresar */}
    <a
      href="/indexvendedor"
      aria-label="Regresar"
      className="back-link"
    >
      <span className="back-arrow">←</span>
      <span className="back-text">Regresar</span>
    </a>

    {/* Logo */}
    <img
      src="img/logo.png"
      alt="CarBid"
      style={{ height: 36, display: "block" }}
    />
  </div>

  {/* Título con clase para tamaño responsive */}
  <strong className="header-title">Crear publicación</strong>

  <div />
</header>


      {/* Formulario */}
      <main className="form-grid">
        <div className="row">
          <div>
            <label className="req">Marca</label>
            <input
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              placeholder="Toyota"
              maxLength={30}
            />
            <small className="error">{errs.marca || ""}</small>
          </div>
          <div>
            <label className="req">Modelo</label>
            <input
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              placeholder="Corolla"
              maxLength={30}
            />
            <small className="error">{errs.modelo || ""}</small>
          </div>
        </div>

        <div className="row">
          <div>
            <label>Año</label>
            <input
              type="number"
              min={1900}
              max={2099}
              step={1}
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
              placeholder="2020"
            />
            <small className="error">{errs.anio || ""}</small>
          </div>
          <div>
            <label className="req">Precio base (Q)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="5000.00"
            />
            <small className="error">{errs.precio || ""}</small>
          </div>
        </div>

        <div className="row full">
          <div>
            <label>Descripción</label>
            <textarea
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Características, estado, etc."
              maxLength={50}
            />
            <small className="error">{errs.descripcion || ""}</small>
          </div>
        </div>

        <div className="row">
          <div>
            <label className="req">Fecha y hora de cierre</label>
            <input
              type="datetime-local"
              min={minAttr}
              value={fin}
              onChange={(e) => setFin(e.target.value)}
            />
            <small className="error">{errs.fin || ""}</small>
          </div>
          <div>
            <label className="req">
              Imágenes (JPG/PNG, hasta 6, máx 2MB c/u)
            </label>
            <input
              id="images"
              type="file"
              accept=".jpg,.jpeg,.png"
              multiple
              onChange={onFilesChange}
            />
            <div className="thumbs">
              {thumbs.map((u, i) => (
                <img key={i} src={u} alt={`thumb-${i}`} />
              ))}
            </div>
            <small className="error">{errs.images || ""}</small>
          </div>
        </div>

        <div className="actions">
          <button
            className="btn btn-cancel"
            type="button"
            onClick={() => window.history.back()}
          >
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={onCrear}
            disabled={!formOk}
          >
            Crear
          </button>
        </div>
      </main>
    </>
  );
}
