const serviceCards = [...document.querySelectorAll(".service-card")];
const categoryButtons = [...document.querySelectorAll("[data-category]")];
const filterButtons = [...document.querySelectorAll("[data-filter]")];
const searchInput = document.getElementById("searchInput");
const emptyState = document.getElementById("emptyState");
let activeCategory = "All";
let searchTerm = "";

function renderServices() {
  let visible = 0;
  serviceCards.forEach((card) => {
    const categoryMatch = activeCategory === "All" || card.dataset.category === activeCategory;
    const text = (card.dataset.title + " " + card.textContent).toLowerCase();
    const searchMatch = !searchTerm || text.includes(searchTerm);
    const show = categoryMatch && searchMatch;
    card.hidden = !show;
    if (show) visible += 1;
  });
  emptyState.hidden = visible > 0;
  categoryButtons.forEach((button) => button.classList.toggle("active", button.dataset.category === activeCategory));
  filterButtons.forEach((button) => button.classList.toggle("selected", button.dataset.filter === activeCategory));
}

categoryButtons.forEach((button) => button.addEventListener("click", () => {
  activeCategory = button.dataset.category;
  searchTerm = "";
  searchInput.value = "";
  renderServices();
  document.getElementById("explore").scrollIntoView({ behavior: "smooth" });
}));

filterButtons.forEach((button) => button.addEventListener("click", () => {
  activeCategory = button.dataset.filter;
  renderServices();
}));

document.getElementById("searchForm").addEventListener("submit", (event) => {
  event.preventDefault();
  searchTerm = searchInput.value.trim().toLowerCase();
  activeCategory = "All";
  renderServices();
  document.getElementById("explore").scrollIntoView({ behavior: "smooth" });
});

document.querySelectorAll("[data-search]").forEach((button) => button.addEventListener("click", () => {
  searchInput.value = button.dataset.search;
  searchTerm = button.dataset.search.toLowerCase();
  activeCategory = "All";
  renderServices();
  document.getElementById("explore").scrollIntoView({ behavior: "smooth" });
}));

const modal = document.getElementById("modal");
const openModal = () => { modal.hidden = false; document.getElementById("modalOk").focus(); };
const closeModal = () => { modal.hidden = true; };
["signInBtn", "joinBtn", "ctaJoin"].forEach((id) => document.getElementById(id).addEventListener("click", openModal));
document.getElementById("modalClose").addEventListener("click", closeModal);
document.getElementById("modalOk").addEventListener("click", closeModal);
modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeModal(); });

const menuToggle = document.getElementById("menuToggle");
menuToggle.addEventListener("click", () => {
  const nav = document.querySelector(".main-nav");
  const opened = nav.classList.toggle("mobile-open");
  menuToggle.setAttribute("aria-expanded", String(opened));
  menuToggle.textContent = opened ? "×" : "☰";
});
document.querySelectorAll(".main-nav a").forEach((link) => link.addEventListener("click", () => {
  document.querySelector(".main-nav").classList.remove("mobile-open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.textContent = "☰";
}));
document.getElementById("year").textContent = new Date().getFullYear();
renderServices();