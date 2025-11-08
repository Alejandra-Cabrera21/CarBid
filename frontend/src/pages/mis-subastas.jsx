// src/pages/mis-subastas.jsx 
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";

const API_BASE = (import.meta.env.VITE_API_BASE || "https://api.carbidp.click/api").replace(/\/$/, "");
const API = API_BASE;

/* =============== Utils =============== */
function toast(msg, type = "info") {
  try {
    Toastify({
      text: msg,
      duration: 3000,
      gravity: "top",
      position: "right",
      close: true,
      className: type,
    }).showToast();
  } catch {
    // Fallback silencioso
  }
}

function Badge({ estado }) {
  const abierta = estado === "ABIERTA";
  return (
    <span className={`badge ${abierta ? "abierta" : "cerrada"}`}>
      <span className={`icon ${abierta ? "ok" : "err"}`}>{abierta ? "✓" : "✕"}</span>
    </span>
  );
}

/* =============== Item de subasta =============== */
function SubastaItem({ subasta, onChangeEstado }) {
  const vencida = useMemo(
    () => subasta.fin && new Date(subasta.fin) <= new Date(),
    [subasta.fin]
  );
  const [estado, setEstado] = useState(subasta.estado);

  useEffect(() => setEstado(subasta.estado), [subasta.estado]);

  const onChange = async (e) => {
    const nuevo = e.target.value;

    // Evitar reabrir si ya venció
    if (vencida && nuevo === "ABIERTA") {
      toast("No puedes reabrir una subasta vencida", "error");
      setEstado(subasta.estado);
      return;
    }

    const ok = await onChangeEstado(subasta.id, nuevo);
    if (ok) setEstado(nuevo);
    else setEstado(subasta.estado);
  };

  const selectClass = `select ${estado === "ABIERTA" ? "abierta" : "cerrada"}`;

  return (
    <article className="item">
      <div>
        <div className="item-title">
          {subasta.marca} {subasta.modelo}
          {subasta.anio ? " " + subasta.anio : ""}
        </div>
        <div className="meta">
          Precio base: Q{Number(subasta.precio_base).toLocaleString("en-US")}
          &nbsp;•&nbsp; Oferta más alta:{" "}
          <strong>Q{Number(subasta.oferta_max || 0).toLocaleString("en-US")}</strong>
          &nbsp;•&nbsp; Cierre: {subasta.fin ? new Date(subasta.fin).toLocaleString() : "—"}
        </div>
      </div>

      <div className="estado">
        <Badge estado={estado} />
        <span className="sel-wrap">
          <select className={selectClass} value={estado} onChange={onChange}>
            <option value="ABIERTA" disabled={vencida}>
              Abierta
            </option>
            <option value="CERRADA">Cerrada</option>
          </select>
          <span className="caret">▾</span>
        </span>
      </div>
    </article>
  );
}

