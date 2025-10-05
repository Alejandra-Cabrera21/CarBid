// === CONFIGURACIÓN DE API ===
const API_URL = "https://carbid-rvqj.onrender.com"; // URL de tu backend

// === FUNCIÓN GENERAL PARA VER DETALLE DE SUBASTA ===
function verSubasta(id) {
  window.location.href = `auction-detail.html?id=${id}`;
}

// === HOME: cargar subastas con imagen ===
async function cargarSubastas() {
  try {
    const res = await fetch(`${API_URL}/auctions`);
    const data = await res.json();

    const container = document.getElementById("auctionList");
    if (!container) return;

    container.innerHTML = "";

    data.forEach(auction => {
      const imagenURL = auction.imagen
        ? auction.imagen  // ✅ Usa la URL de Cloudinary
        : "https://via.placeholder.com/300x200?text=Sin+imagen"; // Imagen por defecto

      const card = `
        <div class="card">
          <img src="${imagenURL}" alt="Imagen del vehículo" style="
            display:block;
            margin:0 auto;
            width:100%;
            max-height:200px;
            object-fit:cover;
            border-radius:8px;
          ">
          <h3>${auction.modelo}</h3>
          <p>${auction.descripcion}</p>
          <p><strong>Precio base:</strong> $${auction.precioBase}</p>
          <p><strong>Oferta más alta:</strong> $${auction.ofertaGanadora || '-'}</p>
          <p><strong>Estado:</strong> ${auction.estado}</p>
          <button onclick="verSubasta(${auction.id})">Ver subasta</button>
        </div>
      `;
      container.innerHTML += card;
    });
  } catch (error) {
    console.error("Error al cargar subastas:", error);
  }
}

// === HACER OFERTA (solo compradores) ===
async function hacerOferta() {
  const params = new URLSearchParams(window.location.search);
  const auctionId = params.get("id");
  const monto = document.getElementById("monto").value;
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user) {
    alert("Debes iniciar sesión para ofertar.");
    return;
  }

  if (user.role === "vendedor") {
    alert("Los vendedores no pueden ofertar en las subastas.");
    return;
  }

  await fetch(`${API_URL}/bids/ofertar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: user.id, auctionId, monto })
  });

  cargarPujas(auctionId);
}

// === CARGAR PUJAS ===
async function cargarPujas(auctionId) {
  const res = await fetch(`${API_URL}/bids/historial/${auctionId}`);
  const data = await res.json();
  const tbody = document.getElementById("bidsTable");
  if (!tbody) return;

  tbody.innerHTML = "";
  data.forEach(bid => {
    const row = `
      <tr>
        <td>${bid.userId}</td>
        <td>$${bid.monto}</td>
        <td>${new Date(bid.createdAt).toLocaleString()}</td>
      </tr>
    `;
    tbody.innerHTML += row;
  });
}

// === DETALLE DE SUBASTA (con imagen) ===
async function cargarDetalle() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) return;

  try {
    const res = await fetch(`${API_URL}/auctions/${id}`);
    const auction = await res.json();

    const detail = document.getElementById("auctionDetail");
    if (!detail) return;

    const imgSrc = auction.imagen
      ? auction.imagen
      : "https://via.placeholder.com/800x600?text=Sin+imagen";

    detail.innerHTML = `
      <div class="auction-card">
        <img src="${imgSrc}" alt="Imagen del vehículo" class="auction-image" style="
          display:block;
          margin:0 auto;
          border-radius:10px;
          max-width:100%;
        "/>
        <h2>${auction.modelo}</h2>
        <p>${auction.descripcion || "Sin descripción disponible"}</p>
        <p><strong>Precio base:</strong> $${auction.precioBase}</p>
        <p><strong>Oferta más alta:</strong> $${auction.ofertaGanadora || "-"}</p>
        <p><strong>Estado:</strong> ${auction.estado}</p>
        <p><strong>Cierre:</strong> ${new Date(auction.fechaCierre).toLocaleString()}</p>
      </div>
    `;

    cargarPujas(id);
  } catch (err) {
    console.error("Error al cargar el detalle de la subasta:", err);
  }
}

// === REGISTRO COMPRADOR ===
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (data.id) {
      localStorage.setItem("user", JSON.stringify({
        id: data.id, email: data.email, role: "comprador"
      }));
      alert("Cuenta creada con éxito");
      window.location.href = "account.html";
    } else alert("Error: " + data.error);
  });
}

// === LOGIN COMPRADOR ===
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (data.id) {
      localStorage.setItem("user", JSON.stringify({
        id: data.id, email: data.email, role: "comprador"
      }));
      alert("Bienvenido " + data.email);
      window.location.href = "account.html";
    } else alert("Error: " + data.error);
  });
}

// === LOGIN Y REGISTRO DE VENDEDOR ===
const registerVendorForm = document.getElementById("registerVendorForm");
if (registerVendorForm) {
  registerVendorForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const res = await fetch(`${API_URL}/auth/register-vendedor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (data.id) {
      localStorage.setItem("user", JSON.stringify({
        id: data.id, email: data.email, role: "vendedor", vendorCode: data.vendorCode
      }));
      alert(`Cuenta de vendedor creada con éxito. Tu código es: ${data.vendorCode}`);
      window.location.href = "login-vendedor.html";
    } else alert("Error: " + data.error);
  });
}

// === LOGOUT ===
function logout() {
  localStorage.removeItem("user");
  alert("Sesión cerrada");
  window.location.href = "index.html";
}

// === AUTOEJECUCIÓN SEGÚN PÁGINA ===
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("auctionList")) cargarSubastas();
  if (document.getElementById("auctionDetail")) cargarDetalle();
});
