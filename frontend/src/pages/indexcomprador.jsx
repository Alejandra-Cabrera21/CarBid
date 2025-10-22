// src/pages/indexcomprador.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";
import { io } from "socket.io-client";
import "../styles/panel-vendedor.css"; // (opcional) coloca aquí tus estilos del HTML

const API = import.meta.env.VITE_API_BASE || "http://localhost:3000/api";
const WS_URL = (import.meta.env.VITE_WS_URL || "http://localhost:3000").replace(/\/$/, "");

function fmtQ(n) {
  const num = Number(n ?? 0);
  return "Q" + (Number.isFinite(num) ? num.toLocaleString() : "0");
}

function toastOK(text) {
  Toastify({
    text,
    duration: 2200,
    gravity: "top",
    position: "right",
    close: true,
    style: { background: "#166534", color: "#fff", borderRadius: "10px" },
  }).showToast();
}
function toastWarn(text) {
  Toastify({
    text,
    duration: 1800,
    gravity: "top",
    position: "right",
    close: true,
    style: { background: "#f59e0b", color: "#fff", borderRadius: "10px" },
  }).showToast();
}
function toastErr(text) {
  Toastify({
    text,
    duration: 2200,
    gravity: "top",
    position: "right",
    close: true,
    style: { background: "#dc2626", color: "#fff", borderRadius: "10px" },
  }).showToast();
}

