// src/pages/indexvendedor.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";
import "../styles/panel-vendedor.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000/api";

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

  useEffect(() => {
    const uStr = localStorage.getItem("usuario");
    let uObj = uStr ? JSON.parse(uStr) : null;

    const id = localStorage.getItem("userId") || (uObj && uObj.id);
    const name = localStorage.getItem("userName") || (uObj && uObj.nombre);

    // si no hay sesión, a login
    if (!id) {
      navigate("/login");
      return;
    }

    setUserId(id);
    setUserName((name && name.trim()) || (uObj && uObj.correo) || "Usuario");

    // marca rol activo
    localStorage.setItem("rolActual", "vendedor");

    // muestra flash si venimos de otra pantalla
    if (flashFromLocalStorage(navigate)) return;

    const ensureVendedor = async () => {
      let user = uObj;

      // ¿ya tenemos flag de vendedor en cache?
      const hasVendorFlag =
        user &&
        (user.es_vendedor === "S" ||
          user.es_vendedor === 1 ||
          user.es_vendedor === true);

      // si no, intenta refrescar desde el backend
      if (!hasVendorFlag) {
        try {
          const r = await fetch(`${API_BASE}/usuario/${encodeURIComponent(id)}`);
          if (r.ok) {
            user = await r.json();
            localStorage.setItem("usuario", JSON.stringify(user));
            if (user.nombre) localStorage.setItem("userName", user.nombre);
            setUserName(user.nombre || user.correo || "Usuario");
          } else {
            // si falla la validación remota, no expulsamos
            console.warn("No se pudo validar vendedor (status:", r.status, ")");
            return;
          }
        } catch (e) {
          console.warn("Error validando vendedor:", e);
          return; // no expulsar por error de red
        }
      }

      // solo expulsar si CONFIRMAMOS que no es vendedor
      const isVendor =
        user &&
        (user.es_vendedor === "S" ||
          user.es_vendedor === 1 ||
          user.es_vendedor === true);

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
    };

    ensureVendedor();
  }, [navigate]);

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
      {/* Navbar */}
      <header className="navbar">
        <div className="logo">
          <img src="/img/logo.png" alt="CarBid" />
        </div>
        <nav className="menu">
          <Link to="/historial-pujas">Historial Pujas</Link>
          <Link to={`/perfil?id=${encodeURIComponent(userId || "")}`}>Mi perfil</Link>
          <button onClick={logout} className="linklike">Salir</button>
        </nav>
      </header>

      {/* Contenido */}
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
