// === CONFIGURACIÓN DE API ===
const API_URL = "https://carbid-rvqj.onrender.com"; // tu URL en Render

// === HOME: cargar subastas ===
async function cargarSubastas() {
  const res = await fetch(`${API_URL}/auctions`);
  const data = await res.json();
  const container = document.getElementById("auctions");
  if (!container) return;

  container.innerHTML = "";
  data.forEach(auction => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h2>${auction.modelo}</h2>
      <p>${auction.descripcion || "Sin descripción"}</p>
      <p><strong>Precio base:</strong> $${auction.precioBase}</p>
      <p><strong>Oferta más alta:</strong> $${auction.ofertaGanadora || "-"}</p>
      <p><strong>Estado:</strong> ${auction.estado}</p>
      <button onclick="verSubasta(${auction.id})">Ver subasta</button>
    `;
    container.appendChild(card);
  });
}

function verSubasta(id) {
  window.location.href = `auction-detail.html?id=${id}`;
}

// === DETALLE DE SUBASTA ===
async function cargarDetalle() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) return;

  const res = await fetch(`${API_URL}/auctions/${id}`);
  const auction = await res.json();
  const detail = document.getElementById("auctionDetail");

  if (detail) {
    detail.innerHTML = `
      <h2>${auction.modelo}</h2>
      <p>${auction.descripcion}</p>
      <p><strong>Precio base:</strong> $${auction.precioBase}</p>
      <p><strong>Oferta más alta:</strong> $${auction.ofertaGanadora || "-"}</p>
      <p><strong>Estado:</strong> ${auction.estado}</p>
      <p><strong>Cierre:</strong> ${new Date(auction.fechaCierre).toLocaleString()}</p>
    `;
    cargarPujas(id);
  }
}

async function hacerOferta() {
  const params = new URLSearchParams(window.location.search);
  const auctionId = params.get("id");
  const monto = document.getElementById("monto").value;

  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    alert("Debes iniciar sesión para ofertar.");
    return;
  }

  await fetch(`${API_URL}/bids/ofertar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: user.id, auctionId, monto })
  });

  cargarPujas(auctionId);
}

async function cargarPujas(auctionId) {
  const res = await fetch(`${API_URL}/bids/historial/${auctionId}`);
  const data = await res.json();

  const tbody = document.getElementById("bidsTable");
  if (!tbody) return;

  tbody.innerHTML = "";
  data.forEach(bid => {
    const row = `<tr>
      <td>${bid.userId}</td>
      <td>$${bid.monto}</td>
      <td>${new Date(bid.createdAt).toLocaleString()}</td>
    </tr>`;
    tbody.innerHTML += row;
  });
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
      localStorage.setItem("user", JSON.stringify(data));
      alert("Cuenta creada con éxito");
      window.location.href = "account.html";
    } else {
      alert("Error: " + data.error);
    }
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
      localStorage.setItem("user", JSON.stringify(data));
      alert("Bienvenido " + data.email);
      window.location.href = "account.html";
    } else {
      alert("Error: " + data.error);
    }
  });
}

// === REGISTRO VENDEDOR ===
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
    if (data.vendorCode) {
      localStorage.setItem("user", JSON.stringify(data));
      document.getElementById("vendorCodeMsg").innerText = "Tu código de vendedor: " + data.vendorCode;
    } else {
      alert("Error: " + data.error);
    }
  });
}

