// src/pages/historial-subastas.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/historialsubastas.css";

const API_BASE = (import.meta.env.VITE_API_BASE || "https://api.carbidp.click/api").replace(/\/$/, "");
const API = API_BASE;


export default function HistorialSubastas() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("fecha"); // fecha | vehiculo | precio | mi | ganadora | resultado | estado
  const [sortDir, setSortDir] = useState("desc"); // asc | desc
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const infoRef = useRef(null);
  const tableWrapRef = useRef(null);
  const cardsWrapRef = useRef(null);
  const pagerRef = useRef(null);

  /* ===== Formatters ===== */
  const fmtGTQ = useMemo(
    () => new Intl.NumberFormat("es-GT", { maximumFractionDigits: 0 }),
    []
  );
  const fmtDate = useMemo(
    () =>
      new Intl.DateTimeFormat("es-GT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    []
  );

  /* ===== Normalizador para la vista ===== */
  function normalize(r) {
    const d = r.fecha_cierre ? new Date(r.fecha_cierre) : null;
    return {
      id: r.id_subasta,
      vehiculo: r.vehiculo || "Publicación",
      precio: Number(r.precio_base || 0),
      mi: Number(r.mi_oferta || 0),
      ganadora: Number(r.oferta_ganadora || 0),
      resultado: r.resultado || "—",
      estado: r.estado || "CERRADA",
      fecha: d ? fmtDate.format(d) : "",
      ts: d ? d.getTime() : 0,
    };
  }

  /* ===== Filtro, orden, paginado ===== */
  const view = useMemo(() => {
    const term = q.trim().toLowerCase();
    const mul = sortDir === "asc" ? 1 : -1;

    const filtered = rows
      .map(normalize)
      .filter((x) => {
        if (!term) return true;
        return (
          x.vehiculo.toLowerCase().includes(term) ||
          x.resultado.toLowerCase().includes(term) ||
          x.estado.toLowerCase().includes(term)
        );
      });

    filtered.sort((a, b) => {
      if (sortBy === "vehiculo") return a.vehiculo.localeCompare(b.vehiculo) * mul;
      if (sortBy === "precio") return (a.precio - b.precio) * mul;
      if (sortBy === "mi") return (a.mi - b.mi) * mul;
      if (sortBy === "ganadora") return (a.ganadora - b.ganadora) * mul;
      if (sortBy === "resultado") return a.resultado.localeCompare(b.resultado) * mul;
      if (sortBy === "estado") return a.estado.localeCompare(b.estado) * mul;
      return (a.ts - b.ts) * mul; // fecha
    });

    return filtered;
  }, [rows, q, sortBy, sortDir]);

  const total = view.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const slice = view.slice(start, start + pageSize);

  useEffect(() => {
    if (page > pages) setPage(pages);
    if (page < 1) setPage(1);
  }, [pages, page]);

  /* ===== Layout (tabla vs cards) ===== */
  const refreshLayout = () => {
    if (!tableWrapRef.current || !cardsWrapRef.current || !pagerRef.current) return;
    const isMobile = window.matchMedia("(max-width: 640px)").matches;

    if (isMobile) {
      tableWrapRef.current.style.display = "none";
      cardsWrapRef.current.style.display = "";
      if (cardsWrapRef.current.nextSibling !== pagerRef.current) {
        cardsWrapRef.current.insertAdjacentElement("afterend", pagerRef.current);
      }
    } else {
      tableWrapRef.current.style.display = "";
      cardsWrapRef.current.style.display = "none";
      if (tableWrapRef.current.lastChild !== pagerRef.current) {
        tableWrapRef.current.appendChild(pagerRef.current);
      }
    }
  };

  useEffect(() => {
    refreshLayout();
    const onResize = () => refreshLayout();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* ===== Data ===== */
  const loadData = async () => {
    const token = localStorage.getItem("token") || "";
    const r = await fetch(`${API}/historial-subastas`, {
      headers: { Authorization: token ? `Bearer ${token}` : "" },
      cache: "no-store",
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  };

  const reload = async (keepPage = false) => {
    try {
      const data = await loadData();
      setRows(Array.isArray(data) ? data : []);

      if (!data || !data.length) {
        if (infoRef.current) {
          infoRef.current.style.display = "";
          infoRef.current.textContent = "No hay subastas cerradas aún.";
        }
        if (tableWrapRef.current) tableWrapRefRef.current.style.display = "none";
        if (cardsWrapRef.current) cardsWrapRef.current.style.display = "none";
        return;
      }

      if (infoRef.current) infoRef.current.style.display = "none";
      refreshLayout();
      if (!keepPage) setPage(1);
    } catch (e) {
      if (infoRef.current) {
        infoRef.current.style.display = "";
        infoRef.current.textContent = "Error al cargar el historial.";
      }
    }
  };

  useEffect(() => {
    reload();
  }, []);

  return (
    <>
      <div className="topbar">
        <button
          type="button"
          className="back"
          onClick={() => navigate(-1)}
        >
          ← Regresar
        </button>
        <img className="logo" src="img/logo.png" alt="CarBid" />
      </div>

      <div className="wrap">
        <h1>Mi Historial de Subastas</h1>

        <div className="controls">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label htmlFor="q">Buscar:</label>
            <input
              id="q"
              type="search"
              placeholder="Toyota…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label htmlFor="sortBy">Ordenar por:</label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
            >
              <option value="fecha">Fecha</option>
              <option value="vehiculo">Vehículo</option>
              <option value="precio">Precio base</option>
              <option value="mi">Mi oferta</option>
              <option value="ganadora">Oferta ganadora</option>
              <option value="resultado">Resultado</option>
              <option value="estado">Estado</option>
            </select>
            <select
              value={sortDir}
              onChange={(e) => {
                setSortDir(e.target.value);
                setPage(1);
              }}
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>
        </div>

        <div id="info" ref={infoRef} className="state">
          Cargando historial…
        </div>

        {/* Tabla (desktop/tablet) */}
        <div
          className="table-wrap"
          ref={tableWrapRef}
          style={{ display: "none" }}
        >
          <table>
            <thead>
              <tr>
                <th>Vehículo</th>
                <th>Precio base</th>
                <th>Mi oferta</th>
                <th>Oferta ganadora</th>
                <th>Resultado</th>
                <th>Estado</th>
                <th className="nowrap">Cierre</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((r) => (
                <tr key={r.id}>
                  <td className="vehiculo" title={r.vehiculo}>
                    {r.vehiculo}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    Q{fmtGTQ.format(r.precio)}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    Q{fmtGTQ.format(r.mi)}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    Q{fmtGTQ.format(r.ganadora)}
                  </td>
                  <td>{r.resultado}</td>
                  <td>{r.estado}</td>
                  <td className="nowrap">{r.fecha}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pager" ref={pagerRef}>
            <div>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                « Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
              >
                Siguiente »
              </button>
            </div>
            <div className="info">
              {total
                ? `Mostrando ${start + 1}–${start + slice.length} de ${total}`
                : "—"}
            </div>
          </div>
        </div>

        {/* Cards (móvil) */}
        <div
          className="cards"
          ref={cardsWrapRef}
          style={{ display: "none" }}
        >
          {slice.map((r) => {
            const res = (r.resultado || "").toLowerCase();
            const resultadoClass =
              res.includes("ganaste")
                ? "chip chip-ganaste"
                : res.includes("perdí") || res.includes("perdi")
                ? "chip chip-perdi"
                : "chip";

            return (
              <div className="card-item" key={r.id}>
                <div className="ci-top">
                  <div className="ci-title" title={r.vehiculo}>
                    {r.vehiculo}
                  </div>
                  <div className="ci-fecha">Cierre: {r.fecha}</div>
                </div>
                <div className="chips">
                  <span className="chip">
                    Base: Q{fmtGTQ.format(r.precio)}
                  </span>
                  <span className="chip">
                    Mi oferta: Q{fmtGTQ.format(r.mi)}
                  </span>
                  <span className="chip">
                    Ganadora: Q{fmtGTQ.format(r.ganadora)}
                  </span>
                  <span className={resultadoClass}>{r.resultado}</span>
                  <span className="chip chip-estado">{r.estado}</span>
                </div>
              </div>
            );
          })}
          {/* el pager se mueve aquí en móvil */}
        </div>
      </div>
    </>
  );
}
