import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";
import "../styles/panel-vendedor.css";

// URL base del backend
const API_BASE = (import.meta.env.VITE_API_BASE || "https://api.carbidp.click/api").replace(/\/$/, "");

// Muestra y procesa un posible mensaje guardado en localStorage
function flashFromLocalStorage(navigate) {
  const raw = localStorage.getItem("flash");
  if (!raw) return false;
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
        background:
          f.type === "warn" ? "#f59e0b" : f.type === "error" ? "#dc2626" : "#22c55e",
        color: "#fff",
        borderRadius: "10px",
      },
    }).showToast();
    if (f.kickTo) {
      setTimeout(() => navigate(f.kickTo), f.timeout || 1800);
      return true;
    }
  } catch {}
  return false;
}

export default function IndexVendedor() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("...");
  const [userId, setUserId] = useState(null);

  // Guarda datos del usuario en estado y en localStorage
  const putUserInStateAndCache = (user) => {
    if (!user) return;
    localStorage.setItem("usuario", JSON.stringify(user));
    if (user.nombre) localStorage.setItem("userName", user.nombre);
    setUserName(user.nombre || user.correo || "Usuario");
  };

  // Consulta de usuario al backend
  const fetchUser = async (id) => {
    try {
      const r = await fetch(`${API_BASE}/usuario/${encodeURIComponent(id)}`, {
        headers: { "Cache-Control": "no-store" },
      });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  };

  // Validación de sesión, rol vendedor y refresco de usuario
  useEffect(() => {
    const uStr = localStorage.getItem("usuario");
    const uObj = uStr ? JSON.parse(uStr) : null;

    const id = localStorage.getItem("userId") || (uObj && uObj.id);
    const name = localStorage.getItem("userName") || (uObj && uObj.nombre);

    if (!id) {
      navigate("/login");
      return;
    }

    setUserId(id);
    setUserName((name && name.trim()) || (uObj && uObj.correo) || "Usuario");

    localStorage.setItem("rolActual", "vendedor");

    if (flashFromLocalStorage(navigate)) return;

    const ensureVendedor = async () => {
      const user = await fetchUser(id);
      if (user) {
        putUserInStateAndCache(user);

        const isVendor =
          user.es_vendedor === "S" || user.es_vendedor === 1 || user.es_vendedor === true;

        if (!isVendor) {
          Toastify({
            text: "Ya no eres vendedor. Te sacamos del panel.",
            duration: 1800,
            gravity: "top",
            position: "right",
            close: true,
            style: { background: "#f59e0b", color: "#fff", borderRadius: "10px" },
          }).showToast();
          setTimeout(() => navigate("/"), 1800);
        }
      } else {
        console.warn("No se pudo refrescar el usuario");
      }
    };

    ensureVendedor();

    // Actualiza datos del usuario al volver a la pestaña
    const onVisible = async () => {
      if (document.visibilityState === "visible") {
        const freshed = await fetchUser(id);
        if (freshed) putUserInStateAndCache(freshed);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [navigate]);

  // Limpia sesión y vuelve al inicio
  const logout = () => {
    localStorage.removeItem("rolActual");
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("flash");
    navigate("/");
  };

  return (
    <>
      {/* Navbar principal del panel vendedor */}
      <header className="navbar">
        <div className="logo">
          <img src="/img/logo.png" alt="CarBid" />
        </div>

        <nav className="menu">
          <Link to="/historial-pujas">Historial Pujas</Link>
          <Link to={`/perfil?id=${encodeURIComponent(userId || "")}`}>Mi perfil</Link>
          <button onClick={logout} className="linklike">
            Salir
          </button>
        </nav>
      </header>

      {/* Zona central con las acciones principales */}
      <main className="panel-container">
        <h2>
          Bienvenid@ <span id="nombreUsuario">{userName}</span>
        </h2>
        <div className="botones">
          <button onClick={() => navigate("/crear-publicacion")}>
            Crear publicación
          </button>
          <button onClick={() => navigate("/mis-subastas")}>
            Listado de subastas creadas
          </button>
        </div>
      </main>
    </>
  );
}