/* =============== Página =============== */
export default function MisSubastas() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const emptyRef = useRef(null);

  // Por si vienes de una pantalla que bloqueó el scroll (p. ej. un modal)
  useEffect(() => {
    document.body.classList.remove("modal-open", "login-page");
  }, []);

  /* ---- Cargar mis subastas ---- */
  const loadMyAuctions = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setItems([]);
      if (emptyRef.current)
        emptyRef.current.textContent = "Necesitas iniciar sesión como vendedor.";
      return;
    }

    try {
      const res = await fetch(`${API}/subastas/mias/listado?ts=${Date.now()}`, {
        headers: { Authorization: "Bearer " + token },
      });
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (res.ok) {
        if (!data || !data.length) {
          setItems([]);
          if (emptyRef.current) emptyRef.current.textContent = "No tienes subastas aún.";
          return;
        }
        setItems(data);
      } else {
        setItems([]);
        if (emptyRef.current)
          emptyRef.current.textContent = data?.message || text || `Error ${res.status}`;
      }
    } catch (e) {
      setItems([]);
      if (emptyRef.current) emptyRef.current.textContent = "Error de conexión";
    }
  };

  /* ---- Cambiar estado ---- */
  const changeStatus = async (id, estado) => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast("Sesión inválida", "error");
      return false;
    }
    try {
      const res = await fetch(`${API}/subastas/${id}/estado`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
          "Cache-Control": "no-store",
        },
        body: JSON.stringify({ estado }),
      });
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }
      if (res.ok) {
        toast("Estado actualizado", "success");
        setItems((arr) => arr.map((s) => (s.id === id ? { ...s, estado } : s)));
        return true;
      } else {
        toast(data?.message || text || "No se pudo actualizar", "error");
        return false;
      }
    } catch (e) {
      toast("Error de conexión", "error");
      return false;
    }
  };

  /* ---- Ciclo de vida ---- */
  useEffect(() => {
    loadMyAuctions();
  }, []);

  // Refrescar al volver a la pestaña o hacer back/forward cache
  useEffect(() => {
    const onPageShow = (ev) => {
      if (ev.persisted) loadMyAuctions();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") loadMyAuctions();
    };
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Socket.IO para refrescar
  useEffect(() => {
    let socket;
    try {
      socket = io("wss://api.carbidp.click", {
        path: "/socket.io",
        transports: ["websocket"],
        withCredentials: false,
      });

      // Escucha eventos desde el backend
      socket.on("auction:updated", loadMyAuctions);
      socket.on("auction:bid", loadMyAuctions);

      console.log("✅ Conectado a Socket.IO en producción");
    } catch (err) {
      console.warn("⚠️ No se pudo conectar con Socket.IO:", err.message);
    }

    // Limpieza al desmontar el componente
    return () => {
      try {
        socket && socket.disconnect();
        console.log("🔌 Socket desconectado");
      } catch {}
    };
  }, []);


  /* ---- Filtro de búsqueda ---- */
  const filteredItems = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((s) => {
      const texto = `${s.marca || ""} ${s.modelo || ""} ${s.anio || ""} ${
        s.precio_base || ""
      } ${s.estado || ""}`.toLowerCase();
      return texto.includes(term);
    });
  }, [q, items]);

  // Resetear página cuando cambie el filtro o el listado
  useEffect(() => {
    setCurrentPage(1);
  }, [q, items.length]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const pagedItems = filteredItems.slice(startIndex, startIndex + pageSize);

  const handlePrev = () => {
    setCurrentPage((p) => (p > 1 ? p - 1 : p));
  };

  const handleNext = () => {
    setCurrentPage((p) => (p < totalPages ? p + 1 : p));
  };

  return (
    <>
      <style>{`
      :root{
        --ok:#a3e635;
        --err:#ef4444;
        --card:#111;
        --fg:#fff;
        --muted:#9ca3af;
        --border:#1f2937;
        --card-border:#2563eb; /* azul que resalta más */
      }

      /* 🔒 Forzamos scroll vertical y bloqueamos horizontal */
      :root, html, body, #root {
        height: auto !important;
        min-height: 100% !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        background:#0b0b0b;
        color: var(--fg);
      }

      header{
        display:flex;align-items:center;justify-content:space-between;
        padding:12px 16px;background:#0f0f0f
      }
      header a, header button{color:#fff;text-decoration:none;font-size:20px}
      header img{height:32px}

      .wrap{
        max-width:920px;margin:24px auto;padding:0 12px 24px;
      }
      h1{text-align:center;margin:18px 0 22px}

      /* ===== Barra de búsqueda ===== */
      .toolbar{
        display:flex;
        justify-content:flex-end;
        margin-bottom:18px;
      }
      .search-box{
        position:relative;
        width:100%;
        max-width:280px;
      }
      .search-box input{
        width:100%;
        padding:8px 12px 8px 32px;
        border-radius:999px;
        border:1px solid #e5e7eb;
        background:#ffffff;       /* blanca */
        color:#111827;            /* texto oscuro */
        font-size:.9rem;
        outline:none;
      }
      .search-box input::placeholder{
        color:#6b7280;
      }
      .search-box svg{
        position:absolute;
        left:10px;
        top:50%;
        transform:translateY(-50%);
        width:14px;
        height:14px;
        opacity:.7;
        color:#6b7280;
      }

      .list{display:flex;flex-direction:column;gap:16px}
      .item{
        display:grid;grid-template-columns:1fr auto;align-items:center;gap:18px;
        background:var(--card);
        border:1px solid var(--card-border); /* borde azul más fuerte */
        border-radius:12px;
        padding:16px;
        box-shadow:0 0 0 1px rgba(37,99,235,.4);
      }
      .item:hover{
        box-shadow:0 0 0 2px rgba(37,99,235,.7);
        transform:translateY(-1px);
        transition:box-shadow .15s ease, transform .15s ease;
      }
      .item-title{font-size:1.05rem;font-weight:600}
      .meta{font-size:.9rem;color:var(--muted);margin-top:4px}

      .estado{display:flex;align-items:center;gap:12px}

      .badge{
        padding:4px;border-radius:999px;border:1px solid var(--border);
        display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;
      }
      .badge.abierta{background:rgba(163,230,53,.15);border-color:rgba(163,230,53,.35)}
      .badge.cerrada{background:rgba(239,68,68,.15);border-color:rgba(239,68,68,.35)}
      .icon{
        display:inline-flex;align-items:center;justify-content:center;
        width:18px;height:18px;border-radius:50%;font-size:12px;font-weight:700;line-height:1;
      }
      .icon.ok{background:rgba(163,230,53,.25)}
      .icon.err{background:rgba(239,68,68,.25)}

      .sel-wrap{position:relative;display:inline-block}
      .sel-wrap .caret{
        position:absolute;right:10px;top:50%;transform:translateY(-50%);
        pointer-events:none;opacity:.8
      }
      .select{
        appearance:none;-webkit-appearance:none;-moz-appearance:none;
        border:1px solid var(--border);background:#0f0f0f;color:#fff;border-radius:10px;
        padding:8px 30px 8px 10px;cursor:pointer;min-width:140px;
      }
      .select.abierta{box-shadow:0 0 0 2px rgba(163,230,53,.25) inset}
      .select.cerrada{box-shadow:0 0 0 2px rgba(239,68,68,.25) inset}

      /* ===== Paginación ===== */
      .pagination{
        display:flex;
        justify-content:center;
        align-items:center;
        gap:12px;
        margin-top:20px;
      }
      .pagination button{
        border:none;
        border-radius:999px;
        padding:6px 14px;
        font-size:.9rem;
        cursor:pointer;
        background:#2563eb;
        color:#fff;
      }
      .pagination button[disabled]{
        opacity:.4;
        cursor:default;
      }
      .pagination span{
        font-size:.85rem;
        color:var(--muted);
      }

      #empty{opacity:.8;text-align:center;margin:28px 0}
      @media (max-width:700px){.item{grid-template-columns:1fr;gap:12px}}
      `}</style>

      <header>
        <Link to="/indexvendedor" aria-label="Regresar">← Regresar</Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/img/logo.png" alt="CarBid" />
          <strong>Mis subastas</strong>
        </div>
        <div />
      </header>

      <main className="wrap">
        <h1>Subastas creadas</h1>

        {/* Barra de búsqueda blanca */}
        <div className="toolbar">
          <div className="search-box">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79L19 20.5 20.5 19 15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
              />
            </svg>
            <input
              type="search"
              placeholder="Buscar..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <section className="list">
          {pagedItems.map((sub) => (
            <SubastaItem key={sub.id} subasta={sub} onChangeEstado={changeStatus} />
          ))}
        </section>

        {/* Mensaje cuando no hay subastas en absoluto */}
        <p
          id="empty"
          ref={emptyRef}
          style={{ display: !items.length ? "block" : "none" }}
        >
          {!items.length ? "No tienes subastas aún." : ""}
        </p>

        {/* Mensaje cuando sí hay subastas, pero el filtro no encuentra nada */}
        {items.length > 0 && filteredItems.length === 0 && (
          <p
            style={{
              marginTop: 16,
              textAlign: "center",
              opacity: 0.8,
            }}
          >
            No hay subastas que coincidan con tu búsqueda.
          </p>
        )}

        {/* Paginación: solo si hay más de 5 resultados */}
        {filteredItems.length > pageSize && (
          <div className="pagination">
            <button onClick={handlePrev} disabled={currentPage === 1}>
              Anterior
            </button>
            <span>
              Página {currentPage} de {totalPages}
            </span>
            <button onClick={handleNext} disabled={currentPage === totalPages}>
              Siguiente
            </button>
          </div>
        )}
      </main>
    </>
  );
}