// === LOGIN VENDEDOR ===
const loginVendorForm = document.getElementById("loginVendorForm");
if (loginVendorForm) {
  loginVendorForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const vendorCode = document.getElementById("vendorCode").value;

    const res = await fetch(`${API_URL}/auth/login-vendedor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, vendorCode })
    });

    const data = await res.json();
    if (data.id) {
      localStorage.setItem("user", JSON.stringify(data));
      alert("Bienvenido vendedor " + data.email);
      window.location.href = "account-vendedor.html";
    } else {
      alert("Error: " + data.error);
    }
  });
}

// === HISTORIAL COMPRADOR ===
async function cargarHistorialComprador() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || user.role !== "comprador") {
    alert("Debes iniciar sesión como comprador.");
    window.location.href = "login.html";
    return;
  }

  const res = await fetch(`${API_URL}/users/historial/${user.id}`);
  const data = await res.json();

  const tbody = document.getElementById("historyTable");
  if (!tbody) return;

  tbody.innerHTML = "";
  data.forEach(item => {
    const row = `<tr>
      <td>${item.Auction?.modelo || "Vehículo"}</td>
      <td>$${item.monto}</td>
      <td>$${item.Auction?.ofertaGanadora || "-"}</td>
      <td>${item.ganada ? "Ganada" : "Perdida"}</td>
      <td>${item.Auction?.estado}</td>
      <td>${item.Auction?.fechaCierre ? new Date(item.Auction.fechaCierre).toLocaleDateString() : "-"}</td>
    </tr>`;
    tbody.innerHTML += row;
  });
}

if (document.getElementById("historyTable")) {
  cargarHistorialComprador();
}

// === VENDEDOR: crear subasta ===
const auctionForm = document.getElementById("auctionForm");
if (auctionForm) {
  auctionForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || user.role !== "vendedor") {
      alert("Debes iniciar sesión como vendedor.");
      window.location.href = "login-vendedor.html";
      return;
    }

    // Usamos FormData para enviar texto + archivo
    const formData = new FormData(auctionForm);
    formData.append("vendedorId", user.id);

    try {
      const res = await fetch(`${API_URL}/auctions/create`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (data.auction) {
        alert("Subasta creada con éxito.");
        cargarSubastasVendedor();
        auctionForm.reset();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      console.error("Error al crear subasta:", err);
      alert("Error en la conexión con el servidor");
    }
  });
}


// === VENDEDOR: listar mis subastas ===
async function cargarSubastasVendedor() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || user.role !== "vendedor") return;

  const res = await fetch(`${API_URL}/auctions`);
  const data = await res.json();

  const tbody = document.getElementById("sellerAuctions");
  if (!tbody) return;

  tbody.innerHTML = "";
  data
    .filter(a => a.vendedorId === user.id) // solo sus subastas
    .forEach(a => {
      const row = `<tr>
        <td>${a.modelo}</td>
        <td>$${a.precioBase}</td>
        <td>${a.ofertaGanadora || "-"}</td>
        <td>${a.estado}</td>
      </tr>`;
      tbody.innerHTML += row;
    });
}

if (document.getElementById("sellerAuctions")) {
  cargarSubastasVendedor();
}

// === MENÚ DINÁMICO ===
function actualizarMenu() {
  const menu = document.getElementById("menu");
  if (!menu) return;

  const user = JSON.parse(localStorage.getItem("user"));

  if (user) {
    if (user.role === "comprador") {
      menu.innerHTML = `
        <a href="index.html">Inicio</a>
        <a href="account.html">Mi perfil</a>
        <button onclick="logout()">Cerrar sesión</button>
      `;
    } else if (user.role === "vendedor") {
      menu.innerHTML = `
        <a href="index.html">Inicio</a>
        <a href="account-vendedor.html">Mi perfil (Vendedor)</a>
        <button onclick="logout()">Cerrar sesión</button>
      `;
    }
  } else {
    menu.innerHTML = `
      <a href="login.html">Soy Comprador</a>
      <a href="login-vendedor.html">Soy vendedor</a>
    `;
  }
}

// Ejecutar siempre
actualizarMenu();

// === PROTECCIÓN DE RUTAS ===
function protegerRutaComprador() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || user.role !== "comprador") {
    alert("Acceso denegado. Inicia sesión como comprador.");
    window.location.href = "login.html";
  }
}

function protegerRutaVendedor() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || user.role !== "vendedor") {
    alert("Acceso denegado. Inicia sesión como vendedor.");
    window.location.href = "login-vendedor.html";
  }
}



//subir foto
if (auctionForm) {
  auctionForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || user.role !== "vendedor") {
      alert("Debes iniciar sesión como vendedor.");
      window.location.href = "login-vendedor.html";
      return;
    }

    const formData = new FormData(auctionForm);
    formData.append("vendedorId", user.id);

    const res = await fetch(`${API_URL}/auctions/create`, {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    if (data.auction) {
      alert("Subasta creada con éxito.");
      cargarSubastasVendedor();
      auctionForm.reset();
    } else {
      alert("Error: " + data.error);
    }
  });
}

// === MOSTRAR PERFIL DEL VENDEDOR ===
function cargarPerfilVendedor() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user && user.role === "vendedor") {
    document.getElementById("vendorEmail").innerText = user.email;
    document.getElementById("vendorCode").innerText = user.vendorCode || "No asignado";
  }
}

// === CAMBIO DE CONTRASEÑA ===
const changePasswordForm = document.getElementById("changePasswordForm");
if (changePasswordForm) {
  changePasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById("newPassword").value;
    const user = JSON.parse(localStorage.getItem("user"));

    const res = await fetch(`${API_URL}/users/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, newPassword })
    });

    const data = await res.json();
    if (data.message) {
      alert(data.message);
      changePasswordForm.reset();
    } else {
      alert("Error: " + data.error);
    }
  });
}

// === TABS DINÁMICAS ===
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});

// Cargar perfil si existe
if (document.getElementById("perfil")) {
  cargarPerfilVendedor();
}


// === LOGOUT ===
function logout() {
  localStorage.removeItem("user");
  alert("Sesión cerrada");
  window.location.href = "index.html";
}

// Ejecutar según página
if (document.getElementById("auctions")) cargarSubastas();
if (document.getElementById("auctionDetail")) cargarDetalle();
