// docs/js/perfil.js
document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'http://localhost:3000/api'; // ajusta si usas otro puerto
  const qs = new URLSearchParams(location.search);

  // 1) Resolver ID de usuario
  const storedUsuarioStr = localStorage.getItem('usuario');
  const storedUsuario = storedUsuarioStr ? JSON.parse(storedUsuarioStr) : null;

  let userId =
    qs.get('id') ||
    localStorage.getItem('userId') ||
    (storedUsuario && storedUsuario.id ? String(storedUsuario.id) : null);

  const token = localStorage.getItem('token');

  // refs UI
  const form      = document.getElementById('profileForm');
  const correo    = document.getElementById('correo');
  const nombre    = document.getElementById('nombre');
  const pass      = document.getElementById('password');
  const vendedor  = document.getElementById('vendedor');
  const comprador = document.getElementById('comprador');

  const errCorreo = document.getElementById('err-correo');
  const errNombre = document.getElementById('err-nombre');
  const errPass   = document.getElementById('err-password');

  const toast = (txt, ok = true) => {
    if (!window.Toastify) { alert(txt); return; }
    Toastify({
      text: txt, duration: 2400, gravity: 'top', position: 'right', close: true,
      style: { background: ok ? '#22c55e' : '#dc2626', color: '#fff', borderRadius: '10px' }
    }).showToast();
  };

  // Seguridad: si no hay sesión, manda a login
  if (!userId) {
    location.href = 'login.html';
    return;
  }

  // 2) Prefill rápido con lo que ya guardaste al hacer login
  if (storedUsuario) {
    if (storedUsuario.correo)  correo.value = storedUsuario.correo;
    if (storedUsuario.nombre)  nombre.value = storedUsuario.nombre;
    if (storedUsuario.es_vendedor)  vendedor.checked  = storedUsuario.es_vendedor  === 'S';
    if (storedUsuario.es_comprador) comprador.checked = storedUsuario.es_comprador === 'S';
  }

  // 3) Cargar desde servidor (la verdad de la BD)
  (async function loadFromServer() {
    try {
      const r = await fetch(`${API_BASE}/usuario/${encodeURIComponent(userId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!r.ok) throw new Error(`No se pudo cargar el perfil (HTTP ${r.status}).`);
      const u = await r.json();

      // rellenar con lo que venga de la BD
      correo.value = u.correo || '';
      nombre.value = u.nombre || '';
      vendedor.checked  = u.es_vendedor  === 'S';
      comprador.checked = u.es_comprador === 'S';

      // guarda una copia actualizada en localStorage.usuario
      const nuevoLocal = { ...(storedUsuario || {}), ...u };
      localStorage.setItem('usuario', JSON.stringify(nuevoLocal));

    } catch (e) {
      console.error(e);
      toast('No se pudo cargar tu perfil', false);
    }
  })();

  // 4) Mostrar/ocultar contraseña
  const togglePassword = document.getElementById('togglePassword');
  if (togglePassword) {
    togglePassword.addEventListener('click', (e) => {
      e.preventDefault();
      const show = pass.type === 'password';
      pass.type = show ? 'text' : 'password';
      const i = togglePassword.querySelector('i');
      if (i) { i.classList.toggle('fa-eye', !show); i.classList.toggle('fa-eye-slash', show); }
    });
  }

  // 5) Guardar cambios (PATCH)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // validaciones mínimas
    errCorreo.textContent = ''; errNombre.textContent = ''; errPass.textContent = '';

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.value.trim());
    if (!emailOk) { errCorreo.textContent = 'Correo inválido'; return; }
    if (nombre.value.trim().length < 3) { errNombre.textContent = 'Mínimo 3 caracteres'; return; }
    if (!vendedor.checked && !comprador.checked) { toast('Selecciona vender o comprar', false); return; }

    // si password se envía, que sea segura
    if (pass.value) {
      // puedes endurecer esta regla si tu registro usa otra
      if (pass.value.length < 6) { errPass.textContent = 'Mínimo 6 caracteres'; return; }
    }

    const payload = {
      nombre: nombre.value.trim(),
      correo: correo.value.trim(),
      es_vendedor:  vendedor.checked  ? 'S' : 'N',
      es_comprador: comprador.checked ? 'S' : 'N'
    };
    if (pass.value) payload.contraseña = pass.value; // si está vacío, NO cambia

    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; const prev = btn.textContent; btn.textContent = 'Guardando...';

    try {
      const r = await fetch(`${API_BASE}/usuario/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await r.json().catch(() => ({}));

      if (r.ok) {
        toast('Perfil actualizado');
        // refrescar localStorage.usuario con lo nuevo
        const nuevo = {
          ...(storedUsuario || {}),
          id: Number(userId),
          nombre: payload.nombre,
          correo: payload.correo,
          es_vendedor: payload.es_vendedor,
          es_comprador: payload.es_comprador
        };
        localStorage.setItem('usuario', JSON.stringify(nuevo));
        pass.value = '';
      } else {
        toast(data.mensaje || data.message || 'No se pudo actualizar', false);
      }
    } catch (err) {
      console.error(err);
      toast('Error de conexión', false);
    } finally {
      btn.disabled = false; btn.textContent = prev;
    }
  });
});
