document.addEventListener("DOMContentLoaded", () => {
  const btnRegistro = document.getElementById("btnRegistro");

  if (btnRegistro) {
    btnRegistro.addEventListener("click", () => {
      window.location.href = "register.html";
    });
  }
});
