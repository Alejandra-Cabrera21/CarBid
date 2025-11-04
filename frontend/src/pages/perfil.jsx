import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";
import "../styles/perfil.css";

const API = "http://localhost:3000/api";

// regex de contraseña fuerte (igual que en register)
const strongRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])[A-Za-z\d@$!%*?&._-]{8,}$/;

export default function Perfil() {
  const navigate = useNavigate();
  const [search] = useSearchParams();

  // ---------- estado del formulario ----------
  const [correo, setCorreo] = useState("");
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [vendedor, setVendedor] = useState(false);
  const [comprador, setComprador] = useState(false);

  // errores (solo para nombre y contraseña)
  const [errNombre, setErrNombre] = useState("");
  const [errPassword, setErrPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const passRef = useRef(null);
  const [showPass, setShowPass] = useState(false);

  // ---------- utils ----------
  const toast = (text, type = "info") =>
    Toastify({
      text,
      duration: 2800,
      gravity: "top",
      position: "right",
      close: true,
      className: type,
    }).showToast();

  // ---------- validación al enviar ----------
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

    // Validación de contraseña (solo si la escribe)
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

    // Validar que al menos haya un rol
    if (!vendedor && !comprador) {
      toast("Selecciona vender o comprar.", "error");
      ok = false;
    }

    return ok;
  };

  // ---------- validación en vivo para habilitar botón ----------
  const correoTrim = correo.trim();
  const nombreTrim = nombre.trim();

  const nombreOk = nombreTrim.length >= 3 && nombreTrim.length <= 30;

  const passwordOk =
    password === "" ||
    (password.length <= 30 && strongRegex.test(password));

  const rolesOk = vendedor || comprador; // ahora obligatorio al menos uno

  const isFormValid = nombreOk && passwordOk && rolesOk;

  // ---------- detectar panel de origen ----------
  const origen = useMemo(() => {
    const q = (search.get("from") || "").toLowerCase();
    if (q === "vendedor" || q === "comprador") return q;

    const stored = (localStorage.getItem("rolActual") || "").toLowerCase();
    if (stored === "vendedor" || stored === "comprador") return stored;

    const ref = (document.referrer || "").toLowerCase();
    if (ref.includes("/indexvendedor")) return "vendedor";
    if (ref.includes("/indexcomprador")) return "comprador";

    return "comprador"; // fallback razonable
  }, [search]);

  const destinoPanel = useMemo(
    () => (origen === "vendedor" ? "/indexvendedor" : "/indexcomprador"),
    [origen]
  );

  // ---------- cargar datos del usuario ----------
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

  // ---------- toggle de password ----------
  useEffect(() => {
    if (passRef.current) passRef.current.type = showPass ? "text" : "password";
  }, [showPass]);

  // ---------- submit ----------
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

    const payload = {
      // el correo va igual, solo lectura (no se puede cambiar en el front)
      correo: correoTrim,
      nombre: nombreTrim,
      es_vendedor: vendedor ? "S" : "N",
      es_comprador: comprador ? "S" : "N",
      ...(password ? { password } : {}),
    };

    setSaving(true);

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

      // intentar parsear JSON para sacar "mensaje"
      let msg = lastText || "No se pudo actualizar";
      try {
        const parsed = JSON.parse(lastText);
        if (parsed.mensaje) msg = parsed.mensaje;
        else if (parsed.message) msg = parsed.message;
      } catch {
        // si no es JSON, se queda como está
      }

      toast(msg, "error");
      return;
    }

    const newUser = { ...(user || {}), ...payload };
    delete newUser.password;
    localStorage.setItem("usuario", JSON.stringify(newUser));

    localStorage.setItem(
      "flash",
      JSON.stringify({
        text: "Perfil actualizado",
        type: "ok",
        timeout: 1800,
      })
    );

    toast("Perfil actualizado", "success");
    setSaving(false);
    navigate(destinoPanel, { replace: true });
  };

  return (
    <div className="perfil-page">
      <header className="perfil-topbar">
        <button className="perfil-btn-back" onClick={() => navigate(-1)}>
          <i className="fa fa-arrow-left" /> Regresar
        </button>
        <img src="img/logo.png" alt="CarBid" />
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
          {/* Correo solo lectura */}
          <div className="perfil-field">
            <label htmlFor="correo">Correo</label>
            <div className="perfil-input-wrapper">
              <input
                type="email"
                id="correo"
                className="perfil-input perfil-input-readonly"
                value={correo}
                readOnly
              />
            </div>
          </div>

          {/* Usuario */}
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
            <p className="perfil-hint perfil-hint-red">
              
            </p>
          </div>

          {/* Password */}
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

          {/* Roles */}
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

          {/* Botones */}
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
