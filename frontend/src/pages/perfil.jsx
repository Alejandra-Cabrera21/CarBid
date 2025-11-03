// src/pages/Perfil.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";

const API = "http://localhost:3000/api";

export default function Perfil() {
  const navigate = useNavigate();
  const [search] = useSearchParams();

  // ---------- estado del formulario ----------
  const [correo, setCorreo] = useState("");
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [vendedor, setVendedor] = useState(false);
  const [comprador, setComprador] = useState(false);

  const [errCorreo, setErrCorreo] = useState("");
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

  const validar = () => {
    let ok = true;
    setErrCorreo("");
    setErrNombre("");
    setErrPassword("");

    if (!correo?.trim()) {
      setErrCorreo("El correo es obligatorio");
      ok = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      setErrCorreo("Correo inválido");
      ok = false;
    }
    if (!nombre?.trim()) {
      setErrNombre("El nombre de usuario es obligatorio");
      ok = false;
    }
    if (password && password.length < 6) {
      setErrPassword("Mínimo 6 caracteres");
      ok = false;
    }
    return ok;
  };

  // ---------- detectar panel de origen (para redirección) ----------
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

        // permite también venir con ?id=
        const idFromQuery = search.get("id");
        const userId =
          idFromQuery ||
          localStorage.getItem("userId") ||
          (user && (user.id || user.userId));
        if (!userId) return;

        if (!user || !user.correo || !user.nombre) {
          try {
            const r = await fetch(`${API}/usuario/${encodeURIComponent(userId)}`, {
              headers: token ? { Authorization: "Bearer " + token } : {},
            });
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
      correo,
      nombre,
      es_vendedor: vendedor ? "S" : "N",
      es_comprador: comprador ? "S" : "N",
      ...(password ? { password } : {}),
    };

    setSaving(true);

    // Probar endpoints comunes: ajusta el primero al tuyo real si ya lo sabes
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
      toast(lastText || "No se pudo actualizar", "error");
      return;
    }

    // Actualiza caché local (sin password)
    const newUser = { ...(user || {}), ...payload };
    delete newUser.password;
    localStorage.setItem("usuario", JSON.stringify(newUser));

    // flash para otras pantallas
    localStorage.setItem(
      "flash",
      JSON.stringify({ text: "Perfil actualizado", type: "ok", timeout: 1800 })
    );

    toast("Perfil actualizado", "success");
    setSaving(false);

    // 🔁 Redirigir SIEMPRE al panel de ORIGEN (no cambiamos rolActual aquí)
    navigate(destinoPanel, { replace: true });
  };

  return (
    <>
<style>{`
/* ===== Inputs centrados ===== */
.input-wrapper {
  position: relative;
  width: 100%;
}
.input {
  width: 100%;
  border: 1px solid var(--bd);
  background: #0d1020;
  color: var(--text);
  border-radius: 12px;
  height: 48px; /* ✅ altura fija */
  padding: 0 40px; /* ✅ centrado horizontal sin exceso de padding */
  line-height: 48px; /* ✅ centra el texto verticalmente */
  font-size: 15px;
  text-align: left;
  outline: none;
  transition: .15s ease;
}
.input:focus {
  border-color: var(--focus);
  box-shadow: 0 0 0 3px #3b82f622, inset 0 0 0 1px #3b82f6;
}
.icon-left {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #7f8aa3;
  font-size: 16px;
  pointer-events: none;
}
.toggle-pass {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  color: #8ea2c0;
  font-size: 18px;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  cursor: pointer;
}
.toggle-pass:hover {
  background: #ffffff12;
}

/* ===== Checkboxes debajo de los inputs ===== */
.checkboxes {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  padding: 14px;
  border: 1px dashed var(--bd);
  border-radius: 12px;
  background: #0d1020;
  margin-top: 10px; /* separación respecto al input anterior */
  margin-bottom: 10px; /* espacio antes de los botones */
}
.chk {
  display: flex;
  align-items: center;
  gap: 8px;
}
.chk input {
  width: 18px;
  height: 18px;
  accent-color: var(--brand);
}
.chk span {
  font-weight: 600;
}
`}</style>


      <header className="topbar">
        <button className="btn-back" onClick={() => navigate(-1)}>
          <i className="fa fa-arrow-left" /> Regresar
        </button>
        <img src="img/logo.png" alt="CarBid" />
      </header>

      <main className="profile-wrapper">
        <h1 className="page-title">Mi perfil</h1>
        <p className="subtitle">
          Actualiza tu información y tus roles de compra/venta.
        </p>

        <form id="profileForm" className="card" noValidate onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="correo">Correo</label>
            <div className="input-wrapper">
              <i className="fa fa-envelope icon-left" />
              <input
                type="email"
                id="correo"
                className="input"
                placeholder="tu@correo.com"
                required
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
              />
            </div>
            <small id="err-correo" className="error">{errCorreo}</small>
          </div>

          <div className="field">
            <label htmlFor="nombre">Usuario</label>
            <div className="input-wrapper">
              <i className="fa fa-user icon-left" />
              <input
                type="text"
                id="nombre"
                className="input"
                placeholder="Tu nombre de usuario"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <small id="err-nombre" className="error">{errNombre}</small>
          </div>

          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="password">Nueva contraseña (opcional)</label>
            <div className="input-wrapper">
              <i className="fa fa-lock icon-left" />
              <input
                ref={passRef}
                type="password"
                id="password"
                className="input"
                placeholder="Deja vacío para no cambiar"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="toggle-pass"
                aria-label="Mostrar u ocultar"
                onClick={() => setShowPass((s) => !s)}
              >
                <i className={`fa ${showPass ? "fa-eye-slash" : "fa-eye"}`} />
              </button>
            </div>
            <p className="hint">Debe ser segura si decides cambiarla.</p>
            <small id="err-password" className="error">{errPassword}</small>
          </div>

          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <div className="checkboxes">
              <label className="chk">
                <input
                  type="checkbox"
                  id="vendedor"
                  checked={vendedor}
                  onChange={(e) => setVendedor(e.target.checked)}
                />
                <span>Quiero Vender</span>
              </label>
              <label className="chk">
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

          <div className="actions" style={{ gridColumn: "1 / -1" }}>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Guardando..." : "Aceptar"}
            </button>
          </div>
        </form>
      </main>
    </>
  );
}
