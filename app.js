
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

/* CONFIGURACIÓN FIREBASE */

const firebaseConfig = {
  apiKey: "AIzaSyBhSKeja_c0F51t1u9YohHwsEnvZpyO7WE",
  authDomain: "caladium-joyeria.firebaseapp.com",
  projectId: "caladium-joyeria",
  storageBucket: "caladium-joyeria.firebasestorage.app",
  messagingSenderId: "248961385280",
  appId: "1:248961385280:web:1fbdc83c52f209fc6430a5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_UID = "ULkrc4fyDSbATCPrOnfWW8kvM1n2";
const WHATSAPP_NUMBER = "5492284320153";

/* CONFIGURACIÓN CLOUDINARY */

const CLOUDINARY_CLOUD_NAME = "zcg0cygj";
const CLOUDINARY_UPLOAD_PRESET = "caladium_upload";

const CLOUDINARY_URL =
  `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/* DATOS INICIALES */

const images = {
  Collares: "assets/referencia.png",
  Aros: "assets/referencia.png",
  Pulseras: "assets/referencia.png",
  Anillos: "assets/referencia.png"
};

const defaultProducts = [
  {
    id: "1",
    name: "Collar Flor",
    category: "Collares",
    price: 18500,
    description: "Flor natural preservada en resina.",
    image: images.Collares,
    available: true
  },
  {
    id: "2",
    name: "Aros Botánicos",
    category: "Aros",
    price: 14500,
    description: "Pequeños detalles de naturaleza.",
    image: images.Aros,
    available: true
  },
  {
    id: "3",
    name: "Pulsera Silvestre",
    category: "Pulseras",
    price: 16900,
    description: "Flores naturales y detalles dorados.",
    image: images.Pulseras,
    available: true
  },
  {
    id: "4",
    name: "Anillo Botánico",
    category: "Anillos",
    price: 12500,
    description: "Una pequeña pieza de naturaleza.",
    image: images.Anillos,
    available: true
  }
];

/* VARIABLES */

function loadData(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

let products = [];
let flowers = [];
let cart = loadData("caladium_cart", []);
let activeFilter = "Todos";
let currentUser = null;

const $ = id => document.getElementById(id);

function money(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function notify(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

function saveCart() {
  localStorage.setItem("caladium_cart", JSON.stringify(cart));
}

/* FIRESTORE: CATÁLOGO COMPARTIDO */

function startCatalogListeners() {
  onSnapshot(collection(db, "products"), snapshot => {
    products = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    renderProducts();
    renderCart();

    if (currentUser?.uid === ADMIN_UID) {
      renderAdminProducts();
    }
  }, error => {
    console.error("Error leyendo productos:", error);
    notify("No se pudieron cargar las joyas.");
  });

  onSnapshot(collection(db, "flowers"), snapshot => {
    flowers = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    renderFlowers();

    if (currentUser?.uid === ADMIN_UID) {
      renderAdminFlowers();
    }
  }, error => {
    console.error("Error leyendo flores:", error);
    notify("No se pudieron cargar las flores.");
  });
}

/* MIGRAR DATOS ANTERIORES UNA SOLA VEZ SI FIRESTORE ESTÁ VACÍO */

async function migrateLocalCatalogIfNeeded() {
  try {
    const productSnapshot = await getDocs(collection(db, "products"));

    if (productSnapshot.empty) {
      const oldProducts = loadData("caladium_products", null);
      const productsToSave = oldProducts?.length
        ? oldProducts
        : defaultProducts;

      for (const product of productsToSave) {
        const { id, ...data } = product;
        await setDoc(doc(db, "products", String(id)), data);
      }
    }

    const flowerSnapshot = await getDocs(collection(db, "flowers"));

    if (flowerSnapshot.empty) {
      const oldFlowers = loadData("caladium_flowers", []);

      for (const flower of oldFlowers) {
        const { id, ...data } = flower;
        await setDoc(doc(db, "flowers", String(id)), data);
      }
    }
  } catch (error) {
    console.error("Error migrando catálogo:", error);
    notify("No se pudieron importar los datos anteriores.");
  }
}

/* SUBIR FOTOGRAFÍAS A CLOUDINARY */

async function uploadImage(file) {
  if (!file) return "";

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Elegí una imagen JPG, PNG o WEBP.");
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error("La imagen no puede superar los 8 MB.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "caladium");

  const response = await fetch(CLOUDINARY_URL, {
    method: "POST",
    body: formData
  });

  const result = await response.json();

  if (!response.ok || !result.secure_url) {
    console.error("Error Cloudinary:", result);
    throw new Error(
      result.error?.message || "No se pudo subir la fotografía."
    );
  }

  return result.secure_url;
}

function selectedFile(inputId) {
  return $(inputId).files?.[0] || null;
}

/* FLORES DISPONIBLES */

function renderFlowers() {
  const grid = $("flowerGrid");

  const availableFlowers = flowers.filter(flower => flower.available);
  const unavailableFlowers = flowers.filter(flower => !flower.available);

  const orderedFlowers = [
    ...availableFlowers,
    ...unavailableFlowers
  ];

  grid.innerHTML = orderedFlowers.map(flower => `
    <article class="flower-card">
      <div class="flower-image">
        ${
          flower.image
            ? `<img src="${safe(flower.image)}" alt="${safe(flower.name)}" loading="lazy">`
            : `<div class="flower-image-placeholder">✿</div>`
        }
      </div>

      <div class="flower-info">
        <h3>${safe(flower.name)}</h3>

        <p class="flower-size">
          Tamaño aproximado: ${safe(flower.size)}
        </p>

        ${
          flower.description
            ? `<p class="flower-description">${safe(flower.description)}</p>`
            : ""
        }

        <span class="flower-status ${flower.available ? "available" : "unavailable"}">
          ${flower.available ? "Disponible" : "No disponible"}
        </span>

        ${
          flower.available
            ? `<button class="flower-choice-button" type="button"
                data-choose-flower="${safe(flower.id)}">
                Elegir para mi creación
              </button>`
            : ""
        }
      </div>
    </article>
  `).join("");
}

$("flowerGrid").addEventListener("click", event => {
  const button = event.target.closest("[data-choose-flower]");
  if (!button) return;

  const flower = flowers.find(
    item => item.id === button.dataset.chooseFlower
  );

  if (!flower || !flower.available) return;

  const message =
    `¡Hola, Caladium! 🌸 Me interesa utilizar la flor "${flower.name}"` +
    ` (tamaño aproximado: ${flower.size}) para una creación personalizada.` +
    ` ¿Podemos conversar sobre las opciones?`;

  sendWhatsApp(message);
});

/* PRODUCTOS */

function renderProducts() {
  const visible = products.filter(product =>
    activeFilter === "Todos" ||
    product.category === activeFilter
  );

  $("productGrid").innerHTML = visible.length
    ? visible.map(product => `
      <article class="product-card">
        <div class="product-image">
          ${
            product.image
              ? `<img src="${safe(product.image)}" alt="${safe(product.name)}" loading="lazy">`
              : `<div class="flower-image-placeholder">✿</div>`
          }
        </div>

        <div class="product-info">
          <h3>${safe(product.name)}</h3>
          <p>${safe(product.description)}</p>

          <div class="product-bottom">
            <span class="price">${money(product.price)}</span>

            ${
              product.available
                ? `<button class="add-button" data-add="${safe(product.id)}">
                    Agregar al carrito +
                   </button>`
                : `<span class="unavailable">No disponible</span>`
            }
          </div>
        </div>
      </article>
    `).join("")
    : `<p class="empty-state">Próximamente nuevas piezas de esta colección.</p>`;

  $("productsTitle").textContent =
    activeFilter === "Todos"
      ? "Piezas disponibles"
      : activeFilter;
}

/* FILTROS */

function filterProducts(category) {
  activeFilter = category;

  document.querySelectorAll("[data-filter]").forEach(button => {
    button.classList.toggle(
      "selected",
      button.dataset.filter === category
    );
  });

  renderProducts();

  $("productos").scrollIntoView({
    behavior: "smooth"
  });
}

document.querySelectorAll("[data-filter]").forEach(button => {
  button.addEventListener("click", () => {
    filterProducts(button.dataset.filter);
  });
});

/* CARRITO */

function addToCart(id) {
  const product = products.find(item => item.id === id);

  if (!product || !product.available) return;

  const existing = cart.find(item => item.id === id);

  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ id, quantity: 1 });
  }

  renderCart();
  notify("Producto agregado al carrito");
}

function renderCart() {
  cart = cart.filter(item => item.quantity > 0);

  const count = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  $("cartCount").textContent = count;

  const validCart = cart.filter(item =>
    products.some(product => product.id === item.id)
  );

  $("cartItems").innerHTML = validCart.length
    ? validCart.map(item => {
        const product = products.find(p => p.id === item.id);

        return `
          <div class="cart-row">
            ${
              product.image
                ? `<img src="${safe(product.image)}" alt="">`
                : ""
            }

            <div>
              <h4>${safe(product.name)}</h4>
              <small>${money(product.price)} c/u</small>

              <div class="quantity-controls">
                <button data-change="${safe(product.id)}"
                  data-value="-1" aria-label="Restar">−</button>

                <span>${item.quantity}</span>

                <button data-change="${safe(product.id)}"
                  data-value="1" aria-label="Sumar">+</button>
              </div>
            </div>

            <div>
              <strong>${money(product.price * item.quantity)}</strong>
              <button class="remove-item"
                data-remove="${safe(product.id)}">Quitar</button>
            </div>
          </div>
        `;
      }).join("")
    : `<p class="empty-state">Tu carrito está vacío ♡</p>`;

  const total = validCart.reduce((sum, item) => {
    const product = products.find(p => p.id === item.id);
    return sum + product.price * item.quantity;
  }, 0);

  $("cartTotal").textContent = money(total);
  saveCart();
}

$("productGrid").addEventListener("click", event => {
  const button = event.target.closest("[data-add]");
  if (button) addToCart(button.dataset.add);
});

$("cartItems").addEventListener("click", event => {
  const change = event.target.closest("[data-change]");
  const remove = event.target.closest("[data-remove]");

  if (change) {
    const item = cart.find(i => i.id === change.dataset.change);

    if (item) {
      item.quantity += Number(change.dataset.value);

      if (item.quantity <= 0) {
        cart = cart.filter(i => i.id !== item.id);
      }
    }

    renderCart();
  }

  if (remove) {
    cart = cart.filter(item => item.id !== remove.dataset.remove);
    renderCart();
  }
});

/* ABRIR Y CERRAR CARRITO */

function openCart() {
  $("cartDrawer").classList.add("open");
  $("overlay").classList.add("show");
}

function closeCart() {
  $("cartDrawer").classList.remove("open");
  $("overlay").classList.remove("show");
}

$("openCart").addEventListener("click", openCart);
$("closeCart").addEventListener("click", closeCart);
$("overlay").addEventListener("click", closeCart);

/* WHATSAPP */

function sendWhatsApp(message) {
  const url =
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  window.open(url, "_blank", "noopener,noreferrer");
}

$("checkout").addEventListener("click", () => {
  if (!cart.length) {
    notify("Tu carrito está vacío");
    return;
  }

  const lines = cart.map(item => {
    const product = products.find(p => p.id === item.id);

    return product
      ? `• ${product.name} x ${item.quantity} — ${money(product.price * item.quantity)}`
      : "";
  }).filter(Boolean);

  const total = cart.reduce((sum, item) => {
    const product = products.find(p => p.id === item.id);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);

  const message =
    `¡Hola, Caladium! Quiero realizar este pedido:\n\n` +
    lines.join("\n") +
    `\n\nTotal: ${money(total)}` +
    `\n\n¿Me indican cómo seguimos con el pago y el envío?`;

  sendWhatsApp(message);
});

$("whatsappHeader").addEventListener("click", event => {
  event.preventDefault();
  sendWhatsApp("¡Hola! Quisiera consultar por las joyas y flores de Caladium.");
});

$("whatsappContact").addEventListener("click", event => {
  event.preventDefault();
  sendWhatsApp("¡Hola! Quisiera consultar por las joyas y flores de Caladium.");
});

/* CONTACTO DESPLEGABLE */

const contactToggle = $("contactToggle");
const contactDropdown = $("contactDropdown");
const navContact = $("navContact");

function closeContactDropdown() {
  contactDropdown.hidden = true;
  contactToggle.setAttribute("aria-expanded", "false");
  navContact.classList.remove("open");
}

contactToggle.addEventListener("click", event => {
  event.stopPropagation();

  const willOpen = contactDropdown.hidden;
  contactDropdown.hidden = !willOpen;

  contactToggle.setAttribute("aria-expanded", String(willOpen));
  navContact.classList.toggle("open", willOpen);
});

document.addEventListener("click", event => {
  if (!navContact.contains(event.target)) {
    closeContactDropdown();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeContactDropdown();
});

/* ADMINISTRACIÓN: FIREBASE AUTH */

function openAdmin() {
  $("adminModal").classList.add("show");

  if (currentUser?.uid === ADMIN_UID) {
    showAdminPanel();
  } else {
    $("adminLogin").hidden = false;
    $("adminPanel").hidden = true;
    $("adminEmail").value = "";
    $("adminPassword").value = "";
    $("loginMessage").textContent = "";
  }
}

function showAdminPanel() {
  $("adminLogin").hidden = true;
  $("adminPanel").hidden = false;

  renderAdminFlowers();
  renderAdminProducts();
}

$("adminOpen").addEventListener("click", openAdmin);

$("closeAdmin").addEventListener("click", () => {
  $("adminModal").classList.remove("show");
});

async function loginAdmin() {
  const email = $("adminEmail").value.trim();
  const password = $("adminPassword").value;

  $("loginMessage").textContent = "";

  if (!email || !password) {
    $("loginMessage").textContent = "Ingresá tu correo y contraseña.";
    return;
  }

  $("loginButton").disabled = true;
  $("loginButton").textContent = "Ingresando...";

  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    if (credential.user.uid !== ADMIN_UID) {
      await signOut(auth);
      $("loginMessage").textContent = "No tenés permisos de administración.";
      return;
    }

    await migrateLocalCatalogIfNeeded();
    showAdminPanel();
  } catch (error) {
    console.error(error);

    $("loginMessage").textContent =
      "No se pudo iniciar sesión. Revisá el correo y la contraseña.";
  } finally {
    $("loginButton").disabled = false;
    $("loginButton").textContent = "Ingresar";
  }
}

$("loginButton").addEventListener("click", loginAdmin);

$("adminPassword").addEventListener("keydown", event => {
  if (event.key === "Enter") loginAdmin();
});

$("adminEmail").addEventListener("keydown", event => {
  if (event.key === "Enter") loginAdmin();
});

onAuthStateChanged(auth, user => {
  currentUser = user;

  if (user?.uid === ADMIN_UID && $("adminModal").classList.contains("show")) {
    showAdminPanel();
  } else if (!user && $("adminModal").classList.contains("show")) {
    $("adminLogin").hidden = false;
    $("adminPanel").hidden = true;
  }
});

/* ADMINISTRAR FLORES */

function renderAdminFlowers() {
  $("adminFlowers").innerHTML = flowers.length
    ? flowers.map(flower => `
      <div class="admin-product-row">
        <div>
          <strong>${safe(flower.name)}</strong>
          <br>
          <small>
            Tamaño: ${safe(flower.size)}
            · ${flower.available ? "Disponible" : "No disponible"}
          </small>
        </div>

        <div>
          <button type="button" data-edit-flower="${safe(flower.id)}">Editar</button>
          <button type="button" data-delete-flower="${safe(flower.id)}">Eliminar</button>
        </div>
      </div>
    `).join("")
    : `<p class="empty-state">Todavía no cargaste flores.</p>`;
}

function clearFlowerForm() {
  $("flowerForm").reset();
  $("flowerId").value = "";
  $("flowerAvailable").checked = true;
  $("flowerImageName").textContent = "Ninguna fotografía seleccionada";
}

$("flowerForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (currentUser?.uid !== ADMIN_UID) {
    notify("No tenés permisos para realizar esta acción.");
    return;
  }

  const button = $("flowerForm").querySelector('[type="submit"]');
  button.disabled = true;
  button.textContent = "Guardando...";

  try {
    const id = $("flowerId").value || String(Date.now());
    const existing = flowers.find(item => item.id === id);
    const file = selectedFile("flowerImage");

    let image = existing?.image || "";

    if (file) {
      $("flowerImageName").textContent = "Subiendo fotografía...";
      image = await uploadImage(file);
    }

    const flower = {
      name: $("flowerName").value.trim(),
      size: $("flowerSize").value.trim(),
      image,
      description: $("flowerDescription").value.trim(),
      available: $("flowerAvailable").checked
    };

    if (!flower.name || !flower.size) {
      notify("Completá el nombre y el tamaño de la flor.");
      return;
    }

    await setDoc(doc(db, "flowers", id), flower);

    clearFlowerForm();
    notify("Flor guardada correctamente.");
  } catch (error) {
    console.error(error);
    notify(error.message || "No se pudo guardar la flor.");
  } finally {
    button.disabled = false;
    button.textContent = "Guardar flor";
  }
});

$("adminFlowers").addEventListener("click", async event => {
  const edit = event.target.closest("[data-edit-flower]");
  const remove = event.target.closest("[data-delete-flower]");

  if (edit) {
    const flower = flowers.find(item => item.id === edit.dataset.editFlower);
    if (!flower) return;

    $("flowerId").value = flower.id;
    $("flowerName").value = flower.name;
    $("flowerSize").value = flower.size;
    $("flowerImage").value = "";
    $("flowerImageName").textContent = flower.image
      ? "Ya tiene una fotografía. Seleccioná otra solo si querés reemplazarla."
      : "Ninguna fotografía seleccionada";
    $("flowerDescription").value = flower.description || "";
    $("flowerAvailable").checked = flower.available;

    $("flowerName").focus();
    $("flowerForm").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (remove && confirm("¿Eliminar esta flor?")) {
    try {
      await deleteDoc(doc(db, "flowers", remove.dataset.deleteFlower));
      clearFlowerForm();
      notify("Flor eliminada.");
    } catch (error) {
      console.error(error);
      notify("No se pudo eliminar la flor.");
    }
  }
});

$("clearFlowerForm").addEventListener("click", clearFlowerForm);

/* ADMINISTRAR JOYAS */

function renderAdminProducts() {
  $("adminProducts").innerHTML = products.length
    ? products.map(product => `
      <div class="admin-product-row">
        <div>
          <strong>${safe(product.name)}</strong>
          <br>
          <small>
            ${safe(product.category)} · ${money(product.price)}
            · ${product.available ? "Disponible" : "No disponible"}
          </small>
        </div>

        <div>
          <button type="button" data-edit="${safe(product.id)}">Editar</button>
          <button type="button" data-delete="${safe(product.id)}">Eliminar</button>
        </div>
      </div>
    `).join("")
    : `<p class="empty-state">Todavía no cargaste joyas.</p>`;
}

function clearForm() {
  $("productForm").reset();
  $("productId").value = "";
  $("productAvailable").checked = true;
  $("productImageName").textContent = "Ninguna fotografía seleccionada";
}

$("productForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (currentUser?.uid !== ADMIN_UID) {
    notify("No tenés permisos para realizar esta acción.");
    return;
  }

  const button = $("productForm").querySelector('[type="submit"]');
  button.disabled = true;
  button.textContent = "Guardando...";

  try {
    const id = $("productId").value || String(Date.now());
    const existing = products.find(item => item.id === id);
    const category = $("productCategory").value;
    const file = selectedFile("productImage");

    let image = existing?.image || images[category];

    if (file) {
      $("productImageName").textContent = "Subiendo fotografía...";
      image = await uploadImage(file);
    }

    const product = {
      name: $("productName").value.trim(),
      category,
      price: Number($("productPrice").value),
      image,
      description: $("productDescription").value.trim(),
      available: $("productAvailable").checked
    };

    if (!product.name || !Number.isFinite(product.price) || product.price < 0) {
      notify("Revisá el nombre y el precio.");
      return;
    }

    await setDoc(doc(db, "products", id), product);

    clearForm();
    notify("Producto guardado correctamente.");
  } catch (error) {
    console.error(error);
    notify(error.message || "No se pudo guardar el producto.");
  } finally {
    button.disabled = false;
    button.textContent = "Guardar producto";
  }
});

$("adminProducts").addEventListener("click", async event => {
  const edit = event.target.closest("[data-edit]");
  const remove = event.target.closest("[data-delete]");

  if (edit) {
    const product = products.find(p => p.id === edit.dataset.edit);
    if (!product) return;

    $("productId").value = product.id;
    $("productName").value = product.name;
    $("productCategory").value = product.category;
    $("productPrice").value = product.price;
    $("productImage").value = "";
    $("productImageName").textContent = product.image
      ? "Ya tiene una fotografía. Seleccioná otra solo si querés reemplazarla."
      : "Ninguna fotografía seleccionada";
    $("productDescription").value = product.description || "";
    $("productAvailable").checked = product.available;

    $("productName").focus();
    $("productForm").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (remove && confirm("¿Eliminar este producto?")) {
    try {
      const id = remove.dataset.delete;

      await deleteDoc(doc(db, "products", id));

      cart = cart.filter(item => item.id !== id);
      saveCart();
      renderCart();

      notify("Producto eliminado.");
    } catch (error) {
      console.error(error);
      notify("No se pudo eliminar el producto.");
    }
  }
});

$("clearForm").addEventListener("click", clearForm);

$("logout").addEventListener("click", async () => {
  try {
    await signOut(auth);
    $("adminLogin").hidden = false;
    $("adminPanel").hidden = true;
    $("adminEmail").value = "";
    $("adminPassword").value = "";
    notify("Sesión cerrada.");
  } catch (error) {
    console.error(error);
    notify("No se pudo cerrar la sesión.");
  }
});

/* NOMBRE DE FOTOGRAFÍAS SELECCIONADAS */

$("flowerImage").addEventListener("change", () => {
  $("flowerImageName").textContent =
    selectedFile("flowerImage")?.name || "Ninguna fotografía seleccionada";
});

$("productImage").addEventListener("change", () => {
  $("productImageName").textContent =
    selectedFile("productImage")?.name || "Ninguna fotografía seleccionada";
});

/* MENÚ CELULAR */

const menuToggle = $("menuToggle");
const navigation = $("navigation");

function closeMobileMenu() {
  navigation.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Abrir menú");
  closeContactDropdown();
}

menuToggle.addEventListener("click", () => {
  const isOpen = navigation.classList.toggle("open");

  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute(
    "aria-label",
    isOpen ? "Cerrar menú" : "Abrir menú"
  );

  if (!isOpen) closeContactDropdown();
});

document.querySelectorAll("#navigation > a").forEach(link => {
  link.addEventListener("click", closeMobileMenu);
});

document.querySelectorAll(".contact-dropdown-link").forEach(link => {
  link.addEventListener("click", () => {
    if (window.matchMedia("(max-width: 760px)").matches) {
      closeMobileMenu();
    }
    closeContactDropdown();
  });
});

/* BUSCADOR */

$("searchButton").addEventListener("click", () => {
  const search = prompt("¿Qué joya o flor estás buscando?");
  if (!search) return;

  const term = search.toLowerCase().trim();

  const product = products.find(p =>
    p.name.toLowerCase().includes(term) ||
    p.category.toLowerCase().includes(term)
  );

  if (product) {
    filterProducts(product.category);
    return;
  }

  const flower = flowers.find(f =>
    f.name.toLowerCase().includes(term)
  );

  if (flower) {
    $("flores").scrollIntoView({ behavior: "smooth" });
    return;
  }

  notify("No encontramos esa joya o flor.");
});

/* INICIO */

$("year").textContent = new Date().getFullYear();

startCatalogListeners();
renderCart();
