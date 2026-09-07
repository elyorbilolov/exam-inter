// =========================================================
// DEVICE-BASED ACCESS CONTROL & ADMIN APPROVAL SYSTEM (v8.3)
// Real-time Pub/Sub & Presence Tracking Powered by ntfy.sh
// =========================================================

const ACCESS_CONFIG = {
    PRESENCE_TOPIC: "exam_inter_presence_v83",
    REQUESTS_TOPIC: "exam_inter_requests_v83",
    APPROVALS_TOPIC: "exam_inter_approvals_v83",
    DEVICE_PREFIX: "exam_inter_dev_v83_",
    ADMIN_DEFAULT_KEY: "admin777",
    HEARTBEAT_INTERVAL_MS: 20000, // Har 20 soniyada o'quvchi online ekanligini bildiradi
    POLL_INTERVAL_MS: 3000        // Kutilayotganda tekshirish
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
let adminAutoRefreshTimer = null;

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

    // 2. Ushbu qurilma ilgari tasdiqlanganmi?
    let approvedDevice = null;
    try {
        approvedDevice = JSON.parse(localStorage.getItem('exam_student_approved'));
    } catch(e) {}

    // Eski keshdan migratsiya (agar mavjud bo'lsa)
    if (!approvedDevice) {
        try {
            const oldCache = JSON.parse(localStorage.getItem('cached_access_data'));
            if (oldCache && oldCache.devices && oldCache.devices[devId] && oldCache.devices[devId].status === 'active') {
                approvedDevice = oldCache.devices[devId];
                localStorage.setItem('exam_student_approved', JSON.stringify(approvedDevice));
            }
        } catch(e) {}
    }

    if (approvedDevice && approvedDevice.status === 'active') {
        // Ushbu qurilmaga ruxsat berilgan!
        window.CurrentAccess = {
            isAdmin: false,
            deviceId: devId,
            fullName: approvedDevice.fullName,
            deviceInfo: approvedDevice.deviceInfo || detectDeviceInfo()
        };
        injectUserBadge(approvedDevice.fullName);
        startDeviceHeartbeat(devId, approvedDevice.fullName, approvedDevice.deviceInfo || detectDeviceInfo());
        return;
    }

    // 3. Agar ruxsat berilmagan bo'lsa, kirish so'rash modalini chiqaramiz
    let existingRequest = null;
    try {
        existingRequest = JSON.parse(localStorage.getItem('exam_student_request'));
    } catch(e) {}

    showAccessRequestModal(existingRequest);
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
        startPollingForApproval(getOrCreateDeviceId(), existingRequest.fullName, detectDeviceInfo());
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

        const reqData = {
            action: 'request',
            deviceId: devId,
            fullName: fullName,
            deviceInfo: devInfo,
            requestedAt: Date.now()
        };

        // Save locally
        localStorage.setItem('exam_student_request', JSON.stringify({
            status: 'pending',
            fullName: fullName,
            deviceInfo: devInfo,
            requestedAt: Date.now()
        }));

        // Send to ntfy requests topic
        try {
            await fetch(`https://ntfy.sh/${ACCESS_CONFIG.REQUESTS_TOPIC}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reqData)
            });
        } catch(err) {
            console.warn("Request send error:", err);
        }

        // Switch to waiting state
        form.style.display = 'none';
        document.getElementById('waiting-status-box').style.display = 'flex';
        document.getElementById('access-subtext').innerHTML = `Hurmatli <strong>${fullName}</strong>, sizning ushbu gadjetingizdan kirish so'rovingiz adminga yuborildi. Administrator tasdiqlashini kuting.`;

        startPollingForApproval(devId, fullName, devInfo);
    });

    // Cancel / Edit Name
    document.getElementById('cancel-req-btn').addEventListener('click', () => {
        if (pollTimer) clearInterval(pollTimer);
        document.getElementById('waiting-status-box').style.display = 'none';
        form.style.display = 'flex';
        const btn = document.getElementById('send-req-btn');
        btn.disabled = false;
        btn.textContent = "🚀 Admindan Ruxsat So'rash";
    });

    // Secret Admin Login
    document.getElementById('admin-login-secret-btn').addEventListener('click', promptAdminPassword);
}

