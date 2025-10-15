document.addEventListener("DOMContentLoaded", () => {
  const btnRegistro = document.getElementById("btnRegistro");
  const btnRegistroMobile = document.getElementById("btnRegistroMobile");

  if (btnRegistro) {
    btnRegistro.addEventListener("click", () => {
      window.location.href = "register.html";
    });
  }
  if (btnRegistroMobile) {
    btnRegistroMobile.addEventListener("click", () => {
      window.location.href = "register.html";
    });
  }
});
