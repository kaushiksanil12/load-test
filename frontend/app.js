/* ─── API base (nginx proxy routes /api → backend) ─────────────────────── */
const API = "/api";

/* ─── State ─────────────────────────────────────────────────────────────── */
let currentTab = "overview";
let allEmployees = [], allProducts = [], allOrders = [];

/* ─── Boot ──────────────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  checkHealth();
  loadOverview();
});

/* ─── Health check ──────────────────────────────────────────────────────── */
async function checkHealth() {
  const dot  = document.getElementById("status-dot");
  const text = document.getElementById("status-text");
  try {
    const res  = await fetch(`${API}/health`);
    const data = await res.json();
    dot.className  = "status-dot online";
    text.textContent = "DB connected";
  } catch {
    dot.className  = "status-dot offline";
    text.textContent = "DB offline";
  }
}

/* ─── Tab switching ─────────────────────────────────────────────────────── */
function switchTab(name) {
  currentTab = name;
  document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
  document.getElementById(`tab-${name}`).classList.add("active");
  document.getElementById(`nav-${name}`).classList.add("active");

  const titles = { overview:"Overview", employees:"Employees", products:"Products", orders:"Orders" };
  document.getElementById("page-title").textContent = titles[name];

  if (name === "employees") loadEmployees();
  if (name === "products")  loadProducts();
  if (name === "orders")    loadOrders();
}

/* ─── Refresh ───────────────────────────────────────────────────────────── */
function refreshData() {
  const btn = document.getElementById("refresh-btn");
  btn.classList.add("spinning");
  const promises = [checkHealth()];
  if (currentTab === "overview")   promises.push(loadOverview());
  if (currentTab === "employees")  promises.push(loadEmployees());
  if (currentTab === "products")   promises.push(loadProducts());
  if (currentTab === "orders")     promises.push(loadOrders());
  Promise.all(promises).finally(() => btn.classList.remove("spinning"));
}

/* ─── Fetch helpers ─────────────────────────────────────────────────────── */
async function apiFetch(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

/* ─── Load Overview ─────────────────────────────────────────────────────── */
async function loadOverview() {
  try {
    const [stats, depts, orders] = await Promise.all([
      apiFetch("/stats"),
      apiFetch("/departments"),
      apiFetch("/orders"),
    ]);
    renderStats(stats);
    renderDepartments(depts);
    renderRecentOrders(orders.slice(0, 5));
  } catch (e) {
    console.error("Overview error:", e);
  }
}

function renderStats(s) {
  animateCount("stat-employees", s.active_employees);
  animateCount("stat-products",  s.total_products);
  animateCount("stat-orders",    s.total_orders);
  document.getElementById("stat-revenue").textContent = `$${s.total_revenue.toLocaleString("en-US", { minimumFractionDigits:2 })}`;
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  const duration = 800;
  const start = performance.now();
  const from = parseInt(el.textContent) || 0;
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + (target - from) * ease);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function renderDepartments(depts) {
  const container = document.getElementById("dept-list");
  const max = Math.max(...depts.map(d => parseInt(d.count)));
  const colors = ["#6c63ff","#00d4aa","#f59e0b","#ec4899","#3b82f6","#8b5cf6"];
  container.innerHTML = depts.map((d, i) => {
    const pct = Math.round((parseInt(d.count) / max) * 100);
    return `
      <div class="dept-row">
        <div class="dept-info">
          <span class="dept-name">${d.department}</span>
          <span class="dept-count">${d.count} staff</span>
        </div>
        <div class="dept-bar">
          <div class="dept-fill" style="width:${pct}%; background:${colors[i % colors.length]}"></div>
        </div>
      </div>`;
  }).join("");
}

function renderRecentOrders(orders) {
  const container = document.getElementById("recent-orders");
  container.innerHTML = orders.map(o => `
    <div class="order-row">
      <div class="order-meta">
        <span class="order-name">${o.employee_name}</span>
        <span class="order-product">${o.product_name} · qty ${o.quantity}</span>
      </div>
      <span class="order-amount">$${parseFloat(o.total_amount).toFixed(2)}</span>
    </div>`).join("");
}

/* ─── Load Employees ────────────────────────────────────────────────────── */
async function loadEmployees() {
  if (allEmployees.length) { renderEmployees(allEmployees); return; }
  try {
    allEmployees = await apiFetch("/employees");
    renderEmployees(allEmployees);
  } catch (e) { console.error(e); }
}

function renderEmployees(rows) {
  const body = document.getElementById("emp-body");
  body.innerHTML = rows.map(e => `
    <tr>
      <td>${e.id}</td>
      <td><strong>${e.name}</strong></td>
      <td><span class="chip chip-dept">${e.department}</span></td>
      <td>${e.role}</td>
      <td>$${parseInt(e.salary).toLocaleString()}</td>
      <td>${fmtDate(e.joined_at)}</td>
      <td><span class="chip ${e.status === 'active' ? 'chip-active' : 'chip-inactive'}">${e.status}</span></td>
    </tr>`).join("");
}

/* ─── Load Products ─────────────────────────────────────────────────────── */
async function loadProducts() {
  if (allProducts.length) { renderProducts(allProducts); return; }
  try {
    allProducts = await apiFetch("/products");
    renderProducts(allProducts);
  } catch (e) { console.error(e); }
}

function renderProducts(rows) {
  const body = document.getElementById("prod-body");
  body.innerHTML = rows.map(p => `
    <tr>
      <td>${p.id}</td>
      <td><strong>${p.name}</strong></td>
      <td><span class="chip chip-dept">${p.category}</span></td>
      <td>$${parseFloat(p.price).toFixed(2)}</td>
      <td>${p.stock}</td>
      <td>${fmtDate(p.created_at)}</td>
    </tr>`).join("");
}

/* ─── Load Orders ───────────────────────────────────────────────────────── */
async function loadOrders() {
  if (allOrders.length) { renderOrders(allOrders); return; }
  try {
    allOrders = await apiFetch("/orders");
    renderOrders(allOrders);
  } catch (e) { console.error(e); }
}

function renderOrders(rows) {
  const body = document.getElementById("ord-body");
  body.innerHTML = rows.map(o => `
    <tr>
      <td>${o.id}</td>
      <td><strong>${o.employee_name}</strong></td>
      <td>${o.product_name}</td>
      <td><span class="chip chip-dept">${o.category}</span></td>
      <td>${o.quantity}</td>
      <td><strong style="color:var(--accent2)">$${parseFloat(o.total_amount).toFixed(2)}</strong></td>
      <td>${fmtDate(o.ordered_at)}</td>
    </tr>`).join("");
}

/* ─── Filter table ──────────────────────────────────────────────────────── */
function filterTable(tableId, query) {
  const rows = document.querySelectorAll(`#${tableId} tbody tr`);
  const q = query.toLowerCase();
  rows.forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none";
  });
}

/* ─── Utility ───────────────────────────────────────────────────────────── */
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year:"numeric", month:"short", day:"numeric" });
}
