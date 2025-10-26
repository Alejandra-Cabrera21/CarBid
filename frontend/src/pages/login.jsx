import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/login.css";

export default function Login() {
  const navigate = useNavigate();

  // ===== estado pantalla =====
  const [tipo, setTipo] = useState("comprador"); // "comprador" | "vendedor"
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [errEmail, setErrEmail] = useState("");
  const [errPass, setErrPass] = useState("");

  // ===== modal forgot =====
  const [forgotOpen, setForgotOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [fpEmail, setFpEmail] = useState("");
  const [fpCode, setFpCode] = useState("");
  const [fpPass, setFpPass] = useState("");
  const [fpPass2, setFpPass2] = useState("");
  const [hint1, setHint1] = useState("");
  const [hint2, setHint2] = useState("");

  // ✅ validaciones en vivo (para habilitar/deshabilitar botón)
  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const passValid  = pass.trim().length > 0;
  const canSubmit  = emailValid && passValid;

  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000/api";

  useEffect(() => {
    document.title = "Iniciar sesión - CarBid";
    const t = localStorage.getItem("tipoSeleccionado");
    setTipo(t === "vendedor" ? "vendedor" : "comprador");
  }, []);

  // ===== submit login =====
  async function onSubmit(e) {
    e.preventDefault();
    setErrEmail("");
    setErrPass("");

    let ok = true;
    if (!email.trim()) {
      setErrEmail("Ingresa un correo electrónico.");
      ok = false;
    } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setErrEmail("Correo inválido.");
      ok = false;
    }
    if (!pass.trim()) {
      setErrPass("Ingresa tu contraseña.");
      ok = false;
    }
    if (!ok) return;

    const endpoint =
      tipo === "vendedor"
        ? `${API_BASE}/auth/login-vendedor`
        : `${API_BASE}/auth/login`;

    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass }),
      });
      const data = await r.json().catch(() => ({}));

      if (r.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("usuario", JSON.stringify(data.usuario));
        localStorage.setItem("userId", String(data.usuario?.id ?? ""));
        localStorage.setItem("userName", data.usuario?.nombre || "");
        localStorage.removeItem("tipoSeleccionado");

        if (data.redirect) navigate(data.redirect, { replace: true });
        else
          navigate(
            tipo === "vendedor" ? "/indexvendedor" : "/indexcomprador",
            { replace: true }
          );
      } else {
        const msg = data.message || "Credenciales inválidas.";
        if (/(comprador|vendedor|usuario|Usuario|correo)/i.test(msg))
          setErrEmail(msg);
        else setErrPass(msg);
      }
    } catch (err) {
      console.error(err);
      setErrPass("Error de conexión con el servidor.");
    }
  }

  // ===== forgot modal: paso 1 (enviar código) =====
  async function sendCode() {
    setHint1("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fpEmail)) {
      setHint1("Correo inválido.");
      return;
    }
    try {
      const r = await fetch(`${API_BASE}/auth/forgot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fpEmail.trim() }),
      });
      await r.json().catch(() => ({}));
      if (r.ok) {
        setHint1("Si el correo existe, te enviamos un código.");
        setStep(2);
      } else {
        setHint1("No se pudo enviar el código.");
      }
    } catch {
      setHint1("Error de conexión.");
    }
  }

  // ===== forgot modal: paso 2 (cambiar contraseña) =====
  async function resetPass() {
    setHint2("");
    if (!/^\d{6}$/.test(fpCode)) {
      setHint2("Código inválido.");
      return;
    }
    if (fpPass.length < 6) {
      setHint2("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (fpPass !== fpPass2) {
      setHint2("Las contraseñas no coinciden.");
      return;
    }

    try {
      const r = await fetch(`${API_BASE}/auth/forgot/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: fpEmail.trim(),
          code: fpCode.trim(),
          newPassword: fpPass,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) {
        setHint2("¡Contraseña actualizada! Ya puedes iniciar sesión.");
        setTimeout(() => setForgotOpen(false), 900);
      } else {
        setHint2(data.message || "No se pudo cambiar la contraseña.");
      }
    } catch {
      setHint2("Error de conexión.");
    }
  }

  function openForgot() {
    setFpEmail("");
    setFpCode("");
    setFpPass("");
    setFpPass2("");
    setHint1("");
    setHint2("");
    setStep(1);
    setForgotOpen(true);
  }

  return (
    <>
      <div className="register-container">
        {/* Lado izquierdo con imagen */}
        <div className="image-side">
          <img src="/img/auto.png" alt="Fondo CarBid" />
        </div>

        {/* Lado derecho con formulario */}
        <div className="form-side">
          <div className="form-header">
            <img src="/img/logo.png" alt="CarBid" width="70" />
            <h2>
              {`INICIAR SESIÓN (${
                tipo === "vendedor" ? "VENDEDOR" : "COMPRADOR"
              })`}
            </h2>
          </div>

          <form onSubmit={onSubmit} noValidate id="loginForm">
            <label htmlFor="email">Correo electrónico:</label>
            <div className="input-wrapper">
              <i className="fa-solid fa-user input-icon" aria-hidden="true" />
              <input
                type="email"
                id="email"
                placeholder="Ingresa tu correo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                /* 👇 quita subrayado rojo del navegador y evita autocorrecciones */
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="none"
                inputMode="email"
                autoComplete="email"
              />
            </div>
            <div id="error-email" className="error" aria-live="polite">
              {email && !emailValid ? "Correo inválido." : errEmail}
            </div>

            <label htmlFor="password">Contraseña:</label>
            <div className="input-wrapper">
              <i className="fa-solid fa-lock input-icon" aria-hidden="true" />
              <input
                type={showPass ? "text" : "password"}
                id="password"
                placeholder="Ingresa tu contraseña"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                required
                autoComplete="current-password"
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
                <i
                  className={`fa-solid ${
                    showPass ? "fa-eye-slash" : "fa-eye"
                  }`}
                />
              </span>
            </div>
            <div id="error-password" className="error" aria-live="polite">
              {pass && !passValid ? "Ingresa tu contraseña." : errPass}
            </div>

            {/* 👇 deshabilitado hasta que email y pass sean válidos */}
            <button type="submit" disabled={!canSubmit} aria-disabled={!canSubmit}>
              INGRESAR
            </button>
          </form>

          <p>
            ¿No tienes cuenta? <Link to="/register">Crear una cuenta</Link>
          </p>
          <p>
            <a
              className="inline-link"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                openForgot();
              }}
            >
              ¿Olvidaste tu contraseña?
            </a>
          </p>
        </div>
      </div>

      {/* ===== Modal Olvidé mi contraseña ===== */}
      {forgotOpen && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setForgotOpen(false);
          }}
        >
          <div className="modal" role="dialog" aria-modal="true">
            <h3>Recuperar contraseña</h3>

            {step === 1 && (
              <div id="step1">
                <label htmlFor="fpEmail">Correo de tu cuenta</label>
                <input
                  type="email"
                  id="fpEmail"
                  placeholder="tu@correo.com"
                  value={fpEmail}
                  onChange={(e) => setFpEmail(e.target.value)}
                />
                <div className="hint">{hint1}</div>
                <div className="actions">
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => setForgotOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button className="btn" type="button" onClick={sendCode}>
                    Enviar código
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div id="step2">
                <label htmlFor="fpCode">Código de verificación (6 dígitos)</label>
                <input
                  type="text"
                  id="fpCode"
                  maxLength={6}
                  value={fpCode}
                  onChange={(e) => setFpCode(e.target.value)}
                />

                <label htmlFor="fpPass" style={{ marginTop: 8 }}>
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  id="fpPass"
                  value={fpPass}
                  onChange={(e) => setFpPass(e.target.value)}
                />

                <label htmlFor="fpPass2" style={{ marginTop: 8 }}>
                  Confirmar contraseña
                </label>
                <input
                  type="password"
                  id="fpPass2"
                  value={fpPass2}
                  onChange={(e) => setFpPass2(e.target.value)}
                />

                <div className="hint">{hint2}</div>
                <div className="actions">
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => setStep(1)}
                  >
                    Atrás
                  </button>
                  <button className="btn" type="button" onClick={resetPass}>
                    Cambiar contraseña
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
