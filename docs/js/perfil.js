// docs/js/perfil.js
document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'http://localhost:3000/api';
  const qs = new URLSearchParams(location.search);

  const uStr = localStorage.getItem('usuario');
  const uObj = uStr ? JSON.parse(uStr) : null;
  let userId = qs.get('id') || localStorage.getItem('userId') || (uObj && uObj.id);
  const token = localStorage.getItem('token');

  if (!userId) { location.href = 'login.html'; return; }

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

  // Prefill rápido con lo que quedó del login (opcional)
  if (uObj) {
    if (uObj.correo)  correo.value = uObj.correo;
    if (uObj.nombre)  nombre.value = uObj.nombre;
    if (uObj.es_vendedor)  vendedor.checked  = uObj.es_vendedor  === 'S';
    if (uObj.es_comprador) comprador.checked = uObj.es_comprador === 'S';
  }

  // GET a la nueva ruta /api/perfil/:id
 // === CARGA DE PERFIL DESDE EL SERVER (usa /api/usuario/:id) ===
(async function loadFromServer() {
  try {
    const r = await fetch(`${API_BASE}/usuario/${encodeURIComponent(userId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!r.ok) throw new Error(`No se pudo cargar el perfil (HTTP ${r.status}).`);
    const u = await r.json();

    // Rellenar UI con lo que trae el backend
    correo.value      = u.correo || '';
    nombre.value      = u.nombre || '';
    vendedor.checked  = u.es_vendedor  === 'S';
    comprador.checked = u.es_comprador === 'S';

    // Refrescar cache local (opcional)
    const last = JSON.parse(localStorage.getItem('usuario') || '{}');
    localStorage.setItem('usuario', JSON.stringify({ ...last, ...u }));
  } catch (e) {
    console.error(e);
    toast('No se pudo cargar tu perfil', false);
  }
})();


  // Mostrar/ocultar lo que escribes
  const togglePassword = document.getElementById('togglePassword');
  if (togglePassword) {
    const icon = togglePassword.querySelector('i');
    togglePassword.addEventListener('click', (e) => {
      e.preventDefault();
      const show = pass.type === 'password';
      pass.type = show ? 'text' : 'password';
      if (icon) {
        icon.classList.toggle('fa-eye', !show);
        icon.classList.toggle('fa-eye-slash', show);
      }
    });
  }

  // Guardar (PATCH) a /api/perfil/:id
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    errCorreo.textContent = ''; errNombre.textContent = ''; errPass.textContent = '';

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.value.trim());
    if (!emailOk) { errCorreo.textContent = 'Correo inválido'; return; }
    if (nombre.value.trim().length < 3) { errNombre.textContent = 'Mínimo 3 caracteres'; return; }
    if (!vendedor.checked && !comprador.checked) { toast('Selecciona vender o comprar', false); return; }
    if (pass.value && pass.value.length < 6) { errPass.textContent = 'Mínimo 6 caracteres'; return; }

    const payload = {
      nombre: nombre.value.trim(),
      correo: correo.value.trim(),
      es_vendedor:  vendedor.checked  ? 'S' : 'N',
      es_comprador: comprador.checked ? 'S' : 'N'
    };
    if (pass.value) payload.contraseña = pass.value;

    const btn = form.querySelector('button[type=submit]');
    const prev = btn.textContent; btn.disabled = true; btn.textContent = 'Guardando...';

    try {
   const r = await fetch(`${API_BASE}/usuario/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      const data = await r.json().catch(()=> ({}));

      if (r.ok) {
        toast('Perfil actualizado');
        localStorage.setItem('usuario', JSON.stringify({
          ...(uObj||{}),
          id: Number(userId),
          nombre: payload.nombre,
          correo: payload.correo,
          es_vendedor: payload.es_vendedor,
          es_comprador: payload.es_comprador
        }));
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
