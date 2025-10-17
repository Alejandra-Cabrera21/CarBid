document.addEventListener("DOMContentLoaded", () => {
  const btns = [
    document.getElementById("btnRegistro"),
    document.getElementById("btnRegistroMobile")
  ];

  // 🔹 Redirección a registro
  btns.forEach(btn => {
    if (btn) {
      btn.addEventListener("click", () => {
        window.location.href = "register.html";
      });
    }
  });

  // 🔹 Abrir / cerrar menú solo al hacer clic en el botón
  const dropdownButtons = document.querySelectorAll(".dropbtn");

  dropdownButtons.forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      e.stopImmediatePropagation(); // evita cualquier evento global
      const dropdown = btn.nextElementSibling;
      const isOpen = dropdown.classList.contains("active");

      // Cierra todos los menús antes de abrir el actual
      document.querySelectorAll(".dropdown-content").forEach(menu => menu.classList.remove("active"));
      document.querySelectorAll(".dropbtn").forEach(b => b.classList.remove("open"));

      // Si no estaba abierto, lo abre
      if (!isOpen) {
        dropdown.classList.add("active");
        btn.classList.add("open");
      }
    });
  });

  // 🔹 Evita que cualquier clic fuera afecte el menú
  document.body.addEventListener("click", e => {
    // Si el clic NO es dentro del botón ni dentro del menú, no hacemos nada.
    // Esto evita que el menú se cierre.
    const isInsideDropdown = e.target.closest(".dropdown");
    if (!isInsideDropdown) {
      // NO cerramos nada aquí. El menú queda intacto.
      return;
    }
  });

  // 🔹 Cerrar menú al elegir una opción (opcional)
  document.querySelectorAll(".dropdown-content a").forEach(a => {
    a.addEventListener("click", () => {
      const parent = a.closest(".dropdown");
      if (!parent) return;
      const menu = parent.querySelector(".dropdown-content");
      const button = parent.querySelector(".dropbtn");
      if (menu) menu.classList.remove("active");
      if (button) button.classList.remove("open");
    });
  });
});
