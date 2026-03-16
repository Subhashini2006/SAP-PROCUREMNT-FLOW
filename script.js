/* ===== DATABASE ===== */
const DB = {
  get: k => JSON.parse(localStorage.getItem(k) || '[]'),
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  getObj: k => JSON.parse(localStorage.getItem(k) || 'null'),
  setObj: (k, v) => localStorage.setItem(k, JSON.stringify(v))
};

/* ===== STATE ===== */
let currentUser = null;
let currentChatVendor = null;
let ratingValue = 0;

/* ===== INIT ===== */
window.onload = () => {
  currentUser = DB.getObj('currentUser');
  if (currentUser) {
    if (currentUser.role === 'company') loadCompanyDash();
    else loadVendorDash();
  } else {
    showPage('home');
  }
  updateHomeStats();
  applyTheme();
};

/* ===== PAGE ROUTING ===== */
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => { p.classList.add('hidden'); p.classList.remove('active'); });
  const el = document.getElementById('page-' + page);
  if (el) { el.classList.remove('hidden'); el.classList.add('active'); }
}

function showSection(sec) {
  document.querySelectorAll('#page-company .section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('#page-company .section').forEach(s => s.classList.add('hidden'));
  const el = document.getElementById('sec-' + sec);
  if (el) { el.classList.remove('hidden'); el.classList.add('active'); }
  document.querySelectorAll('#page-company .nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`[data-section="${sec}"]`)?.classList.add('active');
  const titles = { dash:'Dashboard', pr:'Purchase Requisitions', po:'Purchase Orders', vendors:'Vendor Management', messages:'Messages' };
  document.getElementById('topbar-title').textContent = titles[sec] || '';
  if (sec === 'pr') renderPRTable();
  if (sec === 'po') renderPOTable();
  if (sec === 'vendors') renderVendorTable();
  if (sec === 'messages') renderCompanyMessages();
  if (sec === 'dash') refreshDash();
}

function showVSection(sec) {
  document.querySelectorAll('#page-vendor .section').forEach(s => { s.classList.remove('active'); s.classList.add('hidden'); });
  const el = document.getElementById('vsec-' + sec);
  if (el) { el.classList.remove('hidden'); el.classList.add('active'); }
  document.querySelectorAll('#page-vendor .nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`[data-vsection="${sec}"]`)?.classList.add('active');
  const titles = { vdash:'Dashboard', vorders:'My Orders', vinvoice:'Invoices', vmessages:'Messages' };
  document.getElementById('vtopbar-title').textContent = titles[sec] || '';
  if (sec === 'vdash') refreshVendorDash();
  if (sec === 'vorders') renderVendorOrders();
  if (sec === 'vinvoice') renderVendorInvoices();
  if (sec === 'vmessages') renderVendorMessages();
}

/* ===== AUTH ===== */
function showAuth(tab, role) {
  document.getElementById('auth-modal').classList.remove('hidden');
  switchTab(tab);
  setRole(role);
  setRegRole(role);
}
function closeAuth() { document.getElementById('auth-modal').classList.add('hidden'); }

function switchTab(tab) {
  document.getElementById('form-login').classList.toggle('hidden', tab !== 'login');
  document.getElementById('form-register').classList.toggle('hidden', tab !== 'register');
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
}

function setRole(role) {
  document.getElementById('auth-role').value = role;
  document.getElementById('role-company').classList.toggle('active', role === 'company');
  document.getElementById('role-vendor').classList.toggle('active', role === 'vendor');
}

function setRegRole(role) {
  document.getElementById('reg-role').value = role;
  document.getElementById('rrole-company').classList.toggle('active', role === 'company');
  document.getElementById('rrole-vendor').classList.toggle('active', role === 'vendor');
  document.getElementById('vendor-cat-group').style.display = role === 'vendor' ? 'block' : 'none';
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-password').value;
  const role = document.getElementById('auth-role').value;
  const users = DB.get('users');
  const user = users.find(u => u.email === email && u.password === pass && u.role === role);
  if (!user) { showError('login-error', 'Invalid email or password.'); return; }
  currentUser = user;
  DB.setObj('currentUser', user);
  closeAuth();
  if (role === 'company') loadCompanyDash();
  else loadVendorDash();
}

function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass = document.getElementById('reg-password').value;
  const role = document.getElementById('reg-role').value;
  const category = document.getElementById('reg-category').value;
  const users = DB.get('users');
  if (users.find(u => u.email === email)) { showError('reg-error', 'This email is already registered.'); return; }
  const user = { id: uid(), name, email, password: pass, role, category: role === 'vendor' ? category : null, createdAt: new Date().toISOString() };
  users.push(user);
  DB.set('users', users);
  currentUser = user;
  DB.setObj('currentUser', user);
  closeAuth();
  toast('Account created successfully! Welcome, ' + name, 'success');
  if (role === 'company') loadCompanyDash();
  else loadVendorDash();
}

function logout() {
  currentUser = null;
  DB.setObj('currentUser', null);
  currentChatVendor = null;
  showPage('home');
  updateHomeStats();
}

/* ===== COMPANY DASHBOARD ===== */
function loadCompanyDash() {
  showPage('company');
  document.getElementById('company-name').textContent = currentUser.name;
  document.getElementById('company-avatar').textContent = currentUser.name[0].toUpperCase();
  refreshDash();
  showSection('dash');
  loadNotifications();
}

function refreshDash() {
  const prs = DB.get('prs').filter(p => p.companyId === currentUser.id);
  const pos = DB.get('pos').filter(p => p.companyId === currentUser.id);
  document.getElementById('kpi-pr').textContent = prs.length;
  document.getElementById('kpi-po').textContent = pos.length;
  document.getElementById('kpi-pending').textContent = prs.filter(p => p.status === 'Pending').length;
  document.getElementById('kpi-completed').textContent = pos.filter(p => p.status === 'Invoice Paid').length;
  renderMiniTable('dash-recent-pr', prs.slice(-5).reverse(), 'pr');
  renderMiniTable('dash-recent-po', pos.slice(-5).reverse(), 'po');
}

function renderMiniTable(containerId, items, type) {
  const el = document.getElementById(containerId);
  if (!items.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>No records yet</p></div>'; return; }
  const rows = items.map(item => {
    const badge = statusBadge(item.status);
    if (type === 'pr') return `<tr><td><strong>${item.material}</strong></td><td>${item.department}</td><td>${badge}</td></tr>`;
    return `<tr><td><strong>${item.id}</strong></td><td>${item.vendorName || '—'}</td><td>${badge}</td></tr>`;
  }).join('');
  const headers = type === 'pr' ? '<tr><th>Material</th><th>Dept</th><th>Status</th></tr>' : '<tr><th>PO ID</th><th>Vendor</th><th>Status</th></tr>';
  el.innerHTML = `<div class="table-wrap"><table>${headers}${rows}</table></div>`;
}

/* ===== PR MANAGEMENT ===== */
function createPR(e) {
  e.preventDefault();
  const pr = {
    id: 'PR-' + Date.now(),
    companyId: currentUser.id,
    material: document.getElementById('pr-material').value.trim(),
    quantity: parseInt(document.getElementById('pr-qty').value),
    unit: document.getElementById('pr-unit').value,
    department: document.getElementById('pr-dept').value,
    priority: document.getElementById('pr-priority').value,
    requiredDate: document.getElementById('pr-date').value,
    estimatedCost: parseFloat(document.getElementById('pr-cost').value) || 0,
    description: document.getElementById('pr-desc').value,
    status: 'Pending',
    createdAt: new Date().toISOString(),
    createdBy: currentUser.name
  };
  const prs = DB.get('prs');
  prs.push(pr);
  DB.set('prs', prs);
  closeModal('modal-pr');
  e.target.reset();
  toast('Purchase Requisition created: ' + pr.id, 'success');
  addNotification('New PR created: ' + pr.material);
  renderPRTable();
  refreshDash();
  updateHomeStats();
}

function renderPRTable() {
  const search = document.getElementById('pr-search')?.value.toLowerCase() || '';
  const filter = document.getElementById('pr-filter')?.value || '';
  let prs = DB.get('prs').filter(p => p.companyId === currentUser.id);
  if (search) prs = prs.filter(p => p.material.toLowerCase().includes(search));
  if (filter) prs = prs.filter(p => p.status === filter || (filter === 'Converted' && p.status === 'Converted to PO'));
  const el = document.getElementById('pr-table');
  if (!prs.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>No purchase requisitions found. Create your first PR!</p></div>'; return; }
  const rows = prs.reverse().map(pr => {
    const actions = pr.status === 'Pending'
      ? `<button class="btn-sm btn-green" onclick="updatePRStatus('${pr.id}','Approved')">Approve</button> <button class="btn-sm btn-red" onclick="updatePRStatus('${pr.id}','Rejected')">Reject</button>`
      : pr.status === 'Approved'
      ? `<button class="btn-sm btn-purple" onclick="openConvertPO('${pr.id}')">Convert to PO</button>`
      : '—';
    return `<tr>
      <td><strong>${pr.id}</strong></td>
      <td>${pr.material}</td>
      <td>${pr.quantity} ${pr.unit}</td>
      <td>${pr.department}</td>
      <td><span class="priority-${pr.priority.toLowerCase()}">${pr.priority}</span></td>
      <td>${formatDate(pr.requiredDate)}</td>
      <td>$${pr.estimatedCost.toLocaleString()}</td>
      <td>${statusBadge(pr.status)}</td>
      <td>${actions}</td>
    </tr>`;
  }).join('');
  el.innerHTML = `<div class="table-wrap"><table>
    <tr><th>ID</th><th>Material</th><th>Qty</th><th>Dept</th><th>Priority</th><th>Required</th><th>Est. Cost</th><th>Status</th><th>Actions</th></tr>
    ${rows}</table></div>`;
}

function updatePRStatus(id, status) {
  const prs = DB.get('prs');
  const i = prs.findIndex(p => p.id === id);
  if (i === -1) return;
  prs[i].status = status;
  DB.set('prs', prs);
  toast('PR ' + status + ': ' + id, status === 'Approved' ? 'success' : 'error');
  addNotification('PR ' + id + ' has been ' + status);
  renderPRTable();
  refreshDash();
}

function openConvertPO(prId) {
  const prs = DB.get('prs');
  const pr = prs.find(p => p.id === prId);
  if (!pr) return;
  document.getElementById('po-pr-id').value = prId;
  document.getElementById('po-pr-details').innerHTML = `<strong>${pr.material}</strong> | Qty: ${pr.quantity} ${pr.unit} | Dept: ${pr.department} | Required: ${formatDate(pr.requiredDate)}`;
  const vendors = DB.get('users').filter(u => u.role === 'vendor');
  const vendorSel = document.getElementById('po-vendor');
  vendorSel.innerHTML = '<option value="">Choose vendor...</option>' + vendors.map(v => `<option value="${v.id}">${v.name} (${v.category || 'General'})</option>`).join('');
  document.getElementById('po-price').value = '';
  document.getElementById('po-total').value = '';
  openModal('modal-po');
}

function calcTotal() {
  const prId = document.getElementById('po-pr-id').value;
  const prs = DB.get('prs');
  const pr = prs.find(p => p.id === prId);
  const price = parseFloat(document.getElementById('po-price').value) || 0;
  const total = pr ? (price * pr.quantity).toFixed(2) : 0;
  document.getElementById('po-total').value = '$' + parseFloat(total).toLocaleString();
}

function createPO(e) {
  e.preventDefault();
  const prId = document.getElementById('po-pr-id').value;
  const vendorId = document.getElementById('po-vendor').value;
  const price = parseFloat(document.getElementById('po-price').value);
  const delivery = document.getElementById('po-delivery').value;
  const notes = document.getElementById('po-notes').value;
  const prs = DB.get('prs');
  const pr = prs.find(p => p.id === prId);
  if (!pr || !vendorId) { toast('Please fill all required fields', 'error'); return; }
  const vendor = DB.get('users').find(u => u.id === vendorId);
  const po = {
    id: 'PO-' + Date.now(),
    prId,
    companyId: currentUser.id,
    companyName: currentUser.name,
    vendorId,
    vendorName: vendor?.name || '',
    material: pr.material,
    quantity: pr.quantity,
    unit: pr.unit,
    unitPrice: price,
    totalAmount: price * pr.quantity,
    deliveryDate: delivery,
    notes,
    status: 'Sent to Vendor',
    createdAt: new Date().toISOString()
  };
  const pos = DB.get('pos');
  pos.push(po);
  DB.set('pos', pos);
  const i = prs.findIndex(p => p.id === prId);
  prs[i].status = 'Converted to PO';
  DB.set('prs', prs);
  closeModal('modal-po');
  document.getElementById('po-notes').value = '';
  toast('Purchase Order created: ' + po.id, 'success');
  addNotification('PO ' + po.id + ' sent to vendor: ' + vendor?.name);
  renderPOTable();
  renderPRTable();
  refreshDash();
  updateHomeStats();
}

/* ===== PO MANAGEMENT ===== */
function renderPOTable() {
  const search = document.getElementById('po-search')?.value.toLowerCase() || '';
  const filter = document.getElementById('po-filter')?.value || '';
  let pos = DB.get('pos').filter(p => p.companyId === currentUser.id);
  if (search) pos = pos.filter(p => p.material.toLowerCase().includes(search) || p.id.toLowerCase().includes(search) || p.vendorName.toLowerCase().includes(search));
  if (filter) pos = pos.filter(p => p.status === filter);
  const el = document.getElementById('po-table');
  if (!pos.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">📦</div><p>No purchase orders found. Approve a PR and convert it to PO!</p></div>'; return; }
  const rows = pos.reverse().map(po => {
    let actions = '';
    if (po.status === 'Accepted') actions = `<button class="btn-sm btn-green" onclick="markGoodsReceived('${po.id}')">Mark Received</button>`;
    if (po.status === 'Goods Received') actions = `<span class="status status-received">Awaiting Invoice</span>`;
    if (po.status === 'Invoice Submitted') actions = `<button class="btn-sm btn-purple" onclick="markInvoicePaid('${po.id}')">Mark Paid</button>`;
    if (po.status === 'Invoice Paid') actions = `<button class="btn-sm btn-orange" onclick="openModal('modal-rate');document.getElementById('rate-po-id').value='${po.id}'">Rate Vendor</button>`;
    if (po.status === 'Sent to Vendor' || po.status === 'Rejected') actions = actions || '—';
    return `<tr>
      <td><strong>${po.id}</strong></td>
      <td>${po.material}</td>
      <td>${po.quantity} ${po.unit}</td>
      <td>${po.vendorName}</td>
      <td>$${po.totalAmount.toLocaleString()}</td>
      <td>${formatDate(po.deliveryDate)}</td>
      <td>${statusBadge(po.status)}</td>
      <td>${actions || '—'}</td>
    </tr>`;
  }).join('');
  el.innerHTML = `<div class="table-wrap"><table>
    <tr><th>PO ID</th><th>Material</th><th>Qty</th><th>Vendor</th><th>Total</th><th>Delivery</th><th>Status</th><th>Actions</th></tr>
    ${rows}</table></div>`;
}

function markGoodsReceived(poId) {
  const pos = DB.get('pos');
  const i = pos.findIndex(p => p.id === poId);
  if (i === -1) return;
  pos[i].status = 'Goods Received';
  pos[i].receivedAt = new Date().toISOString();
  DB.set('pos', pos);
  toast('Goods received for ' + poId, 'success');
  addNotification('Goods received: ' + poId);
  renderPOTable();
  refreshDash();
}

function markInvoicePaid(poId) {
  const pos = DB.get('pos');
  const i = pos.findIndex(p => p.id === poId);
  if (i === -1) return;
  pos[i].status = 'Invoice Paid';
  pos[i].paidAt = new Date().toISOString();
  DB.set('pos', pos);
  toast('Invoice marked as paid for ' + poId, 'success');
  addNotification('Invoice paid: ' + poId);
  renderPOTable();
  refreshDash();
  updateHomeStats();
}

/* ===== VENDOR MANAGEMENT ===== */
function renderVendorTable() {
  const vendors = DB.get('users').filter(u => u.role === 'vendor');
  const pos = DB.get('pos');
  const el = document.getElementById('vendor-table');
  if (!vendors.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">🏭</div><p>No vendors registered yet. Vendors can create accounts to appear here.</p></div>'; return; }
  const rows = vendors.map(v => {
    const vOrders = pos.filter(p => p.vendorId === v.id && p.companyId === currentUser.id);
    const ratings = DB.get('ratings').filter(r => r.vendorId === v.id);
    const avgRating = ratings.length ? (ratings.reduce((a, r) => a + r.rating, 0) / ratings.length).toFixed(1) : '—';
    const stars = avgRating !== '—' ? '★'.repeat(Math.round(avgRating)) + '☆'.repeat(5 - Math.round(avgRating)) : 'No ratings';
    return `<tr>
      <td><strong>${v.name}</strong></td>
      <td>${v.email}</td>
      <td>${v.category || 'General'}</td>
      <td>${vOrders.length}</td>
      <td><span style="color:var(--orange)">${stars}</span> ${avgRating !== '—' ? avgRating + '/5' : ''}</td>
      <td>${formatDate(v.createdAt)}</td>
    </tr>`;
  }).join('');
  el.innerHTML = `<div class="table-wrap"><table>
    <tr><th>Name</th><th>Email</th><th>Category</th><th>Orders</th><th>Rating</th><th>Joined</th></tr>
    ${rows}</table></div>`;
}

/* ===== MESSAGES (COMPANY) ===== */
function renderCompanyMessages() {
  const vendors = DB.get('users').filter(u => u.role === 'vendor');
  const list = document.getElementById('company-chat-list');
  if (!vendors.length) { list.innerHTML = '<div class="empty-state"><p>No vendors registered</p></div>'; return; }
  list.innerHTML = vendors.map(v => {
    const msgs = DB.get('msgs_' + currentUser.id + '_' + v.id);
    const last = msgs[msgs.length - 1];
    const isActive = currentChatVendor?.id === v.id ? 'active' : '';
    return `<div class="chat-contact ${isActive}" onclick="selectChatVendor('${v.id}')">
      <div class="contact-name">${v.name}</div>
      <div class="contact-preview">${last ? last.text : 'No messages yet'}</div>
    </div>`;
  }).join('');
  if (currentChatVendor) loadChatMessages();
}

function selectChatVendor(vendorId) {
  const vendors = DB.get('users');
  currentChatVendor = vendors.find(v => v.id === vendorId);
  document.getElementById('chat-header').textContent = 'Chat with ' + currentChatVendor.name;
  document.getElementById('chat-input-bar').style.display = 'flex';
  renderCompanyMessages();
  loadChatMessages();
}

function loadChatMessages() {
  if (!currentChatVendor) return;
  const key = 'msgs_' + currentUser.id + '_' + currentChatVendor.id;
  const msgs = DB.get(key);
  const container = document.getElementById('chat-messages');
  if (!msgs.length) { container.innerHTML = '<div class="empty-state"><p>No messages yet. Start the conversation!</p></div>'; return; }
  container.innerHTML = msgs.map(m => `
    <div class="chat-msg ${m.sender === currentUser.id ? 'sent' : 'received'}">
      <div class="msg-sender">${m.senderName}</div>
      <div>${m.text}</div>
      <div class="msg-time">${formatTime(m.time)}</div>
    </div>`).join('');
  container.scrollTop = container.scrollHeight;
}

function sendMessage() {
  if (!currentChatVendor) return;
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  const key = 'msgs_' + currentUser.id + '_' + currentChatVendor.id;
  const msgs = DB.get(key);
  msgs.push({ sender: currentUser.id, senderName: currentUser.name, text, time: new Date().toISOString() });
  DB.set(key, msgs);
  input.value = '';
  loadChatMessages();
  renderCompanyMessages();
}

/* ===== ANALYTICS ===== */
function renderAnalytics() {
  const pos = DB.get('pos').filter(p => p.companyId === currentUser.id);
  const prs = DB.get('prs').filter(p => p.companyId === currentUser.id);
  const statuses = ['Sent to Vendor','Accepted','Goods Received','Invoice Submitted','Invoice Paid','Rejected'];
  const statusCounts = statuses.map(s => pos.filter(p => p.status === s).length);
  renderChart('chart-status', 'doughnut', statuses, statusCounts, ['#3b82f6','#10b981','#06b6d4','#f59e0b','#8b5cf6','#ef4444']);
  const depts = ['IT','HR','Finance','Operations','Marketing'];
  const deptSpend = depts.map(d => prs.filter(p => p.department === d).reduce((a, p) => a + (p.estimatedCost || 0), 0));
  renderChart('chart-dept', 'bar', depts, deptSpend, '#3b82f6');
  const months = getLast6Months();
  const monthCounts = months.map(m => prs.filter(p => p.createdAt?.startsWith(m)).length);
  renderChart('chart-monthly', 'line', months.map(m => m.slice(5)), monthCounts, '#8b5cf6');
  const vendors = DB.get('users').filter(u => u.role === 'vendor');
  const vendorNames = vendors.map(v => v.name);
  const vendorOrders = vendors.map(v => pos.filter(p => p.vendorId === v.id).length);
  renderChart('chart-vendor', 'bar', vendorNames.length ? vendorNames : ['No vendors'], vendorOrders.length ? vendorOrders : [0], '#10b981');
}

function renderChart(id, type, labels, data, colors) {
  if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
  const ctx = document.getElementById(id);
  if (!ctx) return;
  const isDark = document.body.classList.contains('dark');
  chartInstances[id] = new Chart(ctx, {
    type,
    data: {
      labels,
      datasets: [{ data, backgroundColor: Array.isArray(colors) ? colors : colors, borderColor: Array.isArray(colors) ? colors : colors, borderWidth: type === 'line' ? 2 : 0, tension: 0.4, fill: type === 'line', borderRadius: type === 'bar' ? 6 : 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: type === 'doughnut', labels: { color: isDark ? '#f1f5f9' : '#1e293b', padding: 12, font: { size: 12 } } } },
      scales: type !== 'doughnut' ? { y: { ticks: { color: isDark ? '#94a3b8' : '#64748b' }, grid: { color: isDark ? '#1e293b' : '#f1f5f9' } }, x: { ticks: { color: isDark ? '#94a3b8' : '#64748b' }, grid: { display: false } } } : {}
    }
  });
}

/* ===== VENDOR DASHBOARD ===== */
function loadVendorDash() {
  showPage('vendor');
  document.getElementById('vendor-name').textContent = currentUser.name;
  document.getElementById('vendor-avatar').textContent = currentUser.name[0].toUpperCase();
  refreshVendorDash();
  showVSection('vdash');
}

function refreshVendorDash() {
  const pos = DB.get('pos').filter(p => p.vendorId === currentUser.id);
  document.getElementById('vkpi-total').textContent = pos.length;
  document.getElementById('vkpi-pending').textContent = pos.filter(p => p.status === 'Sent to Vendor').length;
  document.getElementById('vkpi-accepted').textContent = pos.filter(p => p.status === 'Accepted').length;
  document.getElementById('vkpi-invoiced').textContent = pos.filter(p => ['Invoice Submitted','Invoice Paid'].includes(p.status)).length;
  const el = document.getElementById('vdash-orders');
  if (!pos.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">📦</div><p>No orders received yet</p></div>'; return; }
  const rows = pos.slice(-5).reverse().map(po => `<tr>
    <td><strong>${po.id}</strong></td><td>${po.material}</td><td>${po.quantity} ${po.unit}</td>
    <td>$${po.totalAmount.toLocaleString()}</td><td>${statusBadge(po.status)}</td>
  </tr>`).join('');
  el.innerHTML = `<div class="table-wrap"><table><tr><th>PO ID</th><th>Material</th><th>Qty</th><th>Total</th><th>Status</th></tr>${rows}</table></div>`;
}

function renderVendorOrders() {
  const pos = DB.get('pos').filter(p => p.vendorId === currentUser.id);
  const el = document.getElementById('vendor-orders-table');
  if (!pos.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">📦</div><p>No orders yet</p></div>'; return; }
  const rows = pos.reverse().map(po => {
    let actions = '';
    if (po.status === 'Sent to Vendor') {
      actions = `<button class="btn-sm btn-green" onclick="vendorUpdatePO('${po.id}','Accepted')">Accept</button> <button class="btn-sm btn-red" onclick="vendorUpdatePO('${po.id}','Rejected')">Reject</button>`;
    } else if (po.status === 'Goods Received') {
      actions = `<button class="btn-sm btn-purple" onclick="openInvoiceModal('${po.id}')">Submit Invoice</button>`;
    } else {
      actions = '—';
    }
    return `<tr>
      <td><strong>${po.id}</strong></td>
      <td>${po.material}</td>
      <td>${po.quantity} ${po.unit}</td>
      <td>${po.companyName}</td>
      <td>$${po.totalAmount.toLocaleString()}</td>
      <td>${formatDate(po.deliveryDate)}</td>
      <td>${statusBadge(po.status)}</td>
      <td>${actions}</td>
    </tr>`;
  }).join('');
  el.innerHTML = `<div class="table-wrap"><table>
    <tr><th>PO ID</th><th>Material</th><th>Qty</th><th>Company</th><th>Total</th><th>Delivery</th><th>Status</th><th>Actions</th></tr>
    ${rows}</table></div>`;
}

function vendorUpdatePO(poId, status) {
  const pos = DB.get('pos');
  const i = pos.findIndex(p => p.id === poId);
  if (i === -1) return;
  pos[i].status = status;
  DB.set('pos', pos);
  toast('Order ' + status + ': ' + poId, status === 'Accepted' ? 'success' : 'error');
  renderVendorOrders();
  refreshVendorDash();
}

function openInvoiceModal(poId) {
  document.getElementById('invoice-po-id').value = poId;
  const pos = DB.get('pos');
  const po = pos.find(p => p.id === poId);
  if (po) document.getElementById('inv-amount').value = po.totalAmount;
  openModal('modal-invoice');
}

function submitInvoice() {
  const poId = document.getElementById('invoice-po-id').value;
  const invNum = document.getElementById('inv-number').value.trim();
  const amount = parseFloat(document.getElementById('inv-amount').value);
  const due = document.getElementById('inv-due').value;
  const notes = document.getElementById('inv-notes').value;
  if (!invNum || !amount || !due) { toast('Please fill all required fields', 'error'); return; }
  const pos = DB.get('pos');
  const i = pos.findIndex(p => p.id === poId);
  if (i === -1) return;
  pos[i].status = 'Invoice Submitted';
  pos[i].invoice = { number: invNum, amount, due, notes, submittedAt: new Date().toISOString() };
  DB.set('pos', pos);
  closeModal('modal-invoice');
  document.getElementById('inv-number').value = '';
  document.getElementById('inv-notes').value = '';
  toast('Invoice submitted: ' + invNum, 'success');
  renderVendorOrders();
  renderVendorInvoices();
  refreshVendorDash();
}

function renderVendorInvoices() {
  const pos = DB.get('pos').filter(p => p.vendorId === currentUser.id && p.invoice);
  const el = document.getElementById('vendor-invoices-table');
  if (!pos.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">🧾</div><p>No invoices submitted yet</p></div>'; return; }
  const rows = pos.map(po => `<tr>
    <td><strong>${po.invoice.number}</strong></td>
    <td>${po.id}</td>
    <td>${po.material}</td>
    <td>$${po.invoice.amount.toLocaleString()}</td>
    <td>${formatDate(po.invoice.due)}</td>
    <td>${statusBadge(po.status)}</td>
  </tr>`).join('');
  el.innerHTML = `<div class="table-wrap"><table>
    <tr><th>Invoice #</th><th>PO ID</th><th>Material</th><th>Amount</th><th>Due Date</th><th>Status</th></tr>
    ${rows}</table></div>`;
}

/* ===== VENDOR MESSAGES ===== */
function renderVendorMessages() {
  const companies = DB.get('users').filter(u => u.role === 'company');
  const container = document.getElementById('vendor-chat-messages');
  let allMsgs = [];
  companies.forEach(c => {
    const key = 'msgs_' + c.id + '_' + currentUser.id;
    const msgs = DB.get(key);
    allMsgs = allMsgs.concat(msgs);
  });
  allMsgs.sort((a, b) => new Date(a.time) - new Date(b.time));
  if (!allMsgs.length) { container.innerHTML = '<div class="empty-state"><p>No messages yet</p></div>'; return; }
  container.innerHTML = allMsgs.map(m => `
    <div class="chat-msg ${m.sender === currentUser.id ? 'sent' : 'received'}">
      <div class="msg-sender">${m.senderName}</div>
      <div>${m.text}</div>
      <div class="msg-time">${formatTime(m.time)}</div>
    </div>`).join('');
  container.scrollTop = container.scrollHeight;
}

function vendorSendMessage() {
  const input = document.getElementById('vendor-chat-input');
  const text = input.value.trim();
  if (!text) return;
  const companies = DB.get('users').filter(u => u.role === 'company');
  if (!companies.length) { toast('No company to message yet', 'warning'); return; }
  const company = companies[0];
  const key = 'msgs_' + company.id + '_' + currentUser.id;
  const msgs = DB.get(key);
  msgs.push({ sender: currentUser.id, senderName: currentUser.name, text, time: new Date().toISOString() });
  DB.set(key, msgs);
  input.value = '';
  renderVendorMessages();
}

/* ===== RATING ===== */
function setRating(val) {
  ratingValue = val;
  document.getElementById('rating-val').value = val;
  document.querySelectorAll('#star-rating span').forEach((s, i) => s.classList.toggle('active', i < val));
}

function submitRating() {
  const poId = document.getElementById('rate-po-id').value;
  if (!ratingValue) { toast('Please select a rating', 'warning'); return; }
  const pos = DB.get('pos');
  const po = pos.find(p => p.id === poId);
  if (!po) return;
  const ratings = DB.get('ratings');
  ratings.push({ poId, vendorId: po.vendorId, rating: ratingValue, comment: document.getElementById('rate-comment').value, ratedAt: new Date().toISOString() });
  DB.set('ratings', ratings);
  closeModal('modal-rate');
  ratingValue = 0;
  document.querySelectorAll('#star-rating span').forEach(s => s.classList.remove('active'));
  toast('Rating submitted!', 'success');
}

/* ===== NOTIFICATIONS ===== */
function addNotification(msg) {
  const notifs = DB.get('notifs_' + (currentUser?.id || 'guest'));
  notifs.push({ msg, time: new Date().toISOString(), read: false });
  DB.set('notifs_' + currentUser.id, notifs);
  loadNotifications();
}

function loadNotifications() {
  const notifs = DB.get('notifs_' + currentUser.id);
  const unread = notifs.filter(n => !n.read).length;
  const badge = document.getElementById('notif-count');
  if (badge) { badge.textContent = unread; badge.classList.toggle('hidden', unread === 0); }
  const list = document.getElementById('notif-list');
  if (list) {
    if (!notifs.length) { list.innerHTML = '<div class="empty-state"><p>No notifications</p></div>'; return; }
    list.innerHTML = notifs.reverse().map(n => `<div class="notif-item"><div class="notif-title">${n.msg}</div><div class="notif-time">${formatTime(n.time)}</div></div>`).join('');
  }
}

function toggleNotif() {
  const panel = document.getElementById('notif-panel');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    const notifs = DB.get('notifs_' + currentUser.id).map(n => ({ ...n, read: true }));
    DB.set('notifs_' + currentUser.id, notifs);
    loadNotifications();
  }
}

function clearNotifs() {
  DB.set('notifs_' + currentUser.id, []);
  loadNotifications();
  document.getElementById('notif-panel').classList.add('hidden');
}

/* ===== EXPORT CSV ===== */
function exportCSV(type) {
  let data, headers, filename;
  if (type === 'pr') {
    data = DB.get('prs').filter(p => p.companyId === currentUser.id);
    headers = ['ID', 'Material', 'Quantity', 'Unit', 'Department', 'Priority', 'Required Date', 'Estimated Cost', 'Status', 'Created At'];
    filename = 'Purchase_Requisitions.csv';
  } else {
    data = DB.get('pos').filter(p => p.companyId === currentUser.id);
    headers = ['ID', 'PR ID', 'Material', 'Quantity', 'Unit', 'Vendor', 'Unit Price', 'Total Amount', 'Delivery Date', 'Status'];
    filename = 'Purchase_Orders.csv';
  }
  if (!data.length) { toast('No data to export', 'warning'); return; }
  const rows = type === 'pr'
    ? data.map(r => [r.id, r.material, r.quantity, r.unit, r.department, r.priority, r.requiredDate, r.estimatedCost, r.status, r.createdAt].join(','))
    : data.map(r => [r.id, r.prId, r.material, r.quantity, r.unit, r.vendorName, r.unitPrice, r.totalAmount, r.deliveryDate, r.status].join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename;
  a.click();
  toast('CSV exported: ' + filename, 'success');
}

/* ===== THEME ===== */
function toggleTheme() {
  document.body.classList.toggle('dark');
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
}

function applyTheme() {
  if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark');
}

/* ===== MODALS ===== */
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
window.onclick = e => { if (e.target.classList.contains('modal-overlay')) e.target.classList.add('hidden'); };

/* ===== HELPERS ===== */
function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

function toast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type;
  setTimeout(() => t.classList.add('hidden'), 3500);
}

function statusBadge(status) {
  const map = {
    'Pending': 'status-pending', 'Approved': 'status-approved', 'Rejected': 'status-rejected',
    'Converted to PO': 'status-converted', 'Sent to Vendor': 'status-sent',
    'Accepted': 'status-accepted', 'Goods Received': 'status-received',
    'Invoice Submitted': 'status-invoiced', 'Invoice Paid': 'status-paid'
  };
  return `<span class="status ${map[status] || ''}">${status}</span>`;
}

function formatDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
function formatTime(t) { if (!t) return ''; return new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }

function getLast6Months() {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(d.toISOString().slice(0, 7));
  }
  return months;
}

function updateHomeStats() {
  const users = DB.get('users');
  const prs = DB.get('prs');
  const pos = DB.get('pos');
  animateNum('hs-pr', prs.length);
  animateNum('hs-po', pos.length);
  animateNum('hs-vendor', users.filter(u => u.role === 'vendor').length);
  animateNum('hs-paid', pos.filter(p => p.status === 'Invoice Paid').length);
}

function animateNum(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let cur = 0;
  const step = Math.ceil(target / 30);
  const t = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = cur;
    if (cur >= target) clearInterval(t);
  }, 40);
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
function toggleVSidebar() { document.getElementById('vsidebar').classList.toggle('open'); }
