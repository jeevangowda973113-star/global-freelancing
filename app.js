import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const serviceCards = [...document.querySelectorAll(".service-card")];
const categoryButtons = [...document.querySelectorAll("[data-category]")];
const filterButtons = [...document.querySelectorAll("[data-filter]")];
const searchInput = document.getElementById("searchInput");
const emptyState = document.getElementById("emptyState");
let activeCategory = "All", searchTerm = "";

function renderServices() {
  let visible = 0;
  serviceCards.forEach((card) => {
    const categoryMatch = activeCategory === "All" || card.dataset.category === activeCategory;
    const text = (card.dataset.title + " " + card.textContent).toLowerCase();
    const show = categoryMatch && (!searchTerm || text.includes(searchTerm));
    card.hidden = !show;
    if (show) visible++;
  });
  emptyState.hidden = visible > 0;
  categoryButtons.forEach((button) => button.classList.toggle("active", button.dataset.category === activeCategory));
  filterButtons.forEach((button) => button.classList.toggle("selected", button.dataset.filter === activeCategory));
}
categoryButtons.forEach((button) => button.addEventListener("click", () => {
  activeCategory = button.dataset.category; searchTerm = ""; searchInput.value = ""; renderServices();
  document.getElementById("explore").scrollIntoView({ behavior: "smooth" });
}));
filterButtons.forEach((button) => button.addEventListener("click", () => { activeCategory = button.dataset.filter; renderServices(); }));
document.getElementById("searchForm").addEventListener("submit", (event) => {
  event.preventDefault(); searchTerm = searchInput.value.trim().toLowerCase(); activeCategory = "All"; renderServices();
  document.getElementById("explore").scrollIntoView({ behavior: "smooth" });
});
document.querySelectorAll("[data-search]").forEach((button) => button.addEventListener("click", () => {
  searchInput.value = button.dataset.search; searchTerm = button.dataset.search.toLowerCase(); activeCategory = "All"; renderServices();
  document.getElementById("explore").scrollIntoView({ behavior: "smooth" });
}));

const modal = document.getElementById("modal");
const authForm = document.getElementById("authForm");
const authMessage = document.getElementById("authMessage");
const authSubmit = document.getElementById("authSubmit");
const nameLabel = document.getElementById("nameLabel");
const displayName = document.getElementById("displayName");
const authPassword = document.getElementById("authPassword");
const signInTab = document.getElementById("showSignIn");
const signUpTab = document.getElementById("showSignUp");
const signOutButton = document.getElementById("signOutBtn");
let supabase = null, authMode = "signin";

function setMessage(message, kind = "") {
  authMessage.textContent = message;
  authMessage.className = "auth-message" + (kind ? " " + kind : "");
}
function setMode(mode) {
  authMode = mode;
  const signingUp = mode === "signup";
  nameLabel.hidden = !signingUp;
  displayName.required = signingUp;
  authPassword.autocomplete = signingUp ? "new-password" : "current-password";
  document.getElementById("modalTitle").textContent = signingUp ? "Create your account." : "Welcome back.";
  document.getElementById("authIntro").textContent = signingUp ? "Join the community and set up your profile." : "Sign in to continue to your marketplace account.";
  authSubmit.textContent = signingUp ? "Create account" : "Sign in";
  signInTab.classList.toggle("active", !signingUp);
  signUpTab.classList.toggle("active", signingUp);
  setMessage("");
}
function openAuth(mode) {
  modal.hidden = false; signOutButton.hidden = true; authForm.hidden = false; setMode(mode);
  document.getElementById("authEmail").focus();
}
function closeModal() { modal.hidden = true; }
["signInBtn", "joinBtn", "ctaJoin"].forEach((id) => {
  document.getElementById(id).addEventListener("click", () => openAuth(id === "signInBtn" ? "signin" : "signup"));
});
document.getElementById("modalClose").addEventListener("click", closeModal);
modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeModal(); });
signInTab.addEventListener("click", () => setMode("signin"));
signUpTab.addEventListener("click", () => setMode("signup"));

function updateAccountUI(user) {
  const signIn = document.getElementById("signInBtn");
  const join = document.getElementById("joinBtn");
  if (user) {
    signIn.textContent = user.email || "My account";
    signIn.onclick = () => {
      modal.hidden = false; authForm.hidden = true; signOutButton.hidden = false;
      document.getElementById("modalTitle").textContent = "You're signed in.";
      document.getElementById("authIntro").textContent = user.email || "";
    };
    join.hidden = true;
  } else {
    signIn.textContent = "Sign in"; signIn.onclick = null; join.hidden = false;
  }
}
signOutButton.addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();
  if (error) setMessage(error.message, "error");
  else { closeModal(); updateAccountUI(null); }
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabase) { setMessage("Authentication is not configured on this deployed site yet.", "error"); return; }
  authSubmit.disabled = true;
  setMessage(authMode === "signup" ? "Creating your account…" : "Signing you in…");
  const email = document.getElementById("authEmail").value.trim();
  const password = authPassword.value;
  const result = authMode === "signup"
    ? await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName.value.trim() } } })
    : await supabase.auth.signInWithPassword({ email, password });
  authSubmit.disabled = false;
  if (result.error) { setMessage(result.error.message, "error"); return; }
  if (authMode === "signup" && !result.data.session) {
    setMessage("Account created. Check your email for the confirmation link, then sign in.", "success");
    authForm.reset(); return;
  }
  setMessage(authMode === "signup" ? "Your account is ready." : "Signed in successfully.", "success");
  updateAccountUI(result.data.user);
  setTimeout(closeModal, 900);
});

async function initializeAuth() {
  try {
    const response = await fetch("/api/config", { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error("Supabase configuration is not available");
    const config = await response.json();
    if (!config.url || !config.anonKey) throw new Error("Supabase settings are incomplete");
    supabase = createClient(config.url, config.anonKey);
    const { data: { session } } = await supabase.auth.getSession();
    updateAccountUI(session?.user || null);
    supabase.auth.onAuthStateChange((_event, nextSession) => updateAccountUI(nextSession?.user || null));
  } catch {
    setMessage("Supabase is not connected to this deployed site yet. Check the deployment environment variables for SUPABASE_URL and SUPABASE_ANON_KEY.", "error");
  }
}

const menuToggle = document.getElementById("menuToggle");
menuToggle.addEventListener("click", () => {
  const nav = document.querySelector(".main-nav");
  const opened = nav.classList.toggle("mobile-open");
  menuToggle.setAttribute("aria-expanded", String(opened)); menuToggle.textContent = opened ? "×" : "☰";
});
document.querySelectorAll(".main-nav a").forEach((link) => link.addEventListener("click", () => {
  document.querySelector(".main-nav").classList.remove("mobile-open");
  menuToggle.setAttribute("aria-expanded", "false"); menuToggle.textContent = "☰";
}));
document.getElementById("year").textContent = new Date().getFullYear();
renderServices();
initializeAuth();
