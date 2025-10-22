import React from "react";
import { useNavigate } from "react-router-dom";

// importa tus CSS de la portada
import "../styles/style.css";
import "../styles/home.css";

function Dropdown({ label = "Acceder" }) {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();

  function toggle(e) {
    e.preventDefault();
    e.stopPropagation(); // para que no burbujee a nada externo
    setOpen((v) => !v);
  }

  function go(tipo) {
    // guarda la elección y navega a login
    localStorage.setItem("tipoSeleccionado", tipo);
    setOpen(false);
 navigate("/login");
  }

  return (
    <div className="dropdown">
      <button className={`dropbtn home-btn ${open ? "open" : ""}`} onClick={toggle}>
        {label} <span className="caret">▼</span>
      </button>

      {/* NOTA: igual que en tu HTML, no se cierra al hacer clic fuera;
          sólo cambia al pulsar el botón o al elegir opción */}
      <div className={`dropdown-content ${open ? "active" : ""}`}>
        <a href="#" onClick={(e) => { e.preventDefault(); go("comprador"); }}>Comprador</a>
        <a href="#" onClick={(e) => { e.preventDefault(); go("vendedor"); }}>Vendedor</a>
      </div>
    </div>
  );
}

export default function Index() {
  const navigate = useNavigate();

  const irRegistro = () => navigate("/register");


  React.useEffect(() => {
    document.title = "CarBid";
  }, []);

  return (
    <div>
      {/* ✅ Barra visible solo en web */}
      <header className="navbar">
        <div className="logo">
          <img src="/img/logo.png" alt="CarBid" className="logo-web" width="150" />
        </div>

        <div className="menu">
          {/* dropdown de escritorio */}
          <Dropdown label="Acceder" />
          <button id="btnRegistro" className="home-btn" onClick={irRegistro}>
            Crear una cuenta
          </button>
        </div>
      </header>

      {/* Fondo + tarjeta móvil */}
      <main className="hero">
        <img src="/img/auto.png" alt="Car" className="background" />

        <section className="home-overlay-card" aria-label="Acciones rápidas">
          <h1 className="home-card-title">Bienvenido a CarBid</h1>

          <div className="home-actions">
            {/* dropdown móvil */}
            <Dropdown />

            <button
              id="btnRegistroMobile"
              className="home-btn home-btn--full home-btn--primary"
              onClick={irRegistro}
            >
              Crear una cuenta
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
