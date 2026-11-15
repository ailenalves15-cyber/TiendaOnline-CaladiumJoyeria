
const WHATSAPP_NUMBER = "5492284320153";
const ADMIN_PIN = "1930";

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

/* DATOS */

function loadData(key, fallback) {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    return data ?? fallback;
  } catch {
    return fallback;
  }
}

let products = loadData("caladium_products", defaultProducts);
let flowers = loadData("caladium_flowers", []);
let cart = loadData("caladium_cart", []);
let activeFilter = "Todos";

const $ = id => document.getElementById(id);

function money(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function saveData() {
  localStorage.setItem("caladium_products", JSON.stringify(products));
  localStorage.setItem("caladium_flowers", JSON.stringify(flowers));
  localStorage.setItem("caladium_cart", JSON.stringify(cart));
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
  }, 2200);
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
            ? `<button
                class="flower-choice-button"
                type="button"
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
          <img src="${safe(product.image)}" alt="${safe(product.name)}" loading="lazy">
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
  const product = products.find(p => p.id === id);

  if (!product || !product.available) return;

  const existing = cart.find(item => item.id === id);

  if (existing) {
    existing.quantity++;
  } else {
    cart.push({
      id,
      quantity: 1
    });
  }

  renderCart();
  notify("Producto agregado al carrito");
}

function renderCart() {
  const count = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  $("cartCount").textContent = count;

  $("cartItems").innerHTML = cart.length
    ? cart.map(item => {

        const product = products.find(p => p.id === item.id);

        if (!product) return "";

        return `
          <div class="cart-row">

            <img src="${safe(product.image)}" alt="">

            <div>
              <h4>${safe(product.name)}</h4>

              <small>${money(product.price)} c/u</small>

              <div class="quantity-controls">

                <button
                  data-change="${safe(product.id)}"
                  data-value="-1"
                  aria-label="Restar">−</button>

                <span>${item.quantity}</span>

                <button
                  data-change="${safe(product.id)}"
                  data-value="1"
                  aria-label="Sumar">+</button>

              </div>
            </div>

            <div>
              <strong>${money(product.price * item.quantity)}</strong>

              <button class="remove-item" data-remove="${safe(product.id)}">
                Quitar
              </button>
            </div>

          </div>
        `;

      }).join("")
    : `<p class="empty-state">Tu carrito está vacío ♡</p>`;

  const total = cart.reduce((sum, item) => {
    const product = products.find(p => p.id === item.id);

    return sum + (
      product
        ? product.price * item.quantity
        : 0
    );
  }, 0);

  $("cartTotal").textContent = money(total);

  saveData();
}

$("productGrid").addEventListener("click", event => {
  const button = event.target.closest("[data-add]");

  if (button) {
    addToCart(button.dataset.add);
  }
});

$("cartItems").addEventListener("click", event => {

  const change = event.target.closest("[data-change]");
  const remove = event.target.closest("[data-remove]");

  if (change) {

    const item = cart.find(
      i => i.id === change.dataset.change
    );

    if (item) {
      item.quantity += Number(change.dataset.value);

      if (item.quantity <= 0) {
        cart = cart.filter(i => i.id !== item.id);
      }
    }

    renderCart();
  }

  if (remove) {
    cart = cart.filter(
      item => item.id !== remove.dataset.remove
    );

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

    return sum + (
      product
        ? product.price * item.quantity
        : 0
    );
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

/* MENÚ DESPLEGABLE CONTACTO */

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

  contactToggle.setAttribute(
    "aria-expanded",
    String(willOpen)
  );

  navContact.classList.toggle("open", willOpen);
});

document.addEventListener("click", event => {
  if (!navContact.contains(event.target)) {
    closeContactDropdown();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeContactDropdown();
  }
});

/* ADMINISTRACIÓN */

function openAdmin() {
  $("adminModal").classList.add("show");

  $("adminLogin").hidden = false;
  $("adminPanel").hidden = true;

  $("adminPin").value = "";
  $("loginMessage").textContent = "";
}

$("adminOpen").addEventListener("click", openAdmin);

$("closeAdmin").addEventListener("click", () => {
  $("adminModal").classList.remove("show");
});

$("loginButton").addEventListener("click", () => {

  if ($("adminPin").value === ADMIN_PIN) {

    $("adminLogin").hidden = true;
    $("adminPanel").hidden = false;

    renderAdminFlowers();
    renderAdminProducts();

  } else {

    $("loginMessage").textContent = "PIN incorrecto.";

  }

});

$("adminPin").addEventListener("keydown", event => {
  if (event.key === "Enter") {
    $("loginButton").click();
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
}

$("flowerForm").addEventListener("submit", event => {

  event.preventDefault();

  const id = $("flowerId").value || String(Date.now());

  const flower = {
    id,
    name: $("flowerName").value.trim(),
    size: $("flowerSize").value.trim(),
    image: $("flowerImage").value.trim(),
    description: $("flowerDescription").value.trim(),
    available: $("flowerAvailable").checked
  };

  if (!flower.name || !flower.size) {
    notify("Completá el nombre y el tamaño de la flor");
    return;
  }

  const index = flowers.findIndex(item => item.id === id);

  if (index >= 0) {
    flowers[index] = flower;
  } else {
    flowers.unshift(flower);
  }

  saveData();
  renderFlowers();
  renderAdminFlowers();
  clearFlowerForm();

  notify("Flor guardada correctamente");

});

$("adminFlowers").addEventListener("click", event => {

  const edit = event.target.closest("[data-edit-flower]");
  const remove = event.target.closest("[data-delete-flower]");

  if (edit) {

    const flower = flowers.find(
      item => item.id === edit.dataset.editFlower
    );

    if (!flower) return;

    $("flowerId").value = flower.id;
    $("flowerName").value = flower.name;
    $("flowerSize").value = flower.size;
    $("flowerImage").value = flower.image || "";
    $("flowerDescription").value = flower.description || "";
    $("flowerAvailable").checked = flower.available;

    $("flowerName").focus();

    $("flowerForm").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  }

  if (remove && confirm("¿Eliminar esta flor?")) {

    flowers = flowers.filter(
      item => item.id !== remove.dataset.deleteFlower
    );

    saveData();
    renderFlowers();
    renderAdminFlowers();
    clearFlowerForm();

    notify("Flor eliminada");

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
}

$("productForm").addEventListener("submit", event => {

  event.preventDefault();

  const id = $("productId").value || String(Date.now());

  const category = $("productCategory").value;

  const product = {

    id,

    name: $("productName").value.trim(),

    category,

    price: Number($("productPrice").value),

    image: $("productImage").value.trim() || images[category],

    description: $("productDescription").value.trim(),

    available: $("productAvailable").checked

  };

  if (!product.name || product.price < 0) {
    notify("Revisá el nombre y el precio");
    return;
  }

  const index = products.findIndex(p => p.id === id);

  if (index >= 0) {
    products[index] = product;
  } else {
    products.unshift(product);
  }

  saveData();
  renderProducts();
  renderAdminProducts();
  clearForm();

  notify("Producto guardado");

});

$("adminProducts").addEventListener("click", event => {

  const edit = event.target.closest("[data-edit]");
  const remove = event.target.closest("[data-delete]");

  if (edit) {

    const product = products.find(
      p => p.id === edit.dataset.edit
    );

    if (!product) return;

    $("productId").value = product.id;
    $("productName").value = product.name;
    $("productCategory").value = product.category;
    $("productPrice").value = product.price;
    $("productImage").value = product.image;
    $("productDescription").value = product.description || "";
    $("productAvailable").checked = product.available;

    $("productName").focus();

    $("productForm").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  }

  if (remove && confirm("¿Eliminar este producto?")) {

    products = products.filter(
      p => p.id !== remove.dataset.delete
    );

    cart = cart.filter(
      item => item.id !== remove.dataset.delete
    );

    saveData();
    renderProducts();
    renderCart();
    renderAdminProducts();

  }

});

$("clearForm").addEventListener("click", clearForm);

$("logout").addEventListener("click", () => {
  $("adminPanel").hidden = true;
  $("adminLogin").hidden = false;
  $("adminPin").value = "";
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

  menuToggle.setAttribute(
    "aria-expanded",
    String(isOpen)
  );

  menuToggle.setAttribute(
    "aria-label",
    isOpen ? "Cerrar menú" : "Abrir menú"
  );

  if (!isOpen) {
    closeContactDropdown();
  }

});

document.querySelectorAll("#navigation > a").forEach(link => {

  link.addEventListener("click", () => {
    closeMobileMenu();
  });

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
    $("flores").scrollIntoView({
      behavior: "smooth"
    });
    return;
  }

  notify("No encontramos esa joya o flor.");
});

/* INICIO */

$("year").textContent = new Date().getFullYear();

renderFlowers();
renderProducts();
renderCart();
