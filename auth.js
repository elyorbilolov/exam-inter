// =========================================================
// DEVICE-BASED ACCESS CONTROL & ADMIN APPROVAL SYSTEM (v8.0)
// =========================================================

const ACCESS_CONFIG = {
    CLOUD_API_URL: "https://api.restful-api.dev/objects/ff808181a067127101a07b81e99d3485",
    ADMIN_DEFAULT_KEY: "admin777", // Bosh Administrator Paroli
    CHECK_INTERVAL_MS: 3500 // O'quvchi kutayotganda har 3.5 soniyada ruxsatni tekshirish
};

// Generates persistent stable device identifier
function getOrCreateDeviceId() {
    let devId = localStorage.getItem('exam_device_id');
    if (!devId) {
        const screenStr = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
        const navStr = `${navigator.userAgent}-${navigator.language}`;
        const randStr = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
        devId = 'dev_' + btoa(screenStr + '|' + navStr + '|' + randStr).replace(/[^a-zA-Z0-9]/g, '').substring(0, 22);
        localStorage.setItem('exam_device_id', devId);
    }
    return devId;
}

// Get readable device info (e.g. "iPhone 14 (Safari)" or "Android (Chrome)")
function detectDeviceInfo() {
    const ua = navigator.userAgent;
    let model = "Noma'lum Gadjet";

    if (/iPhone/i.test(ua)) model = "Apple iPhone";
    else if (/iPad/i.test(ua)) model = "Apple iPad";
    else if (/Android/i.test(ua)) {
        const match = ua.match(/Android\s([0-9\.]+);?\s?([^;\)]+)?/);
        model = match && match[2] ? `Android (${match[2].trim()})` : "Android Telefon";
    }
    else if (/Windows NT 10.0/i.test(ua)) model = "Windows 10/11 Kompyuter";
    else if (/Windows/i.test(ua)) model = "Windows PC";
    else if (/Macintosh/i.test(ua)) model = "Apple Mac";
    else if (/Linux/i.test(ua)) model = "Linux Qurilma";

    return model;
}

// Global Device Access State
window.CurrentAccess = null;
let pollTimer = null;

// Cloud Sync Store
const CloudStore = {
    async getData() {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(ACCESS_CONFIG.CLOUD_API_URL, { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) {
                const json = await res.json();
                if (json && json.data) {
                    localStorage.setItem('cached_access_data', JSON.stringify(json.data));
                    return json.data;
                }
            }
        } catch(e) {
            console.warn("Cloud fetch error, using local fallback");
        }
        return JSON.parse(localStorage.getItem('cached_access_data') || '{"devices":{},"requests":{}}');
    },

    async saveData(data) {
        localStorage.setItem('cached_access_data', JSON.stringify(data));
        try {
            await fetch(ACCESS_CONFIG.CLOUD_API_URL, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'exam_inter_device_auth',
                    data: data
                })
            });
        } catch(e) {
            console.error("Cloud save error:", e);
        }
    }
};

// ==========================================
// CORE ACCESS CHECK (AUTO-LOGIN OR PROMPT)
// ==========================================
async function initAccessControl() {
    const devId = getOrCreateDeviceId();
    const isAdmin = localStorage.getItem('is_admin_device') === 'true';

    // 1. Agar admin qurilmasi bo'lsa
    if (isAdmin) {
        window.CurrentAccess = { isAdmin: true, name: 'Bosh Administrator' };
        injectAdminBadge();
        return;
    }

    // 2. Bulutli bazadan ushbu qurilma ruxsatini tekshiramiz
    const store = await CloudStore.getData();
    const approvedDevice = store.devices && store.devices[devId];

    if (approvedDevice && approvedDevice.status === 'active') {
        // Ushbu qurilmaga ruxsat berilgan!
        window.CurrentAccess = {
            isAdmin: false,
            deviceId: devId,
            fullName: approvedDevice.fullName
        };
        injectUserBadge(approvedDevice.fullName);
        startDeviceHeartbeat(devId);
        return;
    }

    // 3. Agar ruxsat berilmagan bo'lsa, kirish so'rash modalini chiqaramiz
    showAccessRequestModal(store.requests && store.requests[devId]);
}

