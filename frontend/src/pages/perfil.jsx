import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";
import "../styles/perfil.css";

const API_BASE = (import.meta.env.VITE_API_BASE || "https://api.carbidp.click/api").replace(/\/$/, "");
const API = API_BASE;

// misma regla de contraseña que en registro
const strongRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])[A-Za-z\d@$!%*?&._-]{8,}$/;

export default function Perfil() {
  const navigate = useNavigate();
  const [search] = useSearchParams();

  // datos del formulario
  const [correo, setCorreo] = useState("");
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [vendedor, setVendedor] = useState(false);
  const [comprador, setComprador] = useState(false);

  // errores y estado de guardado
  const [errNombre, setErrNombre] = useState("");
  const [errPassword, setErrPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const passRef = useRef(null);
  const [showPass, setShowPass] = useState(false);

  const toast = (text, type = "info") =>
    Toastify({
      text,
      duration: 2800,
      gravity: "top",
      position: "right",
      close: true,
      className: type,
    }).showToast();

  const correoTrim = correo.trim();

  // validación al enviar
  const validar = () => {
    let ok = true;
    setErrNombre("");
    setErrPassword("");

    const nombreTrim = nombre.trim();

    if (!nombreTrim) {
      setErrNombre("El nombre de usuario es obligatorio");
      ok = false;
    } else if (nombreTrim.length < 3) {
      setErrNombre("Mínimo 3 caracteres");
      ok = false;
    } else if (nombreTrim.length > 30) {
      setErrNombre("Máximo 30 caracteres");
      ok = false;
    }

    if (password) {
      if (password.length > 30) {
        setErrPassword("La contraseña no puede superar 30 caracteres");
        ok = false;
      } else if (!strongRegex.test(password)) {
        setErrPassword(
          "Debe tener mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo"
        );
        ok = false;
      }
    }

    if (!vendedor && !comprador) {
      toast("Selecciona vender o comprar.", "error");
      ok = false;
    }

    return ok;
  };

  // cálculo rápido para habilitar el botón
  const nombreTrim = nombre.trim();
  const nombreOk = nombreTrim.length >= 3 && nombreTrim.length <= 30;
  const passwordOk =
    password === "" ||
    (password.length <= 30 && strongRegex.test(password));
  const rolesOk = vendedor || comprador;

  const isFormValid = nombreOk && passwordOk && rolesOk;

  // de qué panel viene (comprador / vendedor)
  const origen = useMemo(() => {
    const q = (search.get("from") || "").toLowerCase();
    if (q === "vendedor" || q === "comprador") return q;

    const stored = (localStorage.getItem("rolActual") || "").toLowerCase();
    if (stored === "vendedor" || stored === "comprador") return stored;

    const ref = (document.referrer || "").toLowerCase();
    if (ref.includes("/indexvendedor")) return "vendedor";
    if (ref.includes("/indexcomprador")) return "comprador";

    return "comprador";
  }, [search]);

  const destinoPanel = useMemo(
    () => (origen === "vendedor" ? "/indexvendedor" : "/indexcomprador"),
    [origen]
  );

  // carga de datos del usuario
  useEffect(() => {
    (async () => {
      try {
        const uStr = localStorage.getItem("usuario");
        const token = localStorage.getItem("token");
        let user = uStr ? JSON.parse(uStr) : null;

        const idFromQuery = search.get("id");
        const userId =
          idFromQuery ||
          localStorage.getItem("userId") ||
          (user && (user.id || user.userId));
        if (!userId) return;

        if (!user || !user.correo || !user.nombre) {
          try {
            const r = await fetch(
              `${API}/usuario/${encodeURIComponent(userId)}`,
              {
                headers: token ? { Authorization: "Bearer " + token } : {},
              }
            );
            if (r.ok) {
              user = await r.json();
              localStorage.setItem("usuario", JSON.stringify(user));
            }
          } catch {}
        }

        if (user) {
          setCorreo(user.correo || "");
          setNombre(user.nombre || "");
          setVendedor(user.es_vendedor === "S");
          setComprador(user.es_comprador === "S");
        }
      } catch {}
    })();
  }, [search]);

  // mostrar/ocultar contraseña
  useEffect(() => {
    if (passRef.current) passRef.current.type = showPass ? "text" : "password";
  }, [showPass]);

  // envío del formulario
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validar()) return;

    const token = localStorage.getItem("token");
    const uStr = localStorage.getItem("usuario");
    let user = uStr ? JSON.parse(uStr) : null;
    const idFromQuery = search.get("id");
    const userId =
      idFromQuery ||
      localStorage.getItem("userId") ||
      (user && (user.id || user.userId));

    if (!token || !userId) {
      toast("Sesión inválida", "error");
      return;
    }

    const nombreTrim2 = nombre.trim();

    const payload = {
      correo: correoTrim,
      nombre: nombreTrim2,
      es_vendedor: vendedor ? "S" : "N",
      es_comprador: comprador ? "S" : "N",
      ...(password ? { password } : {}),
    };

    setSaving(true);

    // intenta con distintas rutas/métodos por compatibilidad
    const tries = [
      { url: `${API}/usuario/${encodeURIComponent(userId)}`, method: "PUT" },
      { url: `${API}/usuarios/${encodeURIComponent(userId)}`, method: "PUT" },
      { url: `${API}/usuario/${encodeURIComponent(userId)}`, method: "PATCH" },
    ];

    let ok = false;
    let lastText = "";
    for (const t of tries) {
      try {
        const r = await fetch(t.url, {
          method: t.method,
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify(payload),
        });
        const txt = await r.text();
        lastText = txt;
        if (r.ok) {
          ok = true;
          break;
        }
      } catch (err) {
        lastText = String(err);
      }
    }

    if (!ok) {
      setSaving(false);

      let msg = lastText || "No se pudo actualizar";
      try {
        const parsed = JSON.parse(lastText);
        if (parsed.mensaje) msg = parsed.mensaje;
        else if (parsed.message) msg = parsed.message;
      } catch {}

      toast(msg, "error");
      return;
    }

    const newUser = { ...(user || {}), ...payload };
    delete newUser.password;
    localStorage.setItem("usuario", JSON.stringify(newUser));

    // mensaje para mostrar en el panel al redirigir
    localStorage.setItem(
      "flash",
      JSON.stringify({
        text: "Perfil actualizado",
        type: "ok",
        timeout: 1800,
      })
    );

    setSaving(false);
    navigate(destinoPanel, { replace: true });
  };

  return (
    <div className="perfil-page">
      <header className="perfil-topbar">
        <button className="perfil-btn-back" onClick={() => navigate(-1)}>
          <i className="fa fa-arrow-left" /> Regresar
        </button>
        <img src="/img/logo.png" alt="CarBid" />
      </header>

      <main className="perfil-wrapper">
        <h1 className="perfil-title">Mi perfil</h1>
        <p className="perfil-subtitle">
          Actualiza tu información, contraseña y roles de compra/venta.
        </p>

        <form
          id="profileForm"
          className="perfil-card"
          noValidate
          onSubmit={onSubmit}
        >
          {/* Nombre de usuario */}
          <div className="perfil-field">
            <label htmlFor="nombre">
              Usuario <span className="perfil-required">*</span>
            </label>
            <div className="perfil-input-wrapper">
              <input
                type="text"
                id="nombre"
                className="perfil-input"
                placeholder="Tu nombre de usuario"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={30}
              />
            </div>
            <small id="err-nombre" className="perfil-error">
              {errNombre}
            </small>
            <p className="perfil-hint perfil-hint-red"></p>
          </div>

          {/* Contraseña nueva (opcional) */}
          <div className="perfil-field perfil-full-row">
            <label htmlFor="password">Nueva contraseña (opcional)</label>
            <div className="perfil-input-wrapper">
              <input
                ref={passRef}
                type="password"
                id="password"
                className="perfil-input perfil-input-with-eye"
                placeholder="Deja vacío para no cambiar"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={30}
              />
              <button
                type="button"
                className="perfil-toggle-pass"
                aria-label="Mostrar u ocultar"
                onClick={() => setShowPass((s) => !s)}
              >
                <i className={`fa ${showPass ? "fa-eye-slash" : "fa-eye"}`} />
              </button>
            </div>
            <p className="perfil-hint perfil-hint-red">
              Mínimo 8 caracteres con mayúscula, minúscula,
              número y símbolo (máx. 30).
            </p>
            <small id="err-password" className="perfil-error">
              {errPassword}
            </small>
          </div>

          {/* Roles de usuario */}
          <div className="perfil-field perfil-full-row">
            <div className="perfil-checkboxes">
              <label className="perfil-chk">
                <input
                  type="checkbox"
                  id="vendedor"
                  checked={vendedor}
                  onChange={(e) => setVendedor(e.target.checked)}
                />
                <span>Quiero Vender</span>
              </label>
              <label className="perfil-chk">
                <input
                  type="checkbox"
                  id="comprador"
                  checked={comprador}
                  onChange={(e) => setComprador(e.target.checked)}
                />
                <span>Quiero Comprar</span>
              </label>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="perfil-actions perfil-full-row">
            <button
              type="button"
              className="perfil-btn perfil-btn-ghost"
              onClick={() => navigate(-1)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="perfil-btn perfil-btn-primary"
              disabled={!isFormValid || saving}
            >
              {saving ? "Guardando..." : "Aceptar"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
