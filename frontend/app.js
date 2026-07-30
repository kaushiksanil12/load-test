/* ─── AWS CloudWatch RUM ────────────────────────────────────────────────── */
import { AwsRum } from 'aws-rum-web';

try {
  const config = {
    sessionSampleRate: 1,
    endpoint: "https://dataplane.rum.eu-north-1.amazonaws.com",
    telemetries: ["performance", "errors", "http"],
    allowCookies: true,
    enableXRay: false,
    signing: true
  };

  const APPLICATION_ID = "f9d49313-e403-433d-9c24-186bedca6477";
  const APPLICATION_VERSION = "1.0.0";
  const APPLICATION_REGION = "eu-north-1";

  new AwsRum(APPLICATION_ID, APPLICATION_VERSION, APPLICATION_REGION, config);
} catch (error) {
  // Ignore errors thrown during CloudWatch RUM web client initialization
}

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
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, options);
  if (!res.ok) throw new Error(`${res.status} - ${res.statusText}`);
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
      <td>
        <button class="btn btn-danger" style="padding: 4px 8px; font-size: 11px;" onclick="deleteEmployee(${e.id})">
          Delete
        </button>
      </td>
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

/* ─── Load Simulation Actions ───────────────────────────────────────────── */
function showToast(msg, type = 'success') {
  const toast = document.getElementById("action-toast");
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  toast.style.color = type === 'error' ? 'var(--accent2)' : 'var(--accent1)';
  setTimeout(() => toast.classList.add("hidden"), 4000);
}

async function placeRandomOrder() {
  try {
    showToast("Placing order...", "info");
    const data = await apiFetch("/orders", { method: "POST" });
    showToast(`Order #${data.order.id} placed successfully for $${data.order.total_amount}!`);
    allOrders = []; // clear cache
    refreshData();
  } catch (e) {
    showToast(`Failed to place order: ${e.message}`, "error");
  }
}

async function generateHeavyLoad() {
  try {
    showToast("Simulating CPU spike...", "info");
    const data = await apiFetch("/heavy");
    showToast(`CPU spike completed in ${data.time_ms}ms (counted to ${data.count}).`);
  } catch (e) {
    showToast(`Failed to generate load: ${e.message}`, "error");
  }
}

/* ─── Employee CRUD Actions ─────────────────────────────────────────────── */
function openAddEmployeeModal() {
  document.getElementById("employee-modal").classList.remove("hidden");
}

function closeAddEmployeeModal() {
  document.getElementById("employee-modal").classList.add("hidden");
  document.getElementById("add-employee-form").reset();
}

async function submitNewEmployee(e) {
  e.preventDefault();
  const btn = document.getElementById("emp-submit-btn");
  btn.textContent = "Saving...";
  btn.disabled = true;

  const payload = {
    name: document.getElementById("emp-name").value,
    department: document.getElementById("emp-dept").value,
    role: document.getElementById("emp-role").value,
    salary: document.getElementById("emp-salary").value
  };

  try {
    await apiFetch("/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    showToast(`Employee ${payload.name} added successfully!`, "success");
    closeAddEmployeeModal();
    allEmployees = []; // force reload
    loadEmployees();
  } catch (err) {
    showToast(`Failed to add employee: ${err.message}`, "error");
  } finally {
    btn.textContent = "Save Employee";
    btn.disabled = false;
  }
}

async function deleteEmployee(id) {
  if (!confirm("Are you sure you want to delete this employee?")) return;
  try {
    showToast("Deleting employee...", "info");
    await apiFetch(`/employees/${id}`, { method: "DELETE" });
    showToast("Employee deleted successfully!", "success");
    allEmployees = []; // force reload
    loadEmployees();
  } catch (err) {
    showToast(`Failed to delete employee: ${err.message}`, "error");
  }
}

// ── Attach to global window for ESBuild bundler ─────────────────────────
window.switchTab = switchTab;
window.filterTable = filterTable;
window.refreshDashboard = refreshDashboard;
window.placeRandomOrder = placeRandomOrder;
window.generateHeavyLoad = generateHeavyLoad;
window.openAddEmployeeModal = openAddEmployeeModal;
window.closeAddEmployeeModal = closeAddEmployeeModal;
window.submitNewEmployee = submitNewEmployee;
window.deleteEmployee = deleteEmployee;
