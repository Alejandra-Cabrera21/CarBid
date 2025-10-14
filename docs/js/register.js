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
  setupToggle('#togglePassword', passEl);
  setupToggle('#toggleConfirm', confEl);

  function setupToggle(btnSelector, inputEl) {
    const btn = document.querySelector(btnSelector);
    const icon = btn.querySelector('i');
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

  // Toast helper
  const toast = (txt, ok = true) => {
    Toastify({
      text: txt,
      duration: 3000,
      gravity: 'top',
      position: 'right',
      close: true,
      style: {
        background: ok ? '#28a745' : '#b51f05ff', // color sólido
        color: '#fff',
        fontWeight: '500',
        borderRadius: '8px',
        boxShadow: '0 3px 10px rgba(0,0,0,.25)',
      },
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

    // Debe seleccionar al menos uno
    if (!vendEl.checked && !compEl.checked) {
      toast('Selecciona vender o comprar', false); ok = false;
    }

    if (!ok) return;

    try {
      // 1️⃣ Verificar si el correo ya existe
      const chk = await fetch('http://localhost:3000/api/users/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo })
      });
      const chkJson = await chk.json();
      if (chk.ok && chkJson.encontrado) {
        setErr('correo','Este correo ya se encuentra registrado.');
        return;
      }

      // 2️⃣ Registrar usuario
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'Guardando...';

      const res = await fetch('http://localhost:3000/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: usuario,
          correo,
          contraseña: password, // el backend espera 'contraseña'
          es_vendedor: vendEl.checked ? 'S' : 'N',
          es_comprador: compEl.checked ? 'S' : 'N'
        })
      });
      const data = await res.json();

      if (res.ok) {
        toast('Registro correcto', true);
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
