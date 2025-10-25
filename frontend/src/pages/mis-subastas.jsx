// src/pages/mis-subastas.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";

const API = "http://localhost:3000/api";

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
    if (ok) {
      setEstado(nuevo);
    } else {
      setEstado(subasta.estado);
    }
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
          &nbsp;•&nbsp; Cierra: {subasta.fin ? new Date(subasta.fin).toLocaleString() : "—"}
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
  const emptyRef = useRef(null);

  /* ---- Cargar mis subastas ---- */
  const loadMyAuctions = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setItems([]);
      if (emptyRef.current) emptyRef.current.textContent = "Necesitas iniciar sesión como vendedor.";
      return;
    }

    try {
      const res = await fetch(`${API}/subastas/mias/listado?ts=${Date.now()}`, {
        headers: { Authorization: "Bearer " + token, "Cache-Control": "no-store" },
        cache: "no-store",
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
        if (emptyRef.current) emptyRef.current.textContent =
          data?.message || text || `Error ${res.status}`;
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

  // Similar a pageshow/visibilitychange del HTML
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

  // Socket.IO para refrescar cuando haya cambios externos
  useEffect(() => {
    let socket;
    try {
      socket = io("http://localhost:3000", { transports: ["websocket"] });
      socket.on("auction:updated", loadMyAuctions);
      socket.on("auction:bid", () => loadMyAuctions());
    } catch {
      console.warn("No se pudo conectar con Socket.IO");
    }
    return () => {
      try {
        socket && socket.disconnect();
      } catch {}
    };
  }, []);

  return (
    <>
      <style>{`
      :root{
        --ok:#a3e635; --err:#ef4444;
        --card:#111; --fg:#fff; --muted:#9ca3af; --border:#1f2937;
      }
      html,body{margin:0;background:#0b0b0b;color:var(--fg)}
      header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#0f0f0f}
      header a, header button{color:#fff;text-decoration:none;font-size:20px}
      header img{height:32px}

      .wrap{max-width:920px;margin:24px auto;padding:0 12px}
      h1{text-align:center;margin:18px 0 22px}

      .list{display:flex;flex-direction:column;gap:16px}
      .item{
        display:grid;grid-template-columns:1fr auto;align-items:center;gap:18px;
        background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;
      }
      .item-title{font-size:1.05rem;font-weight:600}
      .meta{font-size:.9rem;color:var(--muted);margin-top:4px}

      .estado{display:flex;align-items:center;gap:12px}

      .badge{
        padding:4px;
        border-radius:999px;
        border:1px solid var(--border);
        display:inline-flex;align-items:center;justify-content:center;
        width:26px;height:26px;
      }
      .badge.abierta{background:rgba(163,230,53,.15);border-color:rgba(163,230,53,.35)}
      .badge.cerrada{background:rgba(239,68,68,.15);border-color:rgba(239,68,68,.35)}
      .icon{
        display:inline-flex;align-items:center;justify-content:center;
        width:18px;height:18px;border-radius:50%;
        font-size:12px;font-weight:700; line-height:1;
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

      #empty{opacity:.8;text-align:center;margin:28px 0}
      @media (max-width:700px){.item{grid-template-columns:1fr;gap:12px}}
      `}</style>

      <header>
        {/* 👇 Enlace SPA correcto (sin .html) */}
        <Link to="/indexvendedor" aria-label="Regresar">←</Link>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="img/logo.png" alt="CarBid" />
          <strong>Mis subastas</strong>
        </div>
        <div />
      </header>

      <main className="wrap">
        <h1>Subastas creadas</h1>

        <section className="list">
          {items.map((sub) => (
            <SubastaItem key={sub.id} subasta={sub} onChangeEstado={changeStatus} />
          ))}
        </section>

        <p id="empty" ref={emptyRef} style={{ display: items.length ? "none" : "block" }}>
          {items.length ? "" : "No tienes subastas aún."}
        </p>
      </main>
    </>
  );
}
