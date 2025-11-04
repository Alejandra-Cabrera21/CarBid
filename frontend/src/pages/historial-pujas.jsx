// src/pages/HistorialPujas.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import "../styles/historialpujas.css";

const API = "http://localhost:3000/api";

export default function HistorialPujas() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [sortBy, setSortBy] = useState("fecha"); // fecha | monto | vehiculo | nombre
  const [sortDir, setSortDir] = useState("desc"); // asc | desc
  const [q, setQ] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const infoRef = useRef(null);
  const tableWrapRef = useRef(null);
  const cardsWrapRef = useRef(null);
  const pagerRef = useRef(null);

  const fmtGTQ = useMemo(
    () => new Intl.NumberFormat("es-GT", { maximumFractionDigits: 0 }),
    []
  );

  // formato de fecha dd/mm/aaaa
  const fmtDate = useMemo(
    () =>
      new Intl.DateTimeFormat("es-GT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    []
  );

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : "";

  function normalize(r) {
    // created_at para ordenamiento
    const d = r.created_at ? new Date(r.created_at) : null;

    // --- normalizar fecha a dd/mm/aaaa ---
    let fechaStr = "";

    if (r.fecha && typeof r.fecha === "string") {
      // Preferimos la fecha que viene del backend
      const raw = r.fecha.slice(0, 10); // "2025-11-04" o similar
      const parts = raw.split("-");
      if (parts.length === 3) {
        const [y, m, day] = parts;
        fechaStr = `${day}/${m}/${y}`;
      } else if (!Number.isNaN(Date.parse(r.fecha))) {
        // por si viene en otro formato válido
        fechaStr = fmtDate.format(new Date(r.fecha));
      } else if (d && !Number.isNaN(d.getTime())) {
        fechaStr = fmtDate.format(d);
      }
    } else if (d && !Number.isNaN(d.getTime())) {
      // Si solo tenemos created_at, tomamos la fecha en UTC para evitar desfase
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      fechaStr = `${day}/${m}/${y}`;
    }

    return {
      vehiculo: r.vehiculo || "Publicación",
      nombre: r.nombre_postor || r.postor || "—",
      monto: Number(r.oferta ?? r.monto ?? 0),
      fecha: fechaStr,
      createdAt: d ? d.getTime() : 0,
    };
  }

  const viewRows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const mul = sortDir === "asc" ? 1 : -1;

    const filtered = rows
      .map(normalize)
      .filter((x) => {
        if (!term) return true;
        return (
          x.vehiculo.toLowerCase().includes(term) ||
          x.nombre.toLowerCase().includes(term)
        );
      });

    filtered.sort((a, b) => {
      if (sortBy === "monto") return (a.monto - b.monto) * mul;
      if (sortBy === "vehiculo") return a.vehiculo.localeCompare(b.vehiculo) * mul;
      if (sortBy === "nombre") return a.nombre.localeCompare(b.nombre) * mul;
      return (a.createdAt - b.createdAt) * mul; // fecha (timestamp)
    });

    return filtered;
  }, [rows, q, sortBy, sortDir]);

  const total = viewRows.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = (currentPage - 1) * pageSize;
  const slice = viewRows.slice(start, start + pageSize);

  useEffect(() => {
    if (currentPage > pages) setCurrentPage(pages);
    if (currentPage < 1) setCurrentPage(1);
  }, [pages, currentPage]);

  const refreshLayout = () => {
    if (!tableWrapRef.current || !cardsWrapRef.current || !pagerRef.current)
      return;
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

  const fetchData = async () => {
    const res = await fetch(`${API}/historial-pujas`, {
      headers: { Authorization: token ? `Bearer ${token}` : "" },
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  };

  const reloadData = async (keepPage = false) => {
    try {
      const newRows = await fetchData();
      const arr = Array.isArray(newRows) ? newRows : [];
      setRows(arr);

      if (!arr.length) {
        if (infoRef.current) {
          infoRef.current.style.display = "";
          infoRef.current.textContent = "No hay pujas todavía.";
        }
        if (tableWrapRef.current) tableWrapRef.current.style.display = "none";
        if (cardsWrapRef.current) cardsWrapRef.current.style.display = "none";
        return;
      }

      if (infoRef.current) infoRef.current.style.display = "none";
      refreshLayout();
      if (!keepPage) setCurrentPage(1);
    } catch (e) {
      if (infoRef.current) {
        infoRef.current.style.display = "";
        infoRef.current.textContent = "Error al cargar el historial.";
      }
    }
  };

  useEffect(() => {
    reloadData();

    let refreshTimer = null;
    const scheduleRefresh = () => {
      if (refreshTimer) return;
      refreshTimer = setTimeout(async () => {
        refreshTimer = null;
        await reloadData(true);
      }, 600);
    };

    let socket;
    try {
      socket = io("http://localhost:3000", {
        path: "/socket.io",
        transports: ["websocket", "polling"],
      });
      socket.on("auction:bid", scheduleRefresh);
      socket.on("auction:won", scheduleRefresh);
    } catch {
      console.warn("Socket.IO no disponible; usando polling.");
    }

    const poll = setInterval(scheduleRefresh, 20000);
    return () => {
      clearInterval(poll);
      try {
        socket && socket.disconnect();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <h1>Historial de Pujas</h1>

        {/* Controles */}
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
                setCurrentPage(1);
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
                setCurrentPage(1);
              }}
            >
              <option value="fecha">Fecha</option>
              <option value="monto">Monto</option>
              <option value="vehiculo">Vehículo</option>
              <option value="nombre">Nombre</option>
            </select>
            <select
              value={sortDir}
              onChange={(e) => {
                setSortDir(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>
        </div>

        <div id="info" ref={infoRef} className="state">
          Cargando pujas…
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
                <th>Postor</th>
                <th>Oferta (Q)</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((r, i) => (
                <tr key={i}>
                  <td className="vehiculo" title={r.vehiculo}>
                    {r.vehiculo}
                  </td>
                  <td>{r.nombre}</td>
                  <td style={{ textAlign: "right" }}>
                    Q{fmtGTQ.format(r.monto)}
                  </td>
                  <td>{r.fecha}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pager" ref={pagerRef}>
            <div>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.max(1, p - 1))
                }
                disabled={currentPage <= 1}
              >
                « Anterior
              </button>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(pages, p + 1))
                }
                disabled={currentPage >= pages}
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
          {slice.map((r, i) => (
            <div className="card-item" key={i}>
              <div className="ci-top">
                <div className="ci-title" title={r.vehiculo}>
                  {r.vehiculo}
                </div>
                <div className="ci-fecha">
                  Q{fmtGTQ.format(r.monto)}
                </div>
              </div>
              <div className="chips">
                <span className="chip">Postor: {r.nombre}</span>
                <span className="chip">Fecha: {r.fecha}</span>
              </div>
            </div>
          ))}
          {/* el pager se mueve aquí en móvil */}
        </div>
      </div>
    </>
  );
}