// O'quvchi kutayotganda admin ruxsat berganini avtomatik aniqlash
function startPollingForApproval(devId, fullName, devInfo) {
    if (pollTimer) clearInterval(pollTimer);

    pollTimer = setInterval(async () => {
        try {
            const res = await fetch(`https://ntfy.sh/${ACCESS_CONFIG.DEVICE_PREFIX}${devId}/json?poll=1&since=24h`, {
                cache: 'no-store'
            });
            if (res.ok) {
                const text = await res.text();
                const lines = text.trim().split('\n').filter(Boolean);
                for (let i = lines.length - 1; i >= 0; i--) {
                    try {
                        const parsed = JSON.parse(lines[i]);
                        const msg = typeof parsed.message === 'string' ? JSON.parse(parsed.message) : parsed.message;
                        
                        if (msg && msg.action === 'approve') {
                            clearInterval(pollTimer);
                            // Save approved access locally forever
                            localStorage.setItem('exam_student_approved', JSON.stringify({
                                status: 'active',
                                deviceId: devId,
                                fullName: msg.fullName || fullName,
                                deviceInfo: msg.deviceInfo || devInfo,
                                approvedAt: msg.approvedAt || Date.now()
                            }));
                            localStorage.removeItem('exam_student_request');

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
                        } else if (msg && msg.action === 'reject') {
                            clearInterval(pollTimer);
                            localStorage.setItem('exam_student_request', JSON.stringify({
                                status: 'rejected',
                                fullName: fullName,
                                deviceInfo: devInfo
                            }));
                            location.reload();
                            return;
                        }
                    } catch(e) {}
                }
            }
        } catch(err) {
            // silent network retry
        }
    }, ACCESS_CONFIG.POLL_INTERVAL_MS);
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

// Doimiy onlayn tekshiruvi (Heartbeat va revoke tekshiruvi)
function startDeviceHeartbeat(devId, fullName, deviceInfo) {
    const ping = () => {
        fetch(`https://ntfy.sh/${ACCESS_CONFIG.PRESENCE_TOPIC}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                devId: devId,
                fullName: fullName,
                deviceInfo: deviceInfo,
                time: Date.now()
            })
        }).catch(() => {});
    };

    // Darhol birinchi pingni yuboramiz
    ping();

    // Har 20 soniyada takrorlaymiz
    setInterval(async () => {
        ping();

        // Admin tomonidan bloklangan yoki o'chirilganini tekshirish
        try {
            const res = await fetch(`https://ntfy.sh/${ACCESS_CONFIG.DEVICE_PREFIX}${devId}/json?poll=1&since=5m`, {
                cache: 'no-store'
            });
            if (res.ok) {
                const text = await res.text();
                const lines = text.trim().split('\n').filter(Boolean);
                for (let i = lines.length - 1; i >= 0; i--) {
                    try {
                        const parsed = JSON.parse(lines[i]);
                        const msg = typeof parsed.message === 'string' ? JSON.parse(parsed.message) : parsed.message;
                        if (msg && (msg.action === 'block' || msg.action === 'delete')) {
                            localStorage.removeItem('exam_student_approved');
                            alert("Ushbu gadjet uchun ruxsat bekor qilindi!");
                            location.reload();
                            return;
                        }
                    } catch(e) {}
                }
            }
        } catch(e) {}
    }, ACCESS_CONFIG.HEARTBEAT_INTERVAL_MS);

    // Tabga qaytganda ham yangilash
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) ping();
    });
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
                    <p>Kirish so'rovlari, tasdiqlangan gadjetlar va real-vaqt onlayn nazorat</p>
                </div>
                <button class="admin-close-btn" id="close-admin-panel-btn" title="Yopish">✕</button>
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

    document.getElementById('close-admin-panel-btn').addEventListener('click', () => {
        if (adminAutoRefreshTimer) clearInterval(adminAutoRefreshTimer);
        const m = document.getElementById('admin-modal-overlay');
        if (m) m.remove();
    });

    document.getElementById('refresh-admin-btn').addEventListener('click', loadAdminDashboard);

    // Initial load
    await loadAdminDashboard();

    // Auto-refresh every 5 seconds while modal is open
    if (adminAutoRefreshTimer) clearInterval(adminAutoRefreshTimer);
    adminAutoRefreshTimer = setInterval(loadAdminDashboard, 5000);
}

// Local Admin Storage Helper
function getLocalAdminData() {
    let devices = {};
    let rejected = {};
    try {
        devices = JSON.parse(localStorage.getItem('exam_admin_devices_v83')) || {};
    } catch(e) {}
    try {
        rejected = JSON.parse(localStorage.getItem('exam_admin_rejected_v83')) || {};
    } catch(e) {}
    return { devices, rejected };
}

function saveLocalAdminData(devices, rejected) {
    if (devices) localStorage.setItem('exam_admin_devices_v83', JSON.stringify(devices));
    if (rejected) localStorage.setItem('exam_admin_rejected_v83', JSON.stringify(rejected));
}

