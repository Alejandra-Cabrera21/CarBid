document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');

  // Campos
  const correoEl = document.getElementById('correo');
  const usuarioEl = document.getElementById('usuario');
  const passEl   = document.getElementById('password');
  const confEl   = document.getElementById('confirmar');
  const vendEl   = document.getElementById('vendedor');
  const compEl   = document.getElementById('comprador');

  // 👁 Mostrar/ocultar contraseñas
  setupToggle('#togglePassword',  passEl);
  setupToggle('#toggleConfirm',   confEl);

  function setupToggle(btnSelector, inputEl){
    const btn   = document.querySelector(btnSelector);
    const icon  = btn.querySelector('i');
    const toggle = () => {
      const show = inputEl.type === 'password';
      inputEl.type = show ? 'text' : 'password';
      icon.classList.toggle('fa-eye', !show);
      icon.classList.toggle('fa-eye-slash', show);
    };
    btn.addEventListener('click', (e) => { e.preventDefault(); toggle(); });
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  }

  // ✅ Exclusividad visual: si marco uno, desmarco el otro
  document.querySelectorAll('.rol-check').forEach(cb => {
    cb.addEventListener('change', (e) => {
      if (e.target.checked) {
        document.querySelectorAll('.rol-check').forEach(other => {
          if (other !== e.target) other.checked = false;
        });
      }
    });
  });

  // Toast helper
  const toast = (txt, ok=true) => {
    Toastify({
      text: txt,
      duration: 3000,
      gravity: 'top',
      position: 'right',
      close: true,
      style: {
        background: ok
          ? 'linear-gradient(135deg,#00b09b,#96c93d)'
          : 'linear-gradient(135deg,#ff5f6d,#ffc371)'
      }
    }).showToast();
  };

  const setErr   = (id, msg) => document.getElementById(`error-${id}`).textContent = msg;
  const clearErr = () => document.querySelectorAll('.error').forEach(e => e.textContent = '');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErr();

    const correo    = correoEl.value.trim();
    const usuario   = usuarioEl.value.trim();
    const password  = passEl.value;
    const confirmar = confEl.value;

    // Rol único
    const rol = vendEl.checked ? 'v' : (compEl.checked ? 'c' : null);

    // Validaciones
    let ok = true;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      setErr('correo','Ingresa un correo válido.'); ok = false;
    }
    if (usuario.length < 3) {
      setErr('usuario','Debe tener al menos 3 caracteres.'); ok = false;
    }
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])[A-Za-z\d@$!%*?&._-]{8,}$/;
    if (!strong.test(password)) {
      setErr('password','Mín. 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.');
      ok = false;
    }
    if (password !== confirmar) {
      setErr('confirmar','Las contraseñas no coinciden.'); ok = false;
    }
    if (!rol) {
      toast('Selecciona al menos Vender o Comprar', false); ok = false;
    }

    if (!ok) return;

    try {
      // 1) Verificar si el correo ya existe
      const chk = await fetch('http://localhost:3000/api/users/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo })
      });
      const chkJson = await chk.json();
      if (chk.ok && chkJson.encontrado) {
        setErr('correo','Este correo ya está registrado.');
        return;
      }

      // 2) Registrar usuario (enviamos SOLO 'rol')
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'Guardando...';

      const res = await fetch('http://localhost:3000/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: usuario,
          correo,
          contraseña: password, // el backend espera 'contraseña'
          rol                     // 'v' o 'c'
        })
      });
      const data = await res.json();

      if (res.ok) {
        toast('Usuario registrado correctamente ✅', true);
        form.reset();
        // volver a modo oculto los ojos
        document.querySelectorAll('.toggle-pass i').forEach(i=>{
          i.classList.remove('fa-eye-slash');
          i.classList.add('fa-eye');
        });
        passEl.type = 'password';
        confEl.type = 'password';
      } else {
        toast(data.mensaje || 'Error al registrar.', false);
      }

      btn.disabled = false; btn.textContent = 'SIGUIENTE';
    } catch (err) {
      console.error(err);
      toast('Error de conexión con el servidor', false);
    }
  });
});
