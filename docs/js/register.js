document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');
  const correoEl = document.getElementById('correo');
  const usuarioEl = document.getElementById('usuario');
  const passEl   = document.getElementById('password');
  const confEl   = document.getElementById('confirmar');
  const vendEl   = document.getElementById('vendedor');
  const compEl   = document.getElementById('comprador');

  // 👁 Mostrar/ocultar
  const toggle = (btnId, inputEl) => {
    document.getElementById(btnId).addEventListener('click', () => {
      const i = document.getElementById(btnId).querySelector('i');
      inputEl.type = inputEl.type === 'password' ? 'text' : 'password';
      i.classList.toggle('fa-eye');
      i.classList.toggle('fa-eye-slash');
    });
  };
  toggle('togglePassword', passEl);
  toggle('toggleConfirm',  confEl);

  const toast = (txt, ok=true) => {
    Toastify({
      text: txt, duration: 3000, gravity: 'top', position: 'right', close: true,
      style: { background: ok
        ? 'linear-gradient(135deg,#00b09b,#96c93d)'
        : 'linear-gradient(135deg,#ff5f6d,#ffc371)' }
    }).showToast();
  };

  const setErr = (id, msg) => document.getElementById(`error-${id}`).textContent = msg;
  const clearErr = () => document.querySelectorAll('.error').forEach(e => e.textContent = '');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErr();

    const correo  = correoEl.value.trim();
    const usuario = usuarioEl.value.trim();
    const password = passEl.value;
    const confirmar = confEl.value;
    const es_vendedor  = vendEl.checked ? 'S' : 'N';
    const es_comprador = compEl.checked ? 'S' : 'N';

    let ok = true;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) { setErr('correo','Ingresa un correo válido.'); ok = false; }
    if (usuario.length < 3) { setErr('usuario','Debe tener al menos 3 caracteres.'); ok = false; }

    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])[A-Za-z\d@$!%*?&._-]{8,}$/;
    if (!strong.test(password)) {
      setErr('password','Mín. 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.');
      ok = false;
    }
    if (password !== confirmar) { setErr('confirmar','Las contraseñas no coinciden.'); ok = false; }
    if (es_vendedor === 'N' && es_comprador === 'N') { toast('Selecciona Vender o Comprar', false); ok = false; }

    if (!ok) return;

    try {
      // 1) ¿Correo ya existe?
      const chk = await fetch('http://localhost:3000/api/users/check', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo })
      });
      const chkJson = await chk.json();
      if (chk.ok && chkJson.encontrado) { setErr('correo','Este correo ya está registrado.'); return; }

      // 2) Registrar
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'Guardando...';

      const res = await fetch('http://localhost:3000/api/users/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: usuario, correo,
          contraseña: password,    // 👈 tu backend espera 'contraseña'
          es_vendedor, es_comprador
        })
      });
      const data = await res.json();

      if (res.ok) {
        toast('Usuario registrado correctamente ✅', true);
        form.reset();
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