// ==========================================
// ACCESS REQUEST MODAL (FOR STUDENTS)
// ==========================================
function showAccessRequestModal(existingRequest) {
    if (document.getElementById('access-modal-overlay')) return;

    const modal = document.createElement('div');
    modal.id = 'access-modal-overlay';
    modal.className = 'auth-modal-overlay';

    const isPending = existingRequest && existingRequest.status === 'pending';
    const isRejected = existingRequest && existingRequest.status === 'rejected';

    modal.innerHTML = `
        <div class="auth-modal-card">
            <div class="auth-logo">
                <span class="auth-lock-icon">${isPending ? '⏳' : '📱'}</span>
                <h2>${isPending ? 'Ruxsat Kutilmoqda...' : 'Kirish Uchun Ruxsat'}</h2>
                <p id="access-subtext">
                    ${isPending 
                        ? `Hurmatli <strong>${existingRequest.fullName}</strong>, sizning ushbu gadjetingizdan kirish so'rovingiz adminga yuborildi. Administrator tasdiqlashini kuting.`
                        : "Ushbu gadjetdan kirish uchun ism va familiyangizni yozib so'rov yuboring."
                    }
                </p>
            </div>

            ${isRejected ? `<div class="auth-error-msg">Sizning so'rovingiz admin tomonidan rad etilgan! Qaytadan so'rov yuborishingiz mumkin.</div>` : ''}

            <!-- Form: agar so'rov hali yuborilmagan bo'lsa -->
            <form id="access-request-form" class="auth-form" style="${isPending ? 'display: none;' : 'display: flex;'}">
                <div class="auth-input-group">
                    <label for="req-fullname">Ism va Familiyangiz</label>
                    <input type="text" id="req-fullname" placeholder="Masalan: Jasur Rahimov" required value="${existingRequest ? existingRequest.fullName : ''}">
                </div>

                <div class="device-detected-badge">
                    <span>📱 Gadjetingiz:</span>
                    <strong>${detectDeviceInfo()}</strong>
                </div>

                <button type="submit" id="send-req-btn" class="auth-submit-btn">
                    🚀 Admindan Ruxsat So'rash
                </button>
            </form>

            <!-- Waiting Indicator: agar so'rov yuborilgan bo'lsa -->
            <div id="waiting-status-box" style="${isPending ? 'display: flex;' : 'display: none;'}; flex-direction: column; gap: 12px; align-items: center;">
                <div class="pulse-loader"></div>
                <p style="font-size: 0.85rem; color: #10b981; font-weight: 600;">
                    🟢 So'rov adminga yuborilgan. Tasdiqlanishi bilan sahifa o'z-o'zidan ochiladi...
                </p>
                <button type="button" id="cancel-req-btn" class="tbl-btn" style="padding: 6px 14px; margin-top: 5px;">
                    Ismni o'zgartirish
                </button>
            </div>

            <div class="auth-footer-help" style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.78rem; color: var(--text-sub);">English Exam Himoyasi</span>
                <button type="button" id="admin-login-secret-btn" class="admin-secret-link" title="Faqat Administrator uchun">
                    🔒 Admin Kirish
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Agar so'rov kutilayotgan bo'lsa, tekshiruvni boshlaymiz
    if (isPending) {
        startPollingForApproval();
    }

    // Submit Request
    const form = document.getElementById('access-request-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('req-fullname').value.trim();
        if (!fullName) return;

        const btn = document.getElementById('send-req-btn');
        btn.disabled = true;
        btn.textContent = "Yuborilmoqda...";

        const devId = getOrCreateDeviceId();
        const devInfo = detectDeviceInfo();

        const store = await CloudStore.getData();
        if (!store.requests) store.requests = {};

        store.requests[devId] = {
            deviceId: devId,
            fullName: fullName,
            deviceInfo: devInfo,
            status: 'pending',
            requestedAt: Date.now(),
            lastSeen: Date.now()
        };

        await CloudStore.saveData(store);

        // Switch to waiting state
        form.style.display = 'none';
        document.getElementById('waiting-status-box').style.display = 'flex';
        document.getElementById('access-subtext').innerHTML = `Hurmatli <strong>${fullName}</strong>, sizning ushbu gadjetingizdan kirish so'rovingiz adminga yuborildi. Administrator tasdiqlashini kuting.`;

        startPollingForApproval();
    });

    // Cancel / Edit Name
    document.getElementById('cancel-req-btn').addEventListener('click', () => {
        if (pollTimer) clearInterval(pollTimer);
        document.getElementById('waiting-status-box').style.display = 'none';
        form.style.display = 'flex';
    });

    // Secret Admin Login
    document.getElementById('admin-login-secret-btn').addEventListener('click', promptAdminPassword);
}

// O'quvchi kutayotganda admin ruxsat berganini avtomatik aniqlash
function startPollingForApproval() {
    if (pollTimer) clearInterval(pollTimer);
    const devId = getOrCreateDeviceId();

    pollTimer = setInterval(async () => {
        const store = await CloudStore.getData();

        // 1. Ruxsat berildimi?
        if (store.devices && store.devices[devId] && store.devices[devId].status === 'active') {
            clearInterval(pollTimer);
            const modal = document.getElementById('access-modal-overlay');
            if (modal) {
                modal.innerHTML = `
                    <div class="auth-modal-card" style="text-align: center;">
                        <span style="font-size: 3rem;">🎉</span>
                        <h2>Ruxsat Berildi!</h2>
                        <p>Xush kelibsiz! Ushbu gadjetingiz uchun sayt to'liq ochildi.</p>
                    </div>
                `;
                setTimeout(() => {
                    location.reload();
                }, 1200);
            }
            return;
        }

        // 2. Rad etildimi?
        if (store.requests && store.requests[devId] && store.requests[devId].status === 'rejected') {
            clearInterval(pollTimer);
            location.reload();
        }
    }, ACCESS_CONFIG.CHECK_INTERVAL_MS);
}

// ==========================================
// ADMIN LOGIN & MANAGEMENT
// ==========================================
function promptAdminPassword() {
    const entered = prompt("Bosh Administrator Parolini kiriting:");
    if (!entered) return;

    if (entered.trim() === ACCESS_CONFIG.ADMIN_DEFAULT_KEY) {
        localStorage.setItem('is_admin_device', 'true');
        alert("✅ Administrator sifatida qabul qilindingiz!");
        location.reload();
    } else {
        alert("❌ Parol noto'g'ri!");
    }
}

// Admin chiqish (Logout)
function adminLogout() {
    if (confirm("Admin boshqaruvidan chiqmoqchimisiz?")) {
        localStorage.removeItem('is_admin_device');
        location.reload();
    }
}

// Inject Admin Badge in Header
function injectAdminBadge() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions || document.getElementById('user-profile-badge')) return;

    const badge = document.createElement('div');
    badge.id = 'user-profile-badge';
    badge.className = 'user-profile-badge admin-badge';
    badge.innerHTML = `
        <span class="user-badge-name" style="color: #f59e0b; font-weight: 800;">👑 <span class="badge-role-text">ADMIN</span></span>
        <button id="open-admin-btn" class="admin-open-shortcut" title="Admin Paneli">⚙️<span class="admin-btn-text"> Boshqaruv</span></button>
        <button id="auth-logout-btn" class="logout-btn" title="Chiqish">🚪</button>
    `;
    headerActions.prepend(badge);

    document.getElementById('open-admin-btn').addEventListener('click', openAdminPanel);
    document.getElementById('auth-logout-btn').addEventListener('click', adminLogout);

    // Sahifa ochilganda admin panelni ko'rsatish
    openAdminPanel();
}

// Inject Student Badge in Header
function injectUserBadge(name) {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions || document.getElementById('user-profile-badge')) return;

    const badge = document.createElement('div');
    badge.id = 'user-profile-badge';
    badge.className = 'user-profile-badge student-badge';
    badge.innerHTML = `
        <span class="user-badge-name" title="${escapeQuotes(name)}">👤 <span class="student-name-text">${name}</span></span>
        <span class="online-indicator" title="Faol">🟢</span>
    `;
    headerActions.prepend(badge);
}

// Doimiy onlayn tekshiruvi (Heartbeat)
function startDeviceHeartbeat(devId) {
    setInterval(async () => {
        const store = await CloudStore.getData();
        // Agar admin ushbu qurilmani bloklab yoki o'chirib qo'ysa
        if (!store.devices || !store.devices[devId] || store.devices[devId].status !== 'active') {
            alert("Ushbu gadjet uchun ruxsat bekor qilindi!");
            location.reload();
            return;
        }

        // Onlayn vaqtini yangilash
        if (store.devices[devId]) {
            store.devices[devId].lastHeartbeat = Date.now();
            localStorage.setItem('cached_access_data', JSON.stringify(store));
        }
    }, 20000);
}

