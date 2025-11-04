// src/pages/HistorialPujas.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

const API = "https://carbid-backend.us-east-2.elasticbeanstalk.com/api";

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
  const fmtDate = useMemo(() => new Intl.DateTimeFormat("es-GT", { dateStyle: "medium" }), []);
  const fmtTime = useMemo(() => new Intl.DateTimeFormat("es-GT", { hour: "2-digit", minute: "2-digit" }), []);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

  function normalize(r) {
    const d = r.created_at ? new Date(r.created_at) : null;
    return {
      vehiculo: r.vehiculo || "Publicación",
      nombre: r.nombre_postor || r.postor || "—",
      monto: Number(r.oferta ?? r.monto ?? 0),
      fecha: r.fecha ? r.fecha : d ? fmtDate.format(d) : "",
      hora: r.hora ? r.hora : d ? fmtTime.format(d) : "",
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
        return x.vehiculo.toLowerCase().includes(term) || x.nombre.toLowerCase().includes(term);
      });

    filtered.sort((a, b) => {
      if (sortBy === "monto") return (a.monto - b.monto) * mul;
      if (sortBy === "vehiculo") return a.vehiculo.localeCompare(b.vehiculo) * mul;
      if (sortBy === "nombre") return a.nombre.localeCompare(b.nombre) * mul;
      return (a.createdAt - b.createdAt) * mul; // fecha
    });

    return filtered;
  }, [rows, q, sortBy, sortDir]);

  const total = viewRows.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = (currentPage - 1) * pageSize;
  const slice = viewRows.slice(start, start + pageSize);

  // Mantener currentPage dentro de rango cuando cambian filtros
  useEffect(() => {
    if (currentPage > pages) setCurrentPage(pages);
    if (currentPage < 1) setCurrentPage(1);
  }, [pages, currentPage]);

  // Mostrar tabla o cards según viewport y mover el paginador
  const refreshLayout = () => {
    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    if (!tableWrapRef.current || !cardsWrapRef.current || !pagerRef.current) return;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cargar datos
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
        infoRef.current.textContent = "Error al cargar el historial";
      }
    }
  };

  // Init + sockets + polling
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
      <style>{`
      :root{
        --bg:#1b1b1b; --card:#111; --text:#fff; --muted:#cbd5e1; --brand:#ef4444;
        --table-border:#262626; --table-head:#ef4444;
        --chip:#222; --chip-bd:#2c2c2c;
      }
      *{box-sizing:border-box}
      html,body{height:100%}
      body{margin:0;background:var(--bg);color:var(--text);
        font-family:system-ui,-apple-system,"Segoe UI",Roboto,Ubuntu,"Helvetica Neue","Noto Sans","Liberation Sans",Arial}
      .topbar{display:flex;align-items:center;justify-content:space-between;
        padding:12px 18px;border-bottom:1px solid rgba(255,255,255,.08)}
      /* botón "back" sin fondo blanco */
      .back{
        display:inline-flex;align-items:center;gap:8px;
        color:#fff;font-weight:600;text-decoration:none;
        background:transparent;border:none;padding:0;cursor:pointer;
        font:inherit;appearance:none;-webkit-appearance:none;border-radius:0;
      }
      .back:focus-visible{outline:2px solid #3b82f6; outline-offset:2px}
      .logo{height:36px}

      .wrap{max-width:1100px;margin:0 auto;padding:26px 14px 60px}
      h1{text-align:center;margin:8px 0 20px;font-size:clamp(22px,3.4vw,32px)}

      .card{background:var(--card);border-radius:14px;padding:16px;box-shadow:0 10px 30px rgba(0,0,0,.35)}

      .controls{
        display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 12px 0
      }
      .controls .group{display:flex;gap:8px;align-items:center}
      .controls label{color:var(--muted);font-size:.92rem}
      .controls select,.controls input{
        background:var(--chip);color:#fff;border:1px solid var(--chip-bd);
        border-radius:8px;padding:8px 10px;outline:none
      }

      .table-wrap{width:100%}
      table{width:100%;border-collapse:collapse;table-layout:fixed}
      thead th{
        background:var(--table-head); color:#fff; font-weight:700; padding:12px; text-align:left;
        border:1px solid var(--table-border);
      }
      tbody td{
        background:#0d0d0d; color:#e5e7eb; padding:11px 12px; border:1px solid var(--table-border);
        word-break:break-word;
      }
      tbody tr:hover td{background:#121212}
      th:nth-child(1), td:nth-child(1){width:38%}
      th:nth-child(2), td:nth-child(2){width:22%}
      th:nth-child(3), td:nth-child(3){width:14%; text-align:right}
      th:nth-child(4), td:nth-child(4){width:14%}
      th:nth-child(5), td:nth-child(5){width:12%}
      .vehiculo{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

      .cards{display:none}
      .card-item{
        background:#0d0d0d;border:1px solid var(--table-border);border-radius:12px;
        padding:12px;display:flex;flex-direction:column;gap:8px
      }
      .card-item + .card-item{margin-top:10px}
      .ci-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
      .ci-title{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ci-name{color:var(--muted);font-size:.95rem}
      .ci-row{display:flex;gap:12px;flex-wrap:wrap}
      .chip{
        background:var(--chip);border:1px solid var(--chip-bd);border-radius:999px;
        padding:4px 10px;font-size:.85rem;color:#fff
      }

      .state{color:var(--muted);text-align:center;padding:18px 8px}

      .pager{
        display:flex;align-items:center;justify-content:space-between;gap:10px;
        margin-top:14px; flex-wrap:wrap;
      }
      .pager .left, .pager .right{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
      .pager button{
        background:#4507c0; color:#fff; border:1px solid #18034e; padding:8px 12px; border-radius:8px; cursor:pointer;
      }
      .pager button[disabled]{opacity:.4; cursor:not-allowed}
      .pager .info{color:var(--muted); font-size:.95rem}

      @media (max-width: 720px){
        th:nth-child(1), td:nth-child(1){width:40%}
        th:nth-child(2), td:nth-child(2){width:24%}
        th:nth-child(3), td:nth-child(3){width:16%}
        th:nth-child(4), td:nth-child(4){width:12%}
        th:nth-child(5), td:nth-child(5){width:8%}
        td, th{font-size:.95rem}
      }
      @media (max-width: 640px){
        .table-wrap{display:none}
        .cards{display:block}
      }
      @media (max-width: 480px){
        .logo{height:30px}
      }
      `}</style>

      <div className="topbar">
        {/* Botón SPA que vuelve sin recargar y sin fondo blanco */}
        <button type="button" className="back" onClick={() => navigate(-1)}>
          <i className="fa fa-arrow-left" /> Regresar
        </button>
        <img className="logo" src="img/logo.png" alt="CarBid" />
      </div>

      <div className="wrap">
        <h1>Historial de Pujas</h1>

        <div className="card">
          {/* Controles */}
          <div className="controls">
            <div className="group">
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
                id="sortDir"
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
            <div className="group">
              <label htmlFor="q">Buscar:</label>
              <input
                id="q"
                type="search"
                placeholder="Toyota.."
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          <div id="info" ref={infoRef} className="state">
            Cargando pujas…
          </div>

          {/* Tabla (desktop/tablet) */}
          <div className="table-wrap" id="tableWrap" ref={tableWrapRef} style={{ display: "none" }}>
            <table id="tabla">
              <thead>
                <tr>
                  <th>Vehículo</th>
                  <th>Nombre</th>
                  <th>Oferta (Q)</th>
                  <th>Fecha</th>
                  <th>Hora</th>
                </tr>
              </thead>
              <tbody id="tbody">
                {slice.map((r, i) => (
                  <tr key={i}>
                    <td className="vehiculo" title={r.vehiculo}>
                      {r.vehiculo}
                    </td>
                    <td>{r.nombre}</td>
                    <td style={{ textAlign: "right" }}>Q{fmtGTQ.format(r.monto)}</td>
                    <td>{r.fecha}</td>
                    <td>{r.hora}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pager (se recoloca en móvil) */}
            <div className="pager" ref={pagerRef}>
              <div className="left">
                <button
                  id="prevBtn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  « Anterior
                </button>
                <button
                  id="nextBtn"
                  onClick={() => setCurrentPage((p) => Math.min(pages, p + 1))}
                  disabled={currentPage >= pages}
                >
                  Siguiente »
                </button>
              </div>
              <div className="right">
                <span className="info" id="pageInfo">
                  {total ? `Mostrando ${start + 1}–${start + slice.length} de ${total}` : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Tarjetas (móvil) */}
          <div className="cards" id="cards" ref={cardsWrapRef} style={{ display: "none" }}>
            {slice.map((r, i) => (
              <div className="card-item" key={i}>
                <div className="ci-top">
                  <div className="ci-title" title={r.vehiculo}>
                    {r.vehiculo}
                  </div>
                  <div className="chip">Q{fmtGTQ.format(r.monto)}</div>
                </div>
                <div className="ci-name">{r.nombre}</div>
                <div className="ci-row">
                  <span className="chip">
                    <i className="fa-regular fa-calendar" /> {r.fecha}
                  </span>
                  <span className="chip">
                    <i className="fa-regular fa-clock" /> {r.hora}
                  </span>
                </div>
              </div>
            ))}
            {/* El pager se mueve aquí automáticamente en móvil */}
          </div>
        </div>
      </div>
    </>
  );
}
