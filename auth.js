// =========================================================
// DEVICE-BASED ACCESS CONTROL & ADMIN APPROVAL SYSTEM (v8.5)
// High-Reliability Real-Time Pub/Sub & Presence Tracking
// =========================================================

const ACCESS_CONFIG = {
    PUB_KEY: "demo",
    SUB_KEY: "demo",
    BASE_URL: "https://ps.pndsn.com",
    CHANNEL_REQUESTS: "exam_inter_v84_requests",
    CHANNEL_APPROVALS: "exam_inter_v84_approvals",
    CHANNEL_PRESENCE: "exam_inter_v84_presence",
    CHANNEL_DEV_PREFIX: "exam_inter_v84_dev_",
    ADMIN_DEFAULT_KEY: "admin777",
    PRESENCE_INTERVAL_MS: 30000,
    POLL_INTERVAL_MS: 3000
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
let adminMonitorTimer = null;

// Real-Time Cloud Communication Helper
const Cloud = {
    async publish(channel, message) {
        try {
            const bodyStr = encodeURIComponent(JSON.stringify(message));
            const url = `${ACCESS_CONFIG.BASE_URL}/publish/${ACCESS_CONFIG.PUB_KEY}/${ACCESS_CONFIG.SUB_KEY}/0/${channel}/0/${bodyStr}`;
            const res = await fetch(url, { cache: 'no-store' });
            return res.ok;
        } catch(e) {
            console.warn("Cloud publish error:", e);
            return false;
        }
    },

    async getHistory(channel, count = 50) {
        try {
            const url = `${ACCESS_CONFIG.BASE_URL}/v2/history/sub-key/${ACCESS_CONFIG.SUB_KEY}/channel/${channel}?count=${count}`;
            const res = await fetch(url, { cache: 'no-store' });
            if (res.ok) {
                const json = await res.json();
                return Array.isArray(json) && Array.isArray(json[0]) ? json[0] : [];
            }
        } catch(e) {
            console.warn("Cloud getHistory error:", e);
        }
        return [];
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

    // 2. Ushbu qurilma ilgari tasdiqlanganmi?
    let approvedDevice = null;
    try {
        approvedDevice = JSON.parse(localStorage.getItem('exam_student_approved'));
    } catch(e) {}

    // Eski keshdan migratsiya
    if (!approvedDevice) {
        try {
            const oldCache = JSON.parse(localStorage.getItem('cached_access_data'));
            if (oldCache && oldCache.devices && oldCache.devices[devId] && oldCache.devices[devId].status === 'active') {
                approvedDevice = oldCache.devices[devId];
                localStorage.setItem('exam_student_approved', JSON.stringify(approvedDevice));
            }
        } catch(e) {}
    }

    // Agar tasdiqlangan bo'lsa, bulutdan admin uni o'chirgani yoki bloklaganini tekshiramiz
    if (approvedDevice) {
        try {
            const msgs = await Cloud.getHistory(ACCESS_CONFIG.CHANNEL_DEV_PREFIX + devId, 10);
            for (let i = msgs.length - 1; i >= 0; i--) {
                const msg = msgs[i];
                if (msg) {
                    if (msg.action === 'delete') {
                        localStorage.removeItem('exam_student_approved');
                        localStorage.removeItem('exam_student_request');
                        approvedDevice = null;
                        break;
                    } else if (msg.action === 'block') {
                        approvedDevice.status = 'blocked';
                        localStorage.setItem('exam_student_approved', JSON.stringify(approvedDevice));
                        break;
                    } else if (msg.action === 'unblock' || msg.action === 'approve') {
                        approvedDevice.status = 'active';
                        localStorage.setItem('exam_student_approved', JSON.stringify(approvedDevice));
                        break;
                    }
                }
            }
        } catch(e) {}
    }

    // Agar bloklangan bo'lsa
    if (approvedDevice && approvedDevice.status === 'blocked') {
        showBlockedModal(approvedDevice.fullName, devId);
        return;
    }

    // Agar faol ruxsat berilgan bo'lsa
    if (approvedDevice && approvedDevice.status === 'active') {
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

// Bloklangan holat modali
function showBlockedModal(fullName, devId) {
    if (document.getElementById('access-modal-overlay')) return;
    const modal = document.createElement('div');
    modal.id = 'access-modal-overlay';
    modal.className = 'auth-modal-overlay';
    modal.innerHTML = `
        <div class="auth-modal-card" style="text-align: center;">
            <span style="font-size: 3.2rem;">🚫</span>
            <h2>Kirish To'xtatilgan</h2>
            <p>Hurmatli <strong>${escapeQuotes(fullName)}</strong>, ushbu gadjetingiz uchun kirish administrator tomonidan vaqtincha to'xtatilgan.</p>
            <p style="font-size: 0.85rem; color: var(--text-sub); margin-top: 14px;">Administrator qayta yoqqanida sahifa avtomatik ochiladi.</p>
        </div>
    `;
    document.body.appendChild(modal);

    const checkTimer = setInterval(async () => {
        try {
            const msgs = await Cloud.getHistory(ACCESS_CONFIG.CHANNEL_DEV_PREFIX + devId, 5);
            for (let i = msgs.length - 1; i >= 0; i--) {
                const msg = msgs[i];
                if (msg && (msg.action === 'unblock' || msg.action === 'approve')) {
                    clearInterval(checkTimer);
                    let app = JSON.parse(localStorage.getItem('exam_student_approved') || '{}');
                    app.status = 'active';
                    localStorage.setItem('exam_student_approved', JSON.stringify(app));
                    location.reload();
                    return;
                } else if (msg && msg.action === 'delete') {
                    clearInterval(checkTimer);
                    localStorage.removeItem('exam_student_approved');
                    localStorage.removeItem('exam_student_request');
                    location.reload();
                    return;
                }
            }
        } catch(e) {}
    }, 4000);
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

            <!-- Request Form (Visible if not pending) -->
            <form id="access-request-form" class="auth-form" style="${isPending ? 'display: none;' : ''}">
                <div class="input-group">
                    <label for="req-fullname">Familiya va Ismingiz</label>
                    <input type="text" id="req-fullname" required placeholder="Masalan: Karimov Jasur" value="${existingRequest ? existingRequest.fullName || '' : ''}">
                </div>
                <div class="device-auto-info">
                    <small>Gadjetingiz: <strong>${detectDeviceInfo()}</strong></small>
                </div>
                <button type="submit" id="send-req-btn" class="auth-btn-primary">
                    🚀 Admindan Ruxsat So'rash
                </button>
            </form>

            <!-- Waiting Status (Visible if pending) -->
            <div id="waiting-status-box" class="waiting-box" style="${isPending ? 'display: flex;' : 'display: none;'}">
                <div class="pulsing-spinner"></div>
                <p class="waiting-title">Administrator tasdiqlashi kutilmoqda...</p>
                <p class="waiting-hint">Admin ruxsat bergach, ushbu sahifa <strong>avtomatik ochiladi</strong>. Qayta so'rov yuborishingiz shart emas.</p>
                <button id="cancel-req-btn" class="auth-btn-secondary" style="margin-top: 15px;">
                    ✏️ Ismni o'zgartirish / Qayta yuborish
                </button>
            </div>

            ${isRejected ? `
                <div class="reject-banner" style="margin-top: 15px; padding: 10px; background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; border-radius: 8px; color: #ef4444; text-align: center; font-size: 0.85rem;">
                    ❌ Sizning oxirgi so'rovingiz admin tomonidan rad etildi. Qaytadan urinib ko'rishingiz mumkin.
                </div>
            ` : ''}

            <div class="admin-login-secret-link" style="margin-top: 20px; text-align: center;">
                <button id="admin-login-secret-btn" class="link-btn" style="background: none; border: none; color: var(--text-sub); font-size: 0.8rem; cursor: pointer; text-decoration: underline;">
                    🔑 Administrator Kirishi
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const devId = getOrCreateDeviceId();
    const devInfo = detectDeviceInfo();

    // If already pending, start listening for approval
    if (isPending) {
        startPollingForApproval(devId, existingRequest.fullName, devInfo);
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

        // Send to cloud requests channel
        await Cloud.publish(ACCESS_CONFIG.CHANNEL_REQUESTS, reqData);

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

// Student waiting for approval
function startPollingForApproval(devId, fullName, devInfo) {
    if (pollTimer) clearInterval(pollTimer);

    pollTimer = setInterval(async () => {
        try {
            const msgs = await Cloud.getHistory(ACCESS_CONFIG.CHANNEL_DEV_PREFIX + devId, 10);
            for (let i = msgs.length - 1; i >= 0; i--) {
                const msg = msgs[i];
                if (msg && msg.action === 'approve') {
                    clearInterval(pollTimer);
                    // Ruxsat berildi! LocalStorage ga doimiy saqlaymiz
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
            }
        } catch(err) {
            // silent retry
        }
    }, ACCESS_CONFIG.POLL_INTERVAL_MS);
}

// ==========================================
// ADMIN LOGIN & MONITORING
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

// Inject Admin Badge in Header with Live Request Counter
function injectAdminBadge() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions || document.getElementById('user-profile-badge')) return;

    const badge = document.createElement('div');
    badge.id = 'user-profile-badge';
    badge.className = 'user-profile-badge admin-badge';
    badge.innerHTML = `
        <span class="user-badge-name" style="color: #f59e0b; font-weight: 800;">👑 <span class="badge-role-text">ADMIN</span></span>
        <button id="open-admin-btn" class="admin-open-shortcut" title="Admin Paneli">
            ⚙️<span class="admin-btn-text"> Boshqaruv</span>
            <span id="header-req-badge" class="admin-req-badge" style="display: none;">0</span>
        </button>
        <button id="auth-logout-btn" class="logout-btn" title="Chiqish">🚪</button>
    `;
    headerActions.prepend(badge);

    document.getElementById('open-admin-btn').addEventListener('click', openAdminPanel);
    document.getElementById('auth-logout-btn').addEventListener('click', adminLogout);

    startAdminRequestMonitor();
}

// Live monitor: Yangi so'rov kelganida nastroyka tugmasida bildirishnoma ko'rsatish
function startAdminRequestMonitor() {
    if (adminMonitorTimer) clearInterval(adminMonitorTimer);

    const checkRequests = async () => {
        try {
            const { devices, rejected, deleted } = getLocalAdminData();

            // 1. Bulutdagi tasdiqlash, to'xtatish va o'chirishlarni sinxronlashtirish
            try {
                const approvals = await Cloud.getHistory(ACCESS_CONFIG.CHANNEL_APPROVALS, 60);
                approvals.forEach(msg => {
                    if (!msg || !msg.deviceId) return;
                    const id = msg.deviceId;
                    const msgTime = msg.timestamp || msg.approvedAt || 0;
                    const delTime = deleted[id] || 0;

                    if (msg.action === 'delete') {
                        delete devices[id];
                        if (msgTime >= delTime) {
                            deleted[id] = msgTime || Date.now();
                        }
                    } else if (msg.action === 'block') {
                        if (devices[id]) devices[id].status = 'blocked';
                    } else if (msg.action === 'unblock') {
                        if (devices[id]) devices[id].status = 'active';
                    } else if (msg.action === 'approve') {
                        if (!delTime || msgTime > delTime) {
                            delete deleted[id];
                            devices[id] = {
                                deviceId: id,
                                fullName: msg.fullName,
                                deviceInfo: msg.deviceInfo,
                                status: devices[id]?.status === 'blocked' ? 'blocked' : 'active',
                                approvedAt: msg.approvedAt || msgTime || Date.now()
                            };
                        }
                    }
                });
                saveLocalAdminData(devices, rejected, deleted);
            } catch(e) {}

            // 2. So'rovlarni olish va faol kutilayotganlarni hisoblash
            const reqs = await Cloud.getHistory(ACCESS_CONFIG.CHANNEL_REQUESTS, 40);
            const reqMap = new Map();
            reqs.forEach(r => {
                if (r && r.deviceId && r.action === 'request') {
                    reqMap.set(r.deviceId, r);
                }
            });

            let pendingCount = 0;
            for (const [id, req] of reqMap.entries()) {
                const reqTime = req.requestedAt || 0;
                const delTime = deleted[id] || 0;
                const rejTime = rejected[id] || 0;
                if (!devices[id] && (!delTime || reqTime > delTime) && (!rejTime || reqTime > rejTime)) {
                    pendingCount++;
                }
            }

            const badgeEl = document.getElementById('header-req-badge');
            if (badgeEl) {
                if (pendingCount > 0) {
                    badgeEl.style.display = 'inline-flex';
                    badgeEl.textContent = `${pendingCount}`;
                    badgeEl.title = `${pendingCount} ta yangi kirish so'rovi bor!`;
                } else {
                    badgeEl.style.display = 'none';
                }
            }
        } catch(e) {}
    };

    checkRequests();
    adminMonitorTimer = setInterval(checkRequests, 8000);
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
        const approved = localStorage.getItem('exam_student_approved');
        if (!approved) return;
        try {
            const data = JSON.parse(approved);
            if (data.status !== 'active') return;
        } catch(e) { return; }

        Cloud.publish(ACCESS_CONFIG.CHANNEL_PRESENCE, {
            devId: devId,
            fullName: fullName,
            deviceInfo: deviceInfo,
            time: Date.now()
        });
    };

    // Sahifa ochilganda yuborish
    ping();

    // Har 12 soniyada tekshirish va ping yuborish
    setInterval(async () => {
        try {
            const msgs = await Cloud.getHistory(ACCESS_CONFIG.CHANNEL_DEV_PREFIX + devId, 5);
            for (let i = msgs.length - 1; i >= 0; i--) {
                const msg = msgs[i];
                if (msg && msg.action === 'delete') {
                    localStorage.removeItem('exam_student_approved');
                    localStorage.removeItem('exam_student_request');
                    alert("Ushbu gadjet uchun ruxsat administrator tomonidan butunlay o'chirildi!");
                    location.reload();
                    return;
                } else if (msg && msg.action === 'block') {
                    let app = JSON.parse(localStorage.getItem('exam_student_approved') || '{}');
                    app.status = 'blocked';
                    localStorage.setItem('exam_student_approved', JSON.stringify(app));
                    alert("Ushbu gadjet uchun ruxsat administrator tomonidan vaqtincha to'xtatildi!");
                    location.reload();
                    return;
                }
            }
        } catch(e) {}

        ping();
    }, 12000);

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
                <div class="admin-header-title">
                    <h2>⚙️ Administrator Boshqaruv Markazi</h2>
                    <p>Gadjetlar orqali kirishni real-vaqtda boshqarish (v8.5)</p>
                </div>
                <button class="admin-close-btn" id="admin-close-btn" title="Yopish">✕</button>
            </div>

            <!-- Statistics Summary -->
            <div class="admin-stats-bar">
                <div class="stat-card pending">
                    <span class="stat-num" id="stat-pending-reqs">0</span>
                    <span class="stat-label">Kutilayotgan So'rovlar</span>
                </div>
                <div class="stat-card approved">
                    <span class="stat-num" id="stat-approved-devices">0</span>
                    <span class="stat-label">Tasdiqlangan Gadjetlar</span>
                </div>
                <div class="stat-card online">
                    <span class="stat-num" id="stat-online-now">0</span>
                    <span class="stat-label">Hozir Saytda (Onlayn)</span>
                </div>
            </div>

            <div class="admin-content-grid">
                <!-- 1. Yangi Kirish So'rovlari -->
                <div class="admin-card">
                    <div class="admin-card-header">
                        <h3>🔔 Yangi Kirish So'rovlari</h3>
                        <button class="icon-refresh-btn" id="refresh-requests-btn" title="Yangilash">🔄</button>
                    </div>
                    <div class="table-responsive">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Familiya Ism / Gadjet</th>
                                    <th>Vaqti</th>
                                    <th style="text-align: right;">Amal</th>
                                </tr>
                            </thead>
                            <tbody id="pending-requests-tbody">
                                <tr><td colspan="3" style="text-align: center; padding: 20px;">Yuklanmoqda...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 2. Tasdiqlangan Gadjetlar Ro'yxati -->
                <div class="admin-card">
                    <div class="admin-card-header">
                        <h3>📱 Tasdiqlangan Gadjetlar</h3>
                        <button class="icon-refresh-btn" id="refresh-approved-btn" title="Yangilash">🔄</button>
                    </div>
                    <div class="table-responsive">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Talaba / Gadjet</th>
                                    <th>Holati</th>
                                    <th style="text-align: right;">Boshqarish</th>
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

    adminModal.style.display = 'flex';

    // Close Handler
    document.getElementById('admin-close-btn').addEventListener('click', () => {
        adminModal.style.display = 'none';
        if (adminAutoRefreshTimer) clearInterval(adminAutoRefreshTimer);
    });

    document.getElementById('refresh-requests-btn').addEventListener('click', loadAdminDashboard);
    document.getElementById('refresh-approved-btn').addEventListener('click', loadAdminDashboard);

    await loadAdminDashboard();

    // Auto-refresh every 4 seconds while modal is open
    if (adminAutoRefreshTimer) clearInterval(adminAutoRefreshTimer);
    adminAutoRefreshTimer = setInterval(loadAdminDashboard, 4000);
}

// Local Admin Storage Helper
function getLocalAdminData() {
    let devices = {};
    let rejected = {};
    let deleted = {};
    try {
        devices = JSON.parse(localStorage.getItem('exam_admin_devices_v84')) || {};
    } catch(e) {}
    try {
        rejected = JSON.parse(localStorage.getItem('exam_admin_rejected_v84')) || {};
    } catch(e) {}
    try {
        deleted = JSON.parse(localStorage.getItem('exam_admin_deleted_v84')) || {};
    } catch(e) {}
    return { devices, rejected, deleted };
}

function saveLocalAdminData(devices, rejected, deleted) {
    if (devices) localStorage.setItem('exam_admin_devices_v84', JSON.stringify(devices));
    if (rejected) localStorage.setItem('exam_admin_rejected_v84', JSON.stringify(rejected));
    if (deleted) localStorage.setItem('exam_admin_deleted_v84', JSON.stringify(deleted));
}

// Render Admin Data
async function loadAdminDashboard() {
    const pendingTbody = document.getElementById('pending-requests-tbody');
    const approvedTbody = document.getElementById('approved-devices-tbody');
    if (!pendingTbody || !approvedTbody) return;

    const { devices, rejected, deleted } = getLocalAdminData();

    // 1. Bulutdan barcha tasdiqlash, to'xtatish va o'chirishlarni sinxronlashtirish
    try {
        const approvals = await Cloud.getHistory(ACCESS_CONFIG.CHANNEL_APPROVALS, 60);
        approvals.forEach(msg => {
            if (!msg || !msg.deviceId) return;
            const id = msg.deviceId;
            const msgTime = msg.timestamp || msg.approvedAt || 0;
            const delTime = deleted[id] || 0;

            if (msg.action === 'delete') {
                delete devices[id];
                if (msgTime >= delTime) {
                    deleted[id] = msgTime || Date.now();
                }
            } else if (msg.action === 'block') {
                if (devices[id]) devices[id].status = 'blocked';
            } else if (msg.action === 'unblock') {
                if (devices[id]) devices[id].status = 'active';
            } else if (msg.action === 'approve') {
                if (!delTime || msgTime > delTime) {
                    delete deleted[id];
                    devices[id] = {
                        deviceId: id,
                        fullName: msg.fullName,
                        deviceInfo: msg.deviceInfo,
                        status: devices[id]?.status === 'blocked' ? 'blocked' : 'active',
                        approvedAt: msg.approvedAt || msgTime || Date.now()
                    };
                }
            }
        });
        saveLocalAdminData(devices, rejected, deleted);
    } catch(e) {}

    // 2. Real-vaqtda ONLAYN bo'lgan gadjetlarni aniqlash (oxirgi 2 daqiqa)
    const onlineMap = new Map();
    try {
        const presences = await Cloud.getHistory(ACCESS_CONFIG.CHANNEL_PRESENCE, 50);
        const now = Date.now();
        presences.forEach(p => {
            if (p && p.devId && (now - p.time < 120000)) {
                if (!deleted[p.devId]) {
                    onlineMap.set(p.devId, p);
                }
            }
        });
    } catch(e) {}

    // 3. Yangi kirish so'rovlarini olish
    let pendingRequests = [];
    try {
        const reqs = await Cloud.getHistory(ACCESS_CONFIG.CHANNEL_REQUESTS, 50);
        const reqMap = new Map();
        reqs.forEach(r => {
            if (r && r.deviceId && r.action === 'request') {
                reqMap.set(r.deviceId, r);
            }
        });

        for (const [id, req] of reqMap.entries()) {
            const reqTime = req.requestedAt || 0;
            const delTime = deleted[id] || 0;
            const rejTime = rejected[id] || 0;
            if (!devices[id] && (!delTime || reqTime > delTime) && (!rejTime || reqTime > rejTime)) {
                pendingRequests.push(req);
            }
        }
    } catch(e) {}

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

    // Headerdagi bildirishnoma belgisini ham yangilash
    const badgeEl = document.getElementById('header-req-badge');
    if (badgeEl) {
        if (pendingRequests.length > 0) {
            badgeEl.style.display = 'inline-flex';
            badgeEl.textContent = `${pendingRequests.length}`;
        } else {
            badgeEl.style.display = 'none';
        }
    }

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
    const { devices, rejected, deleted } = getLocalAdminData();
    delete rejected[deviceId];
    delete deleted[deviceId];

    const now = Date.now();
    const approvedData = {
        deviceId: deviceId,
        fullName: fullName,
        deviceInfo: deviceInfo,
        status: 'active',
        approvedAt: now
    };
    devices[deviceId] = approvedData;
    saveLocalAdminData(devices, rejected, deleted);

    // Direct student notification
    await Cloud.publish(ACCESS_CONFIG.CHANNEL_DEV_PREFIX + deviceId, {
        action: 'approve',
        deviceId: deviceId,
        fullName: fullName,
        deviceInfo: deviceInfo,
        approvedAt: now,
        timestamp: now
    });

    // Broadcast approval for all admin sync
    await Cloud.publish(ACCESS_CONFIG.CHANNEL_APPROVALS, {
        action: 'approve',
        deviceId: deviceId,
        fullName: fullName,
        deviceInfo: deviceInfo,
        approvedAt: now,
        timestamp: now
    });

    alert(`✅ ${fullName} ning gadjetiga ruxsat berildi! Uning ekrani darhol ochiladi.`);
    await loadAdminDashboard();
};

// Action: Rad etish
window.rejectDevice = async function(deviceId) {
    if (confirm("Ushbu so'rovni rad etmoqchimisiz?")) {
        const { devices, rejected, deleted } = getLocalAdminData();
        rejected[deviceId] = Date.now();
        saveLocalAdminData(devices, rejected, deleted);

        await Cloud.publish(ACCESS_CONFIG.CHANNEL_DEV_PREFIX + deviceId, {
            action: 'reject',
            deviceId: deviceId,
            timestamp: Date.now()
        });

        await loadAdminDashboard();
    }
};

// Action: Gadjetni vaqtincha bloklash yoki ochish
window.toggleDeviceBlock = async function(deviceId, currentStatus) {
    const { devices, rejected, deleted } = getLocalAdminData();
    if (devices[deviceId]) {
        const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
        devices[deviceId].status = newStatus;
        saveLocalAdminData(devices, rejected, deleted);

        const action = newStatus === 'blocked' ? 'block' : 'unblock';
        const now = Date.now();

        await Cloud.publish(ACCESS_CONFIG.CHANNEL_DEV_PREFIX + deviceId, {
            action: action,
            deviceId: deviceId,
            timestamp: now
        });

        await Cloud.publish(ACCESS_CONFIG.CHANNEL_APPROVALS, {
            action: action,
            deviceId: deviceId,
            timestamp: now
        });

        await loadAdminDashboard();
    }
};

// Action: Gadjetni butunlay o'chirish
window.deleteDevice = async function(deviceId, fullName) {
    if (confirm(`Haqiqatan ham ${fullName} ning ushbu gadjet ruxsatini butunlay o'chirmoqchimisiz?`)) {
        const { devices, rejected, deleted } = getLocalAdminData();
        delete devices[deviceId];
        deleted[deviceId] = Date.now();
        saveLocalAdminData(devices, rejected, deleted);

        const now = Date.now();

        // 1. Shaxsiy kanalga "delete" xabarini yuboramiz (talaba ekrani darhol yopilishi uchun)
        await Cloud.publish(ACCESS_CONFIG.CHANNEL_DEV_PREFIX + deviceId, {
            action: 'delete',
            deviceId: deviceId,
            timestamp: now
        });

        // 2. Barcha admin qurilmalariga "delete" xabarini yuboramiz
        await Cloud.publish(ACCESS_CONFIG.CHANNEL_APPROVALS, {
            action: 'delete',
            deviceId: deviceId,
            timestamp: now
        });

        alert(`🗑️ ${fullName} ning gadjet ruxsati butunlay o'chirildi!`);
        await loadAdminDashboard();
    }
};

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initAccessControl();
});