// ==========================================
// ADMIN DASHBOARD MODAL
// ==========================================
async function openAdminPanel() {
    let adminModal = document.getElementById('admin-modal-overlay');
    if (!adminModal) {
        adminModal = document.createElement('div');
        adminModal.id = 'admin-modal-overlay';
        adminModal.className = 'admin-modal-overlay';
        document.body.appendChild(adminModal);
    }

    adminModal.innerHTML = `
        <div class="admin-modal-container">
            <div class="admin-header">
                <div>
                    <h2>👑 Gadjetlarni Boshqarish</h2>
                    <p>Kirish so'rovlari, tasdiqlangan gadjetlar va onlayn nazorat</p>
                </div>
                <button class="admin-close-btn" onclick="document.getElementById('admin-modal-overlay').remove()" title="Yopish">✕</button>
            </div>

            <div class="admin-stats-bar">
                <div class="stat-card stat-pending">
                    <span class="stat-num" id="stat-pending-reqs">0</span>
                    <span class="stat-label">🔔 Kutilayotgan</span>
                </div>
                <div class="stat-card stat-approved">
                    <span class="stat-num" id="stat-approved-devices">0</span>
                    <span class="stat-label">📱 Gadjetlar</span>
                </div>
                <div class="stat-card stat-online">
                    <span class="stat-num" id="stat-online-now">0</span>
                    <span class="stat-label">🟢 Online</span>
                </div>
            </div>

            <div class="admin-content-grid">
                <!-- 1. Pending Requests Section -->
                <div class="admin-card">
                    <div class="table-header-row">
                        <h3>🔔 Yangi Kirish So'rovlari</h3>
                        <button id="refresh-admin-btn" class="refresh-btn">🔄 Yangilash</button>
                    </div>
                    <div class="table-responsive">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Foydalanuvchi va Gadjet</th>
                                    <th>Vaqt</th>
                                    <th style="text-align: right;">Qaror</th>
                                </tr>
                            </thead>
                            <tbody id="pending-requests-tbody">
                                <tr><td colspan="3" style="text-align: center; padding: 20px;">Yuklanmoqda...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 2. Approved Devices Section -->
                <div class="admin-card">
                    <h3>✅ Tasdiqlangan Gadjetlar Ro'yxati</h3>
                    <div class="table-responsive">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Foydalanuvchi va Gadjet</th>
                                    <th>Holat</th>
                                    <th style="text-align: right;">Boshqaruv</th>
                                </tr>
                            </thead>
                            <tbody id="approved-devices-tbody">
                                <tr><td colspan="3" style="text-align: center; padding: 20px;">Yuklanmoqda...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    loadAdminDashboard();
    document.getElementById('refresh-admin-btn').addEventListener('click', loadAdminDashboard);
}

// Render Admin Data
async function loadAdminDashboard() {
    const pendingTbody = document.getElementById('pending-requests-tbody');
    const approvedTbody = document.getElementById('approved-devices-tbody');
    if (!pendingTbody || !approvedTbody) return;

    const store = await CloudStore.getData();
    const requests = Object.values(store.requests || {});
    const devices = Object.values(store.devices || {});

    const now = Date.now();
    let onlineCount = 0;

    // 1. Render Pending Requests
    const pendingList = requests.filter(r => r.status === 'pending');
    document.getElementById('stat-pending-reqs').textContent = pendingList.length;

    if (pendingList.length === 0) {
        pendingTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: var(--text-sub);">Yangi so'rovlar yo'q. Barcha gadjetlar tasdiqlangan.</td></tr>`;
    } else {
        pendingTbody.innerHTML = pendingList.map(r => `
            <tr>
                <td>
                    <div style="font-weight: 700; font-size: 0.95rem;">${r.fullName}</div>
                    <div class="device-subtext">📱 ${r.deviceInfo}</div>
                </td>
                <td>
                    <span style="font-size: 0.82rem; font-weight: 600; opacity: 0.85;">${new Date(r.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </td>
                <td>
                    <div class="admin-actions-cell right-align">
                        <button class="tbl-btn btn-approve" onclick="approveDevice('${r.deviceId}', '${escapeQuotes(r.fullName)}', '${escapeQuotes(r.deviceInfo)}')">
                            ✅ Ruxsat
                        </button>
                        <button class="tbl-btn btn-reject" onclick="rejectDevice('${r.deviceId}')">
                            ❌ Rad
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // 2. Render Approved Devices
    document.getElementById('stat-approved-devices').textContent = devices.length;

    if (devices.length === 0) {
        approvedTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: var(--text-sub);">Hozircha tasdiqlangan gadjetlar yo'q.</td></tr>`;
    } else {
        approvedTbody.innerHTML = devices.map(d => {
            const isOnline = d.lastHeartbeat && (now - d.lastHeartbeat < 45000);
            if (isOnline) onlineCount++;

            const statusBadge = d.status === 'blocked'
                ? `<span class="badge badge-blocked">🚫 To'xtatilgan</span>`
                : (isOnline ? `<span class="badge badge-online">🟢 Online</span>` : `<span class="badge badge-offline">⚪ Oflayn</span>`);

            return `
                <tr>
                    <td>
                        <div style="font-weight: 700; font-size: 0.95rem;">${d.fullName}</div>
                        <div class="device-subtext">📱 ${d.deviceInfo} · <small style="opacity: 0.8;">${new Date(d.approvedAt).toLocaleDateString()}</small></div>
                    </td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="admin-actions-cell right-align">
                            <button class="tbl-btn btn-pause" onclick="toggleDeviceBlock('${d.deviceId}', '${d.status}')" title="${d.status === 'active' ? 'Vaqtincha to\'xtatish' : 'Qayta yoqish'}">
                                ${d.status === 'active' ? '⏸️ To\'xtatish' : '▶️ Yoqish'}
                            </button>
                            <button class="tbl-btn btn-delete" onclick="deleteDevice('${d.deviceId}', '${escapeQuotes(d.fullName)}')" title="Butunlay o'chirish">
                                🗑️ O'chirish
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    document.getElementById('stat-online-now').textContent = onlineCount;
}

function escapeQuotes(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Action: Ruxsat berish
window.approveDevice = async function(deviceId, fullName, deviceInfo) {
    const store = await CloudStore.getData();
    if (!store.devices) store.devices = {};
    if (!store.requests) store.requests = {};

    store.devices[deviceId] = {
        deviceId: deviceId,
        fullName: fullName,
        deviceInfo: deviceInfo,
        status: 'active',
        approvedAt: Date.now(),
        lastHeartbeat: Date.now()
    };

    if (store.requests[deviceId]) {
        store.requests[deviceId].status = 'approved';
    }

    await CloudStore.saveData(store);
    alert(`✅ ${fullName} ning gadjetiga ruxsat berildi! Uning ekrani darhol ochiladi.`);
    loadAdminDashboard();
};

// Action: Rad etish
window.rejectDevice = async function(deviceId) {
    if (confirm("Ushbu so'rovni rad etmoqchimisiz?")) {
        const store = await CloudStore.getData();
        if (store.requests && store.requests[deviceId]) {
            store.requests[deviceId].status = 'rejected';
        }
        await CloudStore.saveData(store);
        loadAdminDashboard();
    }
};

// Action: Gadjetni vaqtincha bloklash yoki ochish
window.toggleDeviceBlock = async function(deviceId, currentStatus) {
    const store = await CloudStore.getData();
    if (store.devices && store.devices[deviceId]) {
        store.devices[deviceId].status = currentStatus === 'active' ? 'blocked' : 'active';
        await CloudStore.saveData(store);
        loadAdminDashboard();
    }
};

// Action: Gadjetni butunlay o'chirish
window.deleteDevice = async function(deviceId, fullName) {
    if (confirm(`Haqiqatan ham ${fullName} ning ushbu gadjet ruxsatini butunlay o'chirmoqchimisiz?`)) {
        const store = await CloudStore.getData();
        if (store.devices) delete store.devices[deviceId];
        if (store.requests) delete store.requests[deviceId];
        await CloudStore.saveData(store);
        loadAdminDashboard();
    }
};

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initAccessControl();
});
