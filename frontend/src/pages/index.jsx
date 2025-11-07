import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/style.css";

function Dropdown({ label = "Acceder", full = false }) {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();

  const toggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen((v) => !v);
  };

  const go = (tipo) => {
    localStorage.setItem("tipoSeleccionado", tipo);
    setOpen(false);
    navigate("/login");
  };

  return (
    <div className="dropdown">
      <button
        className={`dropbtn ${full ? "btn-full" : ""} ${open ? "open" : ""}`}
        onClick={toggle}
      >
        {label} <span className="caret">{open ? "▲" : "▼"}</span>
      </button>

      <div className={`dropdown-content ${open ? "active" : ""}`}>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("comprador");
          }}
        >
          Comprador
        </a>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("vendedor");
          }}
        >
          Vendedor
        </a>
      </div>
    </div>
  );
}

export default function Index() {
  const navigate = useNavigate();

  React.useEffect(() => {
    document.title = "CarBid";
  }, []);

  return (
    <div>
      {/* ====== Header (solo visible en web) ====== */}
      <header className="navbar only-desktop">
        <div className="logo">
          <img
            src="/img/logo.png"
            alt="CarBid"
            className="logo-web"
            width="150"
          />
        </div>
        <div className="menu">
          <Dropdown label="Acceder" />
          <button className="home-btn" onClick={() => navigate("/register")}>
            Crear una cuenta
          </button>
        </div>
      </header>

      {/* ====== Imagen principal ====== */}
      <main className="hero">
        <img src="/img/auto.png" alt="Car" className="background" />

        {/* ====== Tarjeta central solo en móvil ====== */}
        <section
          className="home-overlay-card only-mobile"
          aria-label="Acciones rápidas"
        >
          <h1 className="home-card-title">Bienvenido a CarBid</h1>

          <div className="home-actions">
            <Dropdown label="Acceder" full />
            <button
              className="home-btn btn-full"
              onClick={() => navigate("/register")}
            >
              Crear una cuenta
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
