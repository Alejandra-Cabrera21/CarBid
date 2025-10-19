document.addEventListener("DOMContentLoaded", async () => {
  const tablaBody = document.querySelector("#tablaPujas tbody");

  try {
    const token = localStorage.getItem("token");
    if (!token) {
      tablaBody.innerHTML = `<tr><td colspan="4">No has iniciado sesión</td></tr>`;
      return;
    }

    const res = await fetch("http://localhost:3000/api/historial-pujas", {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Error al obtener historial");

    if (data.length === 0) {
      tablaBody.innerHTML = `<tr><td colspan="4">No hay pujas registradas aún.</td></tr>`;
      return;
    }

    tablaBody.innerHTML = "";
    data.forEach((puja) => {
      const fila = `
        <tr>
          <td>${puja.vehiculo}</td>
          <td>${puja.nombre_postor}</td>
          <td>Q${Number(puja.oferta).toLocaleString("es-GT")}</td>
          <td>${puja.hora}</td>
        </tr>`;
      tablaBody.innerHTML += fila;
    });
  } catch (err) {
    console.error(err);
    tablaBody.innerHTML = `<tr><td colspan="4">Error al cargar el historial</td></tr>`;
  }
});
