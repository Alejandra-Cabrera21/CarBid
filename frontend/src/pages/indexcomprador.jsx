// src/pages/IndexComprador.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";
const API_BASE = (import.meta.env.VITE_API_BASE || "https://api.carbidp.click/api").replace(/\/$/, "");
const API = API_BASE;

// Archivos/imagenes estáticas del backend (quita el sufijo /api)
const HOST = API_BASE.replace(/\/api$/, "");

const FAST_POLL_MS = 10000;           // notificaciones
const AUCTION_POLL_MS = 15000;        // ⬅️ polling de subastas (fallback)

function fmtQ(n) {
  return "Q" + Number(n ?? 0).toLocaleString();
}
function two(n) {
  return String(n).padStart(2, "0");
}

/* ==================== Slider ==================== */
function Slider({ imagenes }) {
  const [idx, setIdx] = useState(0);
  const hasImgs = imagenes && imagenes.length > 0;
  const src = hasImgs
  ? `${HOST}${imagenes[idx].url}`
  : "img/no-image.png";

  if (!hasImgs) {
    return (
      <img
        src={src}
        alt="Sin imagen"
        style={{ height: 220, objectFit: "cover", borderRadius: 8, width: "100%" }}
      />
    );
  }

  const prev = () => setIdx((p) => (p - 1 + imagenes.length) % imagenes.length);
  const next = () => setIdx((p) => (p + 1) % imagenes.length);

  return (
    <div className="slider">
      <img src={src} alt="imagen" />
      <button className="prev" onClick={prev} aria-label="Anterior">
        ‹
      </button>
      <button className="next" onClick={next} aria-label="Siguiente">
        ›
      </button>
    </div>
  );
}

/* ==================== Card Subasta ==================== */
function SubastaCard({ sub, onPujar }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = useMemo(() => new Date(sub.fin).getTime(), [sub.fin]);
  const diff = Math.max(0, Math.floor((target - now) / 1000));
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;

  const finExacto = useMemo(() => new Date(sub.fin).toLocaleString(), [sub.fin]);
  const titulo = `${sub.marca ?? ""} ${sub.modelo ?? ""} ${sub.anio ?? ""}`.trim();

  const finalizada = diff <= 0;

  return (
    <div className="card" id={`sub_${sub.id}`}>
      <Slider imagenes={sub.imagenes} />

      <div className="muted" style={{ fontWeight: 700, marginTop: 8 }}>
        {titulo || "Vehículo"}
      </div>

      <div className="muted">
        <b>Marca:</b> {sub.marca ?? "-"}
      </div>
      <div className="muted">
        <b>Modelo:</b> {sub.modelo ?? "-"}
      </div>
      <div className="muted">
        <b>Año:</b> {sub.anio ?? "-"}
      </div>
      {sub.descripcion ? (
        <div className="muted">
          <b>Descripción:</b> {sub.descripcion}
        </div>
      ) : null}

      <div className="muted">
        <b>Precio base:</b> {fmtQ(sub.precio_base)}
      </div>
      <div className="muted">
        <b>Oferta más alta:</b> {fmtQ(sub.oferta_max || 0)}
      </div>

      <div className="muted" title={`Cierre: ${finExacto}`}>
        <b>Cierra en:</b>{" "}
        <span className="countdown">
          {finalizada ? "Finalizada" : `${d}d ${two(h)}:${two(m)}:${two(s)} restantes`}
        </span>
      </div>

      <div className="row">
        <button className="btn-pujar" onClick={() => onPujar(sub.id)} disabled={finalizada}>
          Pujar
        </button>
      </div>
    </div>
  );
}

/* ==================== Notificaciones ==================== */
function NotifPanel({ open, items, onDelete }) {
  if (!open) return null;
  return (
    <div id="notif-box" role="menu" aria-label="Notificaciones">
      {items.length === 0 ? (
        <div className="notif-empty">Sin notificaciones</div>
      ) : (
        items.map((n, i) => (
          <div className="notif-item" key={`${n.id_subasta}-${i}`}>
            <div className="txt" dangerouslySetInnerHTML={{ __html: n.text }} />
            <button className="notif-del" aria-label="Eliminar notificación" onClick={() => onDelete(i)}>
              <svg viewBox="0 0 24 24" strokeWidth="1.8">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          </div>
        ))
      )}
    </div>
  );
}