/* ---------------------------
   Tarjeta de subasta
---------------------------- */
function AuctionCard({ subasta, onPujar }) {
  const [idx, setIdx] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const imgs = subasta.imagenes || [];
  const finMs = useMemo(() => new Date(subasta.fin).getTime(), [subasta.fin]);

  const diff = Math.max(0, finMs - now);
  const t = Math.floor(diff / 1000);
  const d = Math.floor(t / 86400);
  const h = Math.floor((t % 86400) / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const finExacto = useMemo(() => new Date(subasta.fin).toLocaleString(), [subasta.fin]);

  const title = `${subasta.marca ?? ""} ${subasta.modelo ?? ""} ${subasta.anio ?? ""}`.trim();

  return (
    <div className="card" id={`sub_${subasta.id}`}>
      {/* Slider */}
      <div className="slider">
        <img
          src={
            imgs.length
              ? `${WS_URL}${imgs[idx].url}`
              : "/img/no-image.png"
          }
          alt="imagen"
          style={{ maxWidth: "100%", borderRadius: 8, height: 220, objectFit: "cover" }}
        />
        {imgs.length > 1 && (
          <>
            <button className="prev" onClick={() => setIdx((p) => (p - 1 + imgs.length) % imgs.length)} aria-label="Anterior">
              ‹
            </button>
            <button className="next" onClick={() => setIdx((p) => (p + 1) % imgs.length)} aria-label="Siguiente">
              ›
            </button>
          </>
        )}
      </div>

      {/* Datos */}
      <div className="muted" style={{ fontWeight: 700, marginTop: 8 }}>{title || "Vehículo"}</div>
      <div className="muted"><b>Marca:</b> {subasta.marca ?? "-"}</div>
      <div className="muted"><b>Modelo:</b> {subasta.modelo ?? "-"}</div>
      <div className="muted"><b>Año:</b> {subasta.anio ?? "-"}</div>
      {subasta.descripcion ? (
        <div className="muted"><b>Descripción:</b> {subasta.descripcion}</div>
      ) : null}

      <div className="muted"><b>Precio base:</b> {fmtQ(subasta.precio_base)}</div>
      <div className="muted"><b>Oferta más alta:</b> {fmtQ(subasta.oferta_max || 0)}</div>

      <div className="muted" title={`Cierra: ${finExacto}`}>
        <b>Cierra en:</b>{" "}
        <span className="countdown">
          {diff <= 0 ? "Finalizada" : `${d}d ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} restantes`}
        </span>
      </div>

      <div className="row">
        <button className="btn-pujar" disabled={diff <= 0} onClick={() => onPujar(subasta.id)}>
          Pujar
        </button>
      </div>
    </div>
  );
}

/* ---------------------------
   Página IndexComprador
---------------------------- */
export default function IndexComprador() {
  const navigate = useNavigate();

  // sesión / usuario
  const [userId, setUserId] = useState(null);

  // UI estado
  const [search, setSearch] = useState("");
  const [subastas, setSubastas] = useState([]);
  const [loading, setLoading] = useState(false);

  // notificaciones
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);

  // puja modal
  const [dialogOpen, setDialogOpen] = useState(false);
  const [subastaActual, setSubastaActual] = useState(null);
  const [monto, setMonto] = useState("");

  const tokenRef = useRef(localStorage.getItem("token") || "");

  // Guard de sesión + rol
  useEffect(() => {
    const uStr = localStorage.getItem("usuario");
    let uObj = uStr ? JSON.parse(uStr) : null;
    const id = localStorage.getItem("userId") || (uObj && uObj.id);

    if (!id) {
      navigate("/login");
      return;
    }
    setUserId(id);
    localStorage.setItem("rolActual", "comprador");

    // validar rol vendedor/ comprador desde API (tolerante a error de red)
    (async () => {
      if (!uObj || uObj.es_comprador !== "S") {
        try {
          const r = await fetch(`${API}/usuario/${encodeURIComponent(id)}`);
          if (r.ok) {
            const u = await r.json();
            localStorage.setItem("usuario", JSON.stringify(u));
            uObj = u;
          }
        } catch {
          // no expulsar por error de red
        }
      }
      if (!uObj || uObj.es_comprador !== "S") {
        toastWarn("Ya no eres comprador. Te sacamos del panel.");
        setTimeout(() => navigate("/"), 1800);
      }
    })();
  }, [navigate]);

  // cargar subastas
  async function loadSubastas(term = "") {
    try {
      setLoading(true);
      const r = await fetch(`${API}/subastas?estado=ABIERTA`);
      let base = await r.json();

      if (term) {
        const t = term.toLowerCase();
        base = base.filter((s) =>
          `${s.marca ?? ""} ${s.modelo ?? ""} ${s.descripcion ?? ""}`
            .toLowerCase()
            .includes(t)
        );
      }

      // enriquecer con imágenes/oferta
      const dets = await Promise.all(
        base.map(async (s) => {
          try {
            const r2 = await fetch(`${API}/subastas/${s.id}`);
            const det = await r2.json();
            return {
              ...s,
              descripcion: det.subasta?.descripcion ?? s.descripcion,
              imagenes: det.imagenes || [],
              oferta_max: det.oferta_actual ?? s.oferta_max,
            };
          } catch {
            return s;
          }
        })
      );

      setSubastas(dets);
    } catch (e) {
      console.error("Error cargando subastas", e);
    } finally {
      setLoading(false);
    }
  }

  // notificaciones
  async function loadNotificaciones() {
    const token = tokenRef.current;
    if (!token) {
      setNotifs([]);
      return;
    }
    try {
      const r = await fetch(`${API}/notificaciones?t=${Date.now()}`, {
        headers: { Authorization: "Bearer " + token },
        cache: "no-store",
      });
      if (!r.ok) throw new Error("fetch notifs");
      const data = await r.json();
      setNotifs(
        data.map((n) => ({
          id_subasta: n.id_subasta,
          text: `🏁 Ganaste <b>${n.marca} ${n.modelo}</b> por ${fmtQ(n.monto)}`,
        }))
      );
    } catch (e) {
      console.warn("No se pudieron cargar notificaciones", e);
    }
  }

  async function deleteNotif(idx) {
    const item = notifs[idx];
    if (!item) return;
    try {
      const r = await fetch(`${API}/notificaciones/${item.id_subasta}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + tokenRef.current },
      });
      if (r.ok) {
        toastOK("🗑️ Notificación eliminada");
        setNotifs((prev) => prev.filter((_, i) => i !== idx));
      } else {
        toastWarn("No se pudo eliminar");
      }
    } catch {
      toastErr("Error al eliminar");
    }
  }

  // sockets
  useEffect(() => {
    loadSubastas();
    loadNotificaciones();

    const s = io(WS_URL, { transports: ["websocket"] });
    s.on("auction:created", () => loadSubastas(search));
    s.on("auction:closed", () => loadSubastas(search));
    s.on("auction:bid", () => loadSubastas(search));
    s.on("auction:updated", () => loadSubastas(search));
    s.on("auction:won", async () => {
      await loadNotificaciones();
      toastOK("¡Actualizamos tus notificaciones!");
    });

    const poll = setInterval(loadNotificaciones, 10000);
    const onFocus = () => loadNotificaciones();
    const onVis = () => !document.hidden && loadNotificaciones();

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      s.close();
      clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []); // eslint-disable-line

  // Buscar
  useEffect(() => {
    const t = setTimeout(() => loadSubastas(search), 300);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line

  // pujar
  function abrirPuja(id) {
    setSubastaActual(id);
    setMonto("");
    setDialogOpen(true);
  }
  function cerrarPuja() {
    setDialogOpen(false);
    setSubastaActual(null);
  }
  async function confirmarPuja() {
    const m = parseFloat(monto);
    if (!m || m <= 0) return toastWarn("Monto inválido");
    if (!tokenRef.current) return toastWarn("No hay sesión. Inicia sesión.");

    try {
      const r = await fetch(`${API}/pujas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + tokenRef.current,
        },
        body: JSON.stringify({ id_subasta: subastaActual, monto: m }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) {
        toastOK("✅ Puja registrada correctamente");
        cerrarPuja();
        loadSubastas(search);
      } else {
        toastWarn(data.message || "No se pudo registrar la puja");
      }
    } catch {
      toastErr("No se pudo conectar con el servidor");
    }
  }

  // logout
  function logout() {
    localStorage.removeItem("rolActual");
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("flash");
    navigate("/");
  }

  return (
    <>
      {/* HEADER */}
      <header className="comprador-header">
        <div className="left">
          <img src="/img/logo.png" alt="CarBid" style={{ height: 40 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            aria-label="Buscar vehículo"
          />
        </div>

        <div className="right">
          <Link to="/historial-subastas">Historial Subastas</Link>
          <Link to={`/perfil?id=${encodeURIComponent(userId || "")}`}>Mi perfil</Link>
          <button className="linklike" onClick={logout}>Salir</button>

          {/* Campana */}
          <div className="bell-wrap">
            <button
              id="bell"
              aria-label="Notificaciones"
              onClick={() => setNotifOpen((v) => !v)}
            >
              {/* simple icono bell */}
              <svg viewBox="0 0 24 24" strokeWidth="1.8" width="24" height="24">
                <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.172V11a6 6 0 1 0-12 0v3.172a2 2 0 0 1-.6 1.428L4 17h5" stroke="currentColor" fill="none" />
                <path d="M9 17v1a3 3 0 0 0 6 0v-1" stroke="currentColor" fill="none" />
              </svg>
              <span id="notif-count">{notifs.length}</span>
            </button>

            {notifOpen && (
              <div id="notif-box" role="menu" aria-label="Notificaciones">
                {notifs.length === 0 ? (
                  <div className="notif-empty">Sin notificaciones</div>
                ) : (
                  notifs.map((n, i) => (
                    <div className="notif-item" key={i}>
                      <div className="txt" dangerouslySetInnerHTML={{ __html: n.text }} />
                      <button className="notif-del" aria-label="Eliminar notificación" onClick={() => deleteNotif(i)}>
                        <svg viewBox="0 0 24 24" strokeWidth="1.8" width="18" height="18">
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" fill="none" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" fill="none" />
                          <path d="M10 11v6M14 11v6" stroke="currentColor" fill="none" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* CONTENIDO */}
      <main className="wrap">
        <h1>Subastas abiertas</h1>

        {loading ? (
          <p style={{ opacity: 0.8 }}>Cargando…</p>
        ) : (
          <div className="grid">
            {subastas.map((s) => (
              <AuctionCard key={s.id} subasta={s} onPujar={abrirPuja} />
            ))}
          </div>
        )}
      </main>

      {/* MODAL PUJA */}
      {dialogOpen && (
        <div
          id="dialog"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDialogOpen(false);
          }}
        >
          <div className="box">
            <h3>Ingresar oferta</h3>
            <input
              type="number"
              placeholder="Monto en Q"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
            <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
              <button onClick={confirmarPuja}>Aceptar</button>
              <button type="button" onClick={() => setDialogOpen(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
