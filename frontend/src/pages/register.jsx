import React, { useEffect, useState } from "react";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";
import "../styles/register.css";

// Helper toast
const toast = (txt, ok = true) =>
  Toastify({
    text: txt,
    duration: 3000,
    gravity: "top",
    position: "right",
    close: true,
    style: {
      background: ok ? "#28a745" : "#b51f05ff",
      color: "#fff",
      fontWeight: 500,
      borderRadius: "8px",
      boxShadow: "0 3px 10px rgba(0,0,0,.25)",
    },
  }).showToast();

// regex globales
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const strongRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])[A-Za-z\d@$!%*?&._-]{8,}$/;

export default function Register() {
  useEffect(() => {
    document.title = "Crear cuenta - CarBid";
  }, []);

  // Estado del formulario
  const [correo, setCorreo] = useState("");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [vendedor, setVendedor] = useState(false);
  const [comprador, setComprador] = useState(false);

  // Errores por campo
  const [err, setErr] = useState({
    correo: "",
    usuario: "",
    password: "",
    confirmar: "",
  });

  // Mostrar/ocultar password
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);

  // Estado de envío
  const [sending, setSending] = useState(false);

  const API = `${import.meta.env.VITE_API_BASE}/usuario`; // http://localhost:3000/api/usuario

  function clearErr() {
    setErr({ correo: "", usuario: "", password: "", confirmar: "" });
  }

  function validate() {
    const next = { correo: "", usuario: "", password: "", confirmar: "" };
    let ok = true;

    // Correo
    if (!emailRegex.test(correo)) {
      next.correo = "Ingresa un correo válido.";
      ok = false;
    } else if (correo.length > 50) {
      next.correo = "Máximo 50 caracteres.";
      ok = false;
    }

    // Usuario
    const userTrim = usuario.trim();
    if (userTrim.length < 3) {
      next.usuario = "Debe tener al menos 3 caracteres.";
      ok = false;
    } else if (userTrim.length > 30) {
      next.usuario = "Máximo 30 caracteres.";
      ok = false;
    }

    // Password
    if (password.length > 30) {
      next.password = "La contraseña no puede superar 30 caracteres.";
      ok = false;
    } else if (!strongRegex.test(password)) {
      next.password =
        "Mín. 8 caracteres, mayúscula, minúscula, número y símbolo.";
      ok = false;
    }

    // Confirmar
    if (confirmar.length > 30) {
      next.confirmar = "La confirmación no puede superar 30 caracteres.";
      ok = false;
    } else if (password !== confirmar) {
      next.confirmar = "Las contraseñas no coinciden.";
      ok = false;
    }

    // Rol
    if (!vendedor && !comprador) {
      toast("Selecciona vender o comprar", false);
      ok = false;
    }

    setErr(next);
    return ok;
  }

  // Validación en vivo para habilitar/deshabilitar botón
  const emailOk = emailRegex.test(correo) && correo.length <= 50;
  const userTrim = usuario.trim();
  const userOk = userTrim.length >= 3 && userTrim.length <= 30;
  const passOk = strongRegex.test(password) && password.length <= 30;
  const confirmOk =
    password === confirmar &&
    confirmar !== "" &&
    confirmar.length <= 30 &&
    password.length <= 30;
  const roleOk = vendedor || comprador;

  const isFormValid = emailOk && userOk && passOk && confirmOk && roleOk;

  async function onSubmit(e) {
    e.preventDefault();
    clearErr();
    if (!validate()) return;

    try {
      setSending(true);

      // 1) Verificar si el correo ya existe
      const chk = await fetch(`${API}/check?t=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ correo }),
      });

      let chkJson = {};
      try {
        chkJson = await chk.json();
      } catch {
        /* si el server devuelve HTML, ignora */
      }

      if (chk.ok && chkJson.encontrado) {
        setErr((e) => ({
          ...e,
          correo: "Este correo ya se encuentra registrado.",
        }));
        return;
      }
      if (!chk.ok && chk.status !== 404) {
        toast(chkJson.mensaje || "Error al verificar correo.", false);
        return;
      }

      // 2) Registrar usuario
      const res = await fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: usuario,
          correo,
          contraseña: password, // tu backend espera 'contraseña'
          es_vendedor: vendedor ? "S" : "N",
          es_comprador: comprador ? "S" : "N",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        toast("Registro correcto", true);
        setCorreo("");
        setUsuario("");
        setPassword("");
        setConfirmar("");
        setVendedor(false);
        setComprador(false);
        setShowPass(false);
        setShowConf(false);
        // window.location.href = "/login"; // si quieres redirigir
      } else {
        toast(data.mensaje || "Error al registrar.", false);
      }
    } catch (error) {
      console.error(error);
      toast("Error de conexión con el servidor", false);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="register-container">
      <div className="image-side">
        <img src="/img/auto.png" alt="Fondo CarBid" />
      </div>

      <div className="form-side">
        <div className="form-header">
          <img src="/img/logo.png" alt="CarBid" width="70" />
          <h2>CREAR CUENTA</h2>
        </div>

        <form onSubmit={onSubmit} noValidate id="registerForm">
          <label htmlFor="correo">
            Correo:<span className="required-mark">*</span>
          </label>
          <input
            type="email"
            id="correo"
            name="correo"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            maxLength={50}
            required
          />
          <div id="error-correo" className="error">
            {err.correo}
          </div>

          <label htmlFor="usuario">
            Usuario:<span className="required-mark">*</span>
          </label>
          <input
            type="text"
            id="usuario"
            name="usuario"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            maxLength={30}
            required
          />
          <div id="error-usuario" className="error">
            {err.usuario}
          </div>

          <label htmlFor="password">
            Contraseña:<span className="required-mark">*</span>
          </label>
          <div className="input-wrapper">
            <input
              type={showPass ? "text" : "password"}
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={30}
              required
            />
            <span
              className="toggle-pass"
              id="togglePassword"
              aria-label="Mostrar u ocultar contraseña"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault();
                setShowPass((s) => !s);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setShowPass((s) => !s);
                }
              }}
            >
              <i className={`fa ${showPass ? "fa-eye-slash" : "fa-eye"}`}></i>
            </span>
          </div>
          <div id="error-password" className="error">
            {err.password}
          </div>

          <label htmlFor="confirmar">
            Confirmar contraseña:<span className="required-mark">*</span>
          </label>
          <div className="input-wrapper">
            <input
              type={showConf ? "text" : "password"}
              id="confirmar"
              name="confirmar"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              maxLength={30}
              required
            />
            <span
              className="toggle-pass"
              id="toggleConfirm"
              aria-label="Mostrar u ocultar confirmación"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault();
                setShowConf((s) => !s);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setShowConf((s) => !s);
                }
              }}
            >
              <i className={`fa ${showConf ? "fa-eye-slash" : "fa-eye"}`}></i>
            </span>
          </div>
          <div id="error-confirmar" className="error">
            {err.confirmar}
          </div>

          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                id="vendedor"
                className="rol-check"
                checked={vendedor}
                onChange={(e) => setVendedor(e.target.checked)}
              />{" "}
              Quiero Vender
            </label>
            <label>
              <input
                type="checkbox"
                id="comprador"
                className="rol-check"
                checked={comprador}
                onChange={(e) => setComprador(e.target.checked)}
              />{" "}
              Quiero Comprar
            </label>
          </div>

          <button type="submit" disabled={!isFormValid || sending}>
            {sending ? "Guardando..." : "SIGUIENTE"}
          </button>
        </form>
      </div>
    </div>
  );
}
