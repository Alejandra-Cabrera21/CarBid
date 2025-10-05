// === CONFIGURACIÓN DE API ===
const API_URL = "https://carbid-rvqj.onrender.com"; // tu URL en Render



function verSubasta(id) {
  window.location.href = `auction-detail.html?id=${id}`;
}

// === HOME: cargar subastas con imagen ===
async function cargarSubastas() {
  const res = await fetch(`${API_URL}/auctions`);
  const data = await res.json();
  const container = document.getElementById("auctions");
  if (!container) return;

  container.innerHTML = "";

  data.forEach(auction => {
    const card = document.createElement("div");
    card.className = "card";

    // URL completa de la imagen
    const imageUrl = auction.imagen
      ? `${API_URL}${auction.imagen}`
      : "https://via.placeholder.com/300x200?text=Sin+imagen";

    card.innerHTML = `
      <div style="border:1px solid #ddd; border-radius:10px; padding:15px; margin:10px; box-shadow:0 2px 6px rgba(0,0,0,0.15); max-width:300px;">
        <img src="${imageUrl}" alt="Imagen del vehículo" style="width:100%; height:200px; object-fit:cover; border-radius:8px; margin-bottom:10px;">
        <h2 style="font-size:18px; color:#002060;">${auction.modelo}</h2>
        <p>${auction.descripcion || "Sin descripción"}</p>
        <p><strong>Precio base:</strong> $${auction.precioBase}</p>
        <p><strong>Oferta más alta:</strong> $${auction.ofertaGanadora || "-"}</p>
        <p><strong>Estado:</strong> ${auction.estado}</p>
        <button style="background-color:#1E40AF;color:white;padding:8px 12px;border:none;border-radius:6px;cursor:pointer" onclick="verSubasta(${auction.id})">Ver subasta</button>
      </div>
    `;
    container.appendChild(card);
  });
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

async function cargarSubastas() {
  try {
    const res = await fetch(`${API_URL}/auctions`);
    const data = await res.json();

    const container = document.getElementById("auctionList");
    if (!container) return;

    container.innerHTML = "";

    data.forEach(auction => {
      const imagenURL = auction.imagen 
        ? auction.imagen   // ✅ Usa la URL completa desde Cloudinary
        : "https://via.placeholder.com/300x200?text=Sin+imagen"; // fallback

      const card = `
        <div class="auction-card">
          <img src="${imagenURL}" alt="Imagen del vehículo">
          <h3>${auction.modelo}</h3>
          <p>${auction.descripcion}</p>
          <p><strong>Precio base:</strong> $${auction.precioBase}</p>
          <p><strong>Oferta más alta:</strong> $${auction.ofertaMasAlta || '-'}</p>
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
      // 🔹 Aquí se guarda correctamente el rol
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: data.id,
          email: data.email,
          role: "comprador"
        })
      );
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
      // 🔹 Igual aquí
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: data.id,
          email: data.email,
          role: "comprador"
        })
      );
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
    if (data.id) {
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: data.id,
          email: data.email,
          role: "vendedor",
          vendorCode: data.vendorCode
        })
      );
      alert(`Cuenta de vendedor creada con éxito. Tu código es: ${data.vendorCode}`);
      window.location.href = "login-vendedor.html";
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
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: data.id,
          email: data.email,
          role: "vendedor",
          vendorCode: data.vendorCode
        })
      );
      alert(`Bienvenido vendedor ${data.email}`);
      window.location.href = "account-vendedor.html";
    } else {
      alert("Error: " + data.error);
    }
  });
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
    .filter(a => a.vendedorId === user.id)
    .forEach(a => {
      const row = `<tr>
        <td>${a.modelo}</td>
        <td>$${a.precioBase}</td>
        <td>${a.ofertaGanadora || "-"}</td>
        <td>${a.estado}</td>
        <td>${a.imagen ? `<img src="${a.imagen}" alt="${a.modelo}" width="100" style="border-radius:8px;">` : "Sin imagen"}</td>
        <td><button onclick="verSubasta(${a.id})">Ver Detalle</button></td>
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
        <a href="historial-comprador.html">Historial de Pujes</a>
        <a href="perfil-comprador.html">Mi Perfil</a>
        <button onclick="logout()">Cerrar sesión</button>
      `;
    } else if (user.role === "vendedor") {
      menu.innerHTML = `
        <a href="index.html">Inicio</a>
        <a href="account-vendedor.html">Mi perfil</a>
        <button onclick="logout()">Cerrar sesión</button>
      `;
    }
  } else {
    menu.innerHTML = `
      <a href="login.html">Soy Comprador</a>
      <a href="login-vendedor.html">Soy Vendedor</a>
    `;
  }
}

// Ejecutar siempre
actualizarMenu();

// ====== HISTORIAL DE PUJAS (COMPRADOR) ======

// Utilidad segura para leer el usuario del localStorage
function getUserFromStorage() {
  try { return JSON.parse(localStorage.getItem("user")); }
  catch { return null; }
}

// Pinta un mensaje en la tabla sin esconderla
function paintHistoryMessage(msg) {
  const tbody = document.getElementById("historyTable");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:14px;">${msg}</td></tr>`;
}

// Carga y pinta el historial
async function cargarHistorialComprador(idUsuario) {
  const tbody = document.getElementById("historyTable");
  if (!tbody) return;

  paintHistoryMessage("Cargando historial…");

  try {
    const res = await fetch(`${API_URL}/users/historial/${idUsuario}`, { cache: "no-store" });
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      paintHistoryMessage("Aún no has realizado pujas.");
      return;
    }

    tbody.innerHTML = data.map(item => {
      const a = item.Auction || {};
      const modelo = a.modelo || "Vehículo";
      const monto = typeof item.monto === "number" ? `$${item.monto}` : "-";
      const ganadora = (typeof a.ofertaGanadora === "number") ? `$${a.ofertaGanadora}` : "-";
      const resultado = item.ganada ? "Ganada" : "Perdida";
      const estado = a.estado || "-";
      const fecha = a.fechaCierre ? new Date(a.fechaCierre).toLocaleDateString() : "-";

      return `<tr>
        <td>${modelo}</td>
        <td>${monto}</td>
        <td>${ganadora}</td>
        <td>${resultado}</td>
        <td>${estado}</td>
        <td>${fecha}</td>
      </tr>`;
    }).join("");
  } catch (err) {
    console.error("Error cargando historial:", err);
    paintHistoryMessage("No se pudo cargar tu historial. Intenta de nuevo.");
  }
}

// Protección estable para la página de historial
async function initHistorialCompradorPage() {
  const tbody = document.getElementById("historyTable");
  if (!tbody) return; // No estamos en la página de historial

  // Muestra algo desde el principio
  paintHistoryMessage("Preparando página…");

  const user = getUserFromStorage();
  if (!user) {
    paintHistoryMessage('⚠️ Debes iniciar sesión como comprador. <a href="login.html">Ir a iniciar sesión</a>');
    // Si quieres redirigir después de mostrar el mensaje:
    // setTimeout(() => location.href = "login.html", 1500);
    return;
  }

  if (user.role !== "comprador") {
    paintHistoryMessage('🚫 Esta vista es solo para compradores. <a href="index.html">Volver al inicio</a>');
    return;
  }

  await cargarHistorialComprador(user.id);
}

// Ejecuta una única vez cuando el DOM está listo
document.addEventListener("DOMContentLoaded", () => {
  initHistorialCompradorPage();
});






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

// === MOSTRAR PERFIL (COMPRADOR O VENDEDOR) ===
document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return;

  // PERFIL DEL COMPRADOR
  if (document.getElementById("userEmail") && user.role === "comprador") {
    document.getElementById("userEmail").textContent = user.email;
  }

  // PERFIL DEL VENDEDOR
  if (document.getElementById("vendorEmail") && user.role === "vendedor") {
    document.getElementById("vendorEmail").textContent = user.email;
    document.getElementById("vendorCode").textContent = user.vendorCode || "No asignado";
  }
});


// === CAMBIO DE CONTRASEÑA ===
const changePasswordForm = document.getElementById("changePasswordForm");

if (changePasswordForm) {
  changePasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = JSON.parse(localStorage.getItem("user"));
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;

    const res = await fetch(`${API_URL}/users/change-password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, currentPassword, newPassword })
    });

    const data = await res.json();
    alert(data.message || data.error);
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

// === DETALLE DE SUBASTA (con imagen desde Cloudinary) ===
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
        <img src="${imgSrc}" alt="Imagen del vehículo" class="auction-image"/>
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


// === LOGOUT ===
function logout() {
  localStorage.removeItem("user");
  alert("Sesión cerrada");
  window.location.href = "index.html";
}

// Ejecutar según página
if (document.getElementById("auctions")) cargarSubastas();
if (document.getElementById("auctionDetail")) cargarDetalle();