// Render Admin Data
async function loadAdminDashboard() {
    const pendingTbody = document.getElementById('pending-requests-tbody');
    const approvedTbody = document.getElementById('approved-devices-tbody');
    if (!pendingTbody || !approvedTbody) return;

    const { devices, rejected } = getLocalAdminData();

    // 1. Bulutdan barcha tasdiqlangan gadjetlarni sinxronlashtirish
    try {
        const appRes = await fetch(`https://ntfy.sh/${ACCESS_CONFIG.APPROVALS_TOPIC}/json?poll=1&since=all`, {
            cache: 'no-store'
        });
        if (appRes.ok) {
            const text = await appRes.text();
            const lines = text.trim().split('\n').filter(Boolean);
            for (const line of lines) {
                try {
                    const parsed = JSON.parse(line);
                    const msg = typeof parsed.message === 'string' ? JSON.parse(parsed.message) : parsed.message;
                    if (msg && msg.deviceId && msg.action === 'approve') {
                        if (!devices[msg.deviceId]) {
                            devices[msg.deviceId] = {
                                deviceId: msg.deviceId,
                                fullName: msg.fullName,
                                deviceInfo: msg.deviceInfo,
                                status: 'active',
                                approvedAt: msg.approvedAt || (parsed.time * 1000)
                            };
                        }
                    }
                } catch(e) {}
            }
            saveLocalAdminData(devices, rejected);
        }
    } catch(e) {}

    // 2. Real-vaqtda ONLAYN bo'lgan gadjetlarni aniqlash (so'nggi 2 daqiqadagi faollar)
    const onlineMap = new Map();
    try {
        const presRes = await fetch(`https://ntfy.sh/${ACCESS_CONFIG.PRESENCE_TOPIC}/json?poll=1&since=2m`, {
            cache: 'no-store'
        });
        if (presRes.ok) {
            const text = await presRes.text();
            const lines = text.trim().split('\n').filter(Boolean);
            for (const line of lines) {
                try {
                    const parsed = JSON.parse(line);
                    const msg = typeof parsed.message === 'string' ? JSON.parse(parsed.message) : parsed.message;
                    if (msg && msg.devId) {
                        onlineMap.set(msg.devId, {
                            devId: msg.devId,
                            fullName: msg.fullName,
                            deviceInfo: msg.deviceInfo,
                            lastSeen: msg.time || (parsed.time * 1000)
                        });
                    }
                } catch(e) {}
            }
        }
    } catch(e) {
        console.warn("Presence check failed:", e);
    }

    // 3. Yangi kirish so'rovlarini olish (so'nggi 72 soat)
    let pendingRequests = [];
    try {
        const reqRes = await fetch(`https://ntfy.sh/${ACCESS_CONFIG.REQUESTS_TOPIC}/json?poll=1&since=72h`, {
            cache: 'no-store'
        });
        if (reqRes.ok) {
            const text = await reqRes.text();
            const lines = text.trim().split('\n').filter(Boolean);
            const reqMap = new Map();
            for (const line of lines) {
                try {
                    const parsed = JSON.parse(line);
                    const msg = typeof parsed.message === 'string' ? JSON.parse(parsed.message) : parsed.message;
                    if (msg && msg.deviceId && msg.action === 'request') {
                        reqMap.set(msg.deviceId, {
                            deviceId: msg.deviceId,
                            fullName: msg.fullName,
                            deviceInfo: msg.deviceInfo,
                            requestedAt: msg.requestedAt || (parsed.time * 1000)
                        });
                    }
                } catch(e) {}
            }

            // Tasdiqlangan yoki rad etilganlarni ajratish
            for (const [id, req] of reqMap.entries()) {
                if (!devices[id] && !rejected[id]) {
                    pendingRequests.push(req);
                }
            }
        }
    } catch(e) {
        console.warn("Requests fetch failed:", e);
    }

    // Agar onlineMap da bor bo'lsa, lekin hali devices ro'yxatida ko'rinmayotgan bo'lsa, avtomatik qo'shish
    for (const [onlineDevId, onlineInfo] of onlineMap.entries()) {
        if (!devices[onlineDevId] && !rejected[onlineDevId]) {
            devices[onlineDevId] = {
                deviceId: onlineDevId,
                fullName: onlineInfo.fullName || "Foydalanuvchi",
                deviceInfo: onlineInfo.deviceInfo || "Gadjet",
                status: 'active',
                approvedAt: onlineInfo.lastSeen || Date.now()
            };
        }
    }
    saveLocalAdminData(devices, rejected);

    // 4. Statistikani yangilash
    const approvedList = Object.values(devices);
    let onlineCount = 0;

    approvedList.forEach(d => {
        if (onlineMap.has(d.deviceId) && d.status === 'active') {
            onlineCount++;
        }
    });

    const statPendingEl = document.getElementById('stat-pending-reqs');
    const statApprovedEl = document.getElementById('stat-approved-devices');
    const statOnlineEl = document.getElementById('stat-online-now');
    if (statPendingEl) statPendingEl.textContent = pendingRequests.length;
    if (statApprovedEl) statApprovedEl.textContent = approvedList.length;
    if (statOnlineEl) statOnlineEl.textContent = onlineCount;

    // 5. Render Pending Requests Table
    if (pendingRequests.length === 0) {
        pendingTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: var(--text-sub);">Yangi so'rovlar yo'q. Barcha gadjetlar tasdiqlangan.</td></tr>`;
    } else {
        pendingTbody.innerHTML = pendingRequests.map(r => `
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

    // 6. Render Approved Devices Table
    if (approvedList.length === 0) {
        approvedTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: var(--text-sub);">Hozircha tasdiqlangan gadjetlar yo'q.</td></tr>`;
    } else {
        approvedTbody.innerHTML = approvedList.map(d => {
            const isOnline = onlineMap.has(d.deviceId) && d.status === 'active';
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
}

function escapeQuotes(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Action: Ruxsat berish
window.approveDevice = async function(deviceId, fullName, deviceInfo) {
    const { devices, rejected } = getLocalAdminData();
    delete rejected[deviceId];

    const approvedData = {
        deviceId: deviceId,
        fullName: fullName,
        deviceInfo: deviceInfo,
        status: 'active',
        approvedAt: Date.now()
    };
    devices[deviceId] = approvedData;
    saveLocalAdminData(devices, rejected);

    // Direct student notification via private topic
    fetch(`https://ntfy.sh/${ACCESS_CONFIG.DEVICE_PREFIX}${deviceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'approve',
            deviceId: deviceId,
            fullName: fullName,
            deviceInfo: deviceInfo,
            approvedAt: Date.now()
        })
    }).catch(() => {});

    // Broadcast approval for cross-admin syncing
    fetch(`https://ntfy.sh/${ACCESS_CONFIG.APPROVALS_TOPIC}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'approve',
            deviceId: deviceId,
            fullName: fullName,
            deviceInfo: deviceInfo,
            approvedAt: Date.now()
        })
    }).catch(() => {});

    alert(`✅ ${fullName} ning gadjetiga ruxsat berildi! Uning ekrani darhol ochiladi.`);
    loadAdminDashboard();
};

// Action: Rad etish
window.rejectDevice = async function(deviceId) {
    if (confirm("Ushbu so'rovni rad etmoqchimisiz?")) {
        const { devices, rejected } = getLocalAdminData();
        rejected[deviceId] = true;
        saveLocalAdminData(devices, rejected);

        fetch(`https://ntfy.sh/${ACCESS_CONFIG.DEVICE_PREFIX}${deviceId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'reject',
                deviceId: deviceId
            })
        }).catch(() => {});

        loadAdminDashboard();
    }
};

// Action: Gadjetni vaqtincha bloklash yoki ochish
window.toggleDeviceBlock = async function(deviceId, currentStatus) {
    const { devices, rejected } = getLocalAdminData();
    if (devices[deviceId]) {
        const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
        devices[deviceId].status = newStatus;
        saveLocalAdminData(devices, rejected);

        fetch(`https://ntfy.sh/${ACCESS_CONFIG.DEVICE_PREFIX}${deviceId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: newStatus === 'blocked' ? 'block' : 'unblock',
                deviceId: deviceId
            })
        }).catch(() => {});

        loadAdminDashboard();
    }
};

// Action: Gadjetni butunlay o'chirish
window.deleteDevice = async function(deviceId, fullName) {
    if (confirm(`Haqiqatan ham ${fullName} ning ushbu gadjet ruxsatini butunlay o'chirmoqchimisiz?`)) {
        const { devices, rejected } = getLocalAdminData();
        delete devices[deviceId];
        saveLocalAdminData(devices, rejected);

        fetch(`https://ntfy.sh/${ACCESS_CONFIG.DEVICE_PREFIX}${deviceId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'delete',
                deviceId: deviceId
            })
        }).catch(() => {});

        loadAdminDashboard();
    }
};

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initAccessControl();
});