/* ==================== Diálogo Puja ==================== */
function DialogPuja({ open, onClose, onAccept }) {
  const [monto, setMonto] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setMonto("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div id="dialog" role="dialog" aria-modal="true" onClick={(e) => e.target.id === "dialog" && onClose()}>
      <div className="box">
        <h3>Ingresar oferta</h3>
        <input
          ref={inputRef}
          type="number"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          placeholder="Monto en Q"
        />
        <div className="row" style={{ gap: 8 }}>
          <button id="btnAceptar" onClick={() => onAccept(parseFloat(monto))}>
            Aceptar
          </button>
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==================== Página Principal ==================== */
export default function IndexComprador() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);

  const [search, setSearch] = useState("");
  const searchRef = useRef("");                      // ⬅️ guardamos el término actual
  useEffect(() => { searchRef.current = search; }, [search]);

  const [subastas, setSubastas] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [idSubastaActual, setIdSubastaActual] = useState(null);
  const bellRef = useRef(null);
  const notifRef = useRef(null);

  /* ===== Guardia de sesión + flash + rol ===== */
  useEffect(() => {
    const uStr = localStorage.getItem("usuario");
    let uObj = uStr ? JSON.parse(uStr) : null;
    const uid = localStorage.getItem("userId") || (uObj && uObj.id);

    if (!uid) {
      navigate("/login");
      return;
    }
    setUserId(uid);

    localStorage.setItem("rolActual", "comprador");

    const raw = localStorage.getItem("flash");
    if (raw) {
      localStorage.removeItem("flash");
      try {
        const f = JSON.parse(raw);
        Toastify({
          text: f.text || "Hecho",
          duration: f.timeout || 2200,
          gravity: "top",
          position: "right",
          close: true,
          style: {
            background: f.type === "warn" ? "#f59e0b" : f.type === "error" ? "#dc2626" : "#22c55e",
            color: "#fff",
            borderRadius: "10px",
          },
        }).showToast();
        if (f.kickTo) setTimeout(() => navigate(f.kickTo), f.timeout || 1800);
      } catch {}
    }

 (async () => {
  const esComprador = (u) =>
    u &&
    (
      u.es_comprador === "S" ||
      u.es_comprador === "s" ||
      u.es_comprador === 1 ||
      u.es_comprador === "1" ||
      u.es_comprador === true
    );

  // 1) Si localStorage no tiene comprador “válido”, refrescamos desde la API
  if (!esComprador(uObj)) {
    try {
      const r = await fetch(`${API}/usuario/${encodeURIComponent(uid)}`);
      if (r.ok) {
        uObj = await r.json();
        localStorage.setItem("usuario", JSON.stringify(uObj));
      }
    } catch {}
  }

  // 2) Volvemos a evaluar con lo que tengamos (local o API)
  if (!esComprador(uObj)) {
    Toastify({
      text: "Ya no eres comprador. Te sacamos del panel.",
      duration: 1800,
      gravity: "top",
      position: "right",
      close: true,
      style: { background: "#f59e0b", color: "#fff", borderRadius: "10px" },
    }).showToast();
    setTimeout(() => navigate("/"), 1800);
  }
})();

  }, [navigate]);

  /* ===== Carga subastas ===== */
  // En IndexComprador.jsx
  const loadSubastas = async (term = "") => {

    let data = [];
    try {
      const r = await fetch(`${API}/subastas?estado=ABIERTA`);
      data = (await r.json()) || [];
    } catch {
      data = [];
    }

    if (term) {
      const t = term.toLowerCase();
      data = data.filter((s) =>
        `${s.marca ?? ""} ${s.modelo ?? ""} ${s.descripcion ?? ""}`.toLowerCase().includes(t)
      );
    }


    const enriched = await Promise.all(
      data.map(async (s) => {
        try {
          const res = await fetch(`${API}/subastas/${s.id}`);
          if (!res.ok) throw new Error("detalle 500");
          const det = await res.json();
          return {
            ...s,
            imagenes: det?.imagenes || [],
            descripcion: det?.subasta?.descripcion ?? s.descripcion ?? "",
            oferta_max: det?.oferta_actual ?? s.oferta_max ?? s.oferta ?? 0,
          };
        } catch {
          // Si falla el detalle, igual mostramos la card sin imágenes/desc
          return {
            ...s,
            imagenes: [],
            descripcion: s.descripcion ?? "",
            oferta_max: s.oferta_max ?? s.oferta ?? 0,
          };
        }
      })
    );

    setSubastas(enriched);
  };


  // Carga inicial + polling + focus/visibility refresh
  useEffect(() => {
    let stop = false;

    const refresh = async () => {
      if (stop) return;
      await loadSubastas(searchRef.current);
    };

    refresh(); // inicial

    const poll = setInterval(refresh, AUCTION_POLL_MS);

    const onFocus = () => refresh();
    const onVisibility = () => { if (!document.hidden) refresh(); };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop = true;
      clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Debounce por búsqueda (conservado)
  useEffect(() => {
    const id = setTimeout(() => loadSubastas(search), 250);
    return () => clearTimeout(id);
  }, [search]);

  /* ===== Notificaciones ===== */
  const loadNotificaciones = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setNotifs([]);
      return;
    }
    try {
       const r = await fetch(`${API}/notificaciones?t=${Date.now()}`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!r.ok) throw new Error("Error al cargar notificaciones");
      const data = await r.json();
      setNotifs(
        data.map((n) => ({
          id_subasta: n.id_subasta,
          text: ` Ganaste <b>${n.marca} ${n.modelo}</b> por Q${Number(n.monto).toLocaleString()}`,
        }))
      );
    } catch (e) {
      // opcional
    }
  };

  const deleteNotif = async (idx) => {
    const token = localStorage.getItem("token");
    const notif = notifs[idx];
    if (!notif || !notif.id_subasta) return;
    try {
      const r = await fetch(`${API}/notificaciones/${notif.id_subasta}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token },
      });
      if (r.ok) {
        toast("Notificación eliminada");
        setNotifs((arr) => arr.filter((_, i) => i !== idx));
      } else {
        toast("Error al eliminar");
      }
    } catch {
      toast(" No se pudo eliminar");
    }
  };

  useEffect(() => {
    loadNotificaciones();
    const i = setInterval(loadNotificaciones, FAST_POLL_MS);
    const onFocus = () => loadNotificaciones();
    const onVisibility = () => {
      if (!document.hidden) loadNotificaciones();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(i);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Cerrar panel si se hace click afuera o ESC
  useEffect(() => {
    const onClick = (e) => {
      if (!notifRef.current || !bellRef.current) return;
      if (!notifRef.current.contains(e.target) && !bellRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    const onKey = (e) => e.key === "Escape" && setNotifOpen(false);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  /* ===== Socket.io ===== */
  /* ===== Socket.io ===== */
  useEffect(() => {
    const socket = io(
      import.meta.env.VITE_SOCKET_BASE || "wss://api.carbidp.click",
      {
        path: "/socket.io",
        transports: ["websocket"], // en prod sólo websocket
        withCredentials: false,
      }
    );

    const refresh = () => loadSubastas(searchRef.current);

    socket.on("connect", refresh);
    socket.on("reconnect", refresh);
    socket.on("auction:created", refresh);
    socket.on("auction:closed", refresh);
    socket.on("auction:updated", refresh);
    socket.on("auction:bid", refresh);

    socket.on("auction:won", async (data) => {
      await loadNotificaciones();
      toast(`Ganaste la subasta #${data.id_subasta}`);
      refresh();
    });

    return () => socket.disconnect();
  }, []);


  /* ===== Pujar ===== */
  const onPujar = (id) => setIdSubastaActual(id);
  const onCloseDialog = () => setIdSubastaActual(null);
  const onAcceptPuja = async (monto) => {
    if (!monto || monto <= 0) return toast("Monto inválido");
    const token = localStorage.getItem("token");
    if (!token) return toast("No hay sesión activa. Inicia sesión.");
    try {
      const r = await fetch(`${API}/pujas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ id_subasta: idSubastaActual, monto }),
      });
      const data = await r.json();
      if (r.ok) {
        toast("Puja registrada correctamente");
        onCloseDialog();
        loadSubastas(searchRef.current); // ⬅️ refrescar usando el término actual
      } else toast("⚠️ " + (data.message || "Error desconocido"));
    } catch {
      toast("No se pudo conectar con el servidor.");
    }
  };

  /* ===== Salir ===== */
  const onSalir = () => {
    localStorage.removeItem("rolActual");
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("flash");
  };

  const bellCount = notifs.length;

  return (
    <>
      <style>{`
    :root{
      --bg:#111; --panel:#0f0f0f; --card:#171717; --border:#2a2a2a; --fg:#fff; --muted:#cbd5e1;
      --brand:#1e40af; --brand-hover:#2563eb;
    }
    *{box-sizing:border-box}
    html,body{margin:0; background:var(--bg); color:var(--fg); font-family:system-ui,Segoe UI,Roboto,Arial}
    body{overflow-x:hidden}

    header{
      position:sticky; top:0; z-index:50;
      background:var(--panel);
      display:flex; align-items:center; justify-content:space-between;
      gap:12px; padding:12px 16px;
    }
    header .left{display:flex; align-items:center; gap:10px; min-width:0}
    header .left img{height:40px; flex:0 0 auto}
    header .left strong{white-space:nowrap}
    header .left input{
      padding:8px 10px; border-radius:10px; border:1px solid var(--border);
      width:280px; max-width:48vw; background:#fff; color:#111;
    }
    header .right{display:flex; align-items:center; gap:18px; flex:0 0 auto}
    header a{color:#fff; text-decoration:none; white-space:nowrap}

    #bell{
  position:relative;
  cursor:pointer;
  background:transparent;
  border:none;
  outline:none;          /* 👈 quita la orilla */
  box-shadow:none;       /* 👈 por si algún estilo global le pone sombra */
  padding:0;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  width:28px;
  height:28px;
}

/* fuerza a que en foco tampoco pinte borde */
#bell:focus,
#bell:focus-visible,
#bell:active {
  outline:none !important;
  box-shadow:none !important;
  border:none !important;
}

#bell svg{
  width:24px;
  height:24px;
  stroke:#fff;
  fill:none;
}

#notif-count{
  position:absolute; top:-6px; right:-8px;
  min-width:18px; height:18px; padding:0 5px;
  background:#ef4444; color:#fff; border-radius:999px;
  font-size:12px; line-height:18px; text-align:center;
}


   #notif-box{
  position:absolute;
  right:0;                         /* pegado al borde derecho / campana */
  top: calc(100% + 18px);           /* justo debajo del header/right */
  background:#1f2937;
  color:#fff;
  border-radius:10px;
  padding:10px;
  display:flex;
  flex-direction:column;
  gap:8px;
  width:min(320px, 94vw);
  max-height:70vh;
  overflow:auto;
  box-shadow:0 12px 24px rgba(0,0,0,.35);
  z-index:10000;
}
    .notif-empty{ text-align:center; font-size:13px; color:#9ca3af; padding:6px 2px}

    .notif-item{
      display:flex; align-items:center; justify-content:space-between; gap:10px;
      background:#374151; padding:8px 10px; border-radius:8px; font-size:14px;
    }
    .notif-item .txt{flex:1 1 auto; min-width:0}
    .notif-del{
      background:transparent; border:none; cursor:pointer; padding:4px; flex:0 0 auto;
      display:inline-flex; align-items:center; justify-content:center; border-radius:6px;
    }
    .notif-del:hover{background:rgba(255,255,255,.08)}
    .notif-del svg{width:18px; height:18px; stroke:#fff; fill:none}

    #toast{
      position: fixed; bottom: 25px; right: 25px;
      background: #166534; color: #fff; padding: 12px 16px;
      border-radius: 8px; box-shadow: 0 0 12px rgba(0,0,0,0.4);
      opacity: 0; transform: translateY(20px); transition: all .35s ease; z-index: 9999;
    }
    #toast.show{opacity:1; transform:translateY(0)}

    .wrap{max-width:1100px; margin:24px auto; padding:0 12px}
    h1{font-weight:700; margin:10px 0 24px}
    .grid{display:grid; grid-template-columns:repeat(auto-fill, minmax(260px,1fr)); gap:20px}

    .card{background:var(--card); border:1px solid #fff; border-radius:12px; padding:16px; text-align:left}
    .muted{color:var(--muted); margin:2px 0; word-break:break-word}
    .card .row{display:flex; justify-content:flex-end; align-items:center; margin-top:8px; gap:10px}

    button{background:var(--brand); border:none; color:#fff; border-radius:8px; padding:8px 12px; cursor:pointer}
    button:hover{background:var(--brand-hover)}
    button[disabled]{opacity:.6; cursor:not-allowed}
    img{max-width:100%; border-radius:8px; object-fit:cover; height:220px}

    .slider{position:relative; overflow:hidden}
    .slider img{width:100%; height:220px; object-fit:cover; border-radius:8px}
    .slider button{
      position:absolute; top:50%; transform:translateY(-50%);
      background:rgba(0,0,0,.6); border:none; color:#fff;
      font-size:20px; padding:5px 10px; cursor:pointer
    }
    .slider button.prev{left:5px}
    .slider button.next{right:5px}
    #dialog{
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.7);
      display:flex;
      align-items:center;
      justify-content:center;
      z-index:10;
    }

    #dialog .box{
      background:#fff;
      color:#000;
      padding:20px;
      border-radius:10px;
      min-width:min(380px, 92vw);
      text-align:center;
    }

    #dialog input{
      width:100%;
      padding:10px;
      margin:10px 0;
      border:1px solid #ddd;
      border-radius:8px;
    }

    /* ===== Botones del diálogo ===== */

    /* Aceptar: se queda con el color general (brand) */
    #dialog .box #btnAceptar{
      background:var(--brand);
    }
    #dialog .box #btnAceptar:hover{
      background:var(--brand-hover);
    }

    /* Cancelar: rojo */
    #dialog .box button[type="button"]{
      background:#b91c1c;
    }
    #dialog .box button[type="button"]:hover{
      background:#dc2626;
    }

    @media (max-width:820px){
      header .left input{max-width:44vw}
      header .right{gap:12px}
    }
    @media (max-width:560px){
      header{flex-wrap:wrap; row-gap:10px}
      header .left{width:100%}
      header .left input{max-width:100%; flex:1}
      header .right{width:100%; justify-content:space-between}
    }
      `}</style>

      <header>
        <div className="left">
          <img src="/img/logo.png" alt="CarBid" />
          <input
            type="text"
            placeholder="Buscar..."
            aria-label="Buscar vehículo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="right" style={{ position: "relative" }}>
          {/* ⇨ SPA links */}
          <Link to="/historial-subastas">Historial Subastas</Link>
          <Link to={`/perfil?id=${encodeURIComponent(userId || "")}`}>Mi perfil</Link>
          <Link to="/" onClick={onSalir}>Salir</Link>

          <button
            id="bell"
            aria-label="Notificaciones"
            onClick={() => setNotifOpen((o) => !o)}
            ref={bellRef}
          >
            <svg viewBox="0 0 24 24" strokeWidth="1.8" aria-hidden="true">
              <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.172V11a6 6 0 1 0-12 0v3.172a2 2 0 0 1-.6 1.428L4 17h5" />
              <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
            </svg>
            <span id="notif-count">{bellCount}</span>
          </button>

          {/* Panel */}
          <div ref={notifRef} style={{ position: "relative" }}>
            <NotifPanel open={notifOpen} items={notifs} onDelete={deleteNotif} />
          </div>
        </div>
      </header>

      <main className="wrap">
        <h1>Subastas abiertas</h1>
        <div id="list" className="grid">
          {subastas.map((s) => (
            <SubastaCard key={s.id} sub={s} onPujar={onPujar} />
          ))}
        </div>
      </main>

      {/* Diálogo Puja */}
      <DialogPuja
        open={idSubastaActual !== null}
        onClose={onCloseDialog}
        onAccept={onAcceptPuja}
      />

      {/* Fallback toast local */}
      <div id="toast" role="status" aria-live="polite" />
    </>
  );
}

/* ==================== Mini util toast ==================== */
function toast(text) {
  if (typeof window !== "undefined" && window.document) {
    try {
      Toastify({
        text,
        duration: 2500,
        gravity: "top",
        position: "right",
        close: true,
        style: { background: "#22c55e", color: "#fff", borderRadius: "10px" },
      }).showToast();
      return;
    } catch {}
    const t = document.getElementById("toast");
    if (t) {
      t.textContent = text;
      t.classList.add("show");
      setTimeout(() => t.classList.remove("show"), 3000);
    }
  }
}
