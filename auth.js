// =========================================================
// DEVICE-BASED ACCESS CONTROL & ADMIN APPROVAL SYSTEM (v8.9)
// Modern Glassmorphism Design & Anti-Alert-Loop Protection
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

    // Agar ruxsat berilgan bo'lsa
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
            <h2 style="color: #f87171; margin: 10px 0;">Kirish To'xtatilgan</h2>
            <p style="color: #334155; font-size: 0.95rem; line-height: 1.5;">
                Hurmatli <strong>${escapeQuotes(fullName)}</strong>, ushbu gadjetingiz uchun kirish administrator tomonidan vaqtincha to'xtatilgan.
            </p>
            <p style="font-size: 0.85rem; color: #64748b; margin-top: 14px;">
                Administrator qayta yoqqanida sahifa avtomatik ochiladi.
            </p>
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
    let modal = document.getElementById('access-modal-overlay');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'access-modal-overlay';
        modal.className = 'auth-modal-overlay';
        document.body.appendChild(modal);
    }

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

            <!-- Agar rad etilgan bo'lsa -->
            ${isRejected ? `
                <div class="auth-error-msg" style="margin-bottom: 15px;">
                    ❌ Sizning so'rovingiz admin tomonidan rad etildi. Qaytadan so'rov yuborishingiz mumkin.
                </div>
            ` : ''}

            <!-- Request Form (Visible if not pending) -->
            <form id="access-request-form" class="auth-form" style="${isPending ? 'display: none;' : 'display: flex;'}">
                <div class="auth-input-group">
                    <label for="req-fullname">Familiya va Ismingiz</label>
                    <input type="text" id="req-fullname" required placeholder="Masalan: Karimov Jasur" value="${existingRequest ? existingRequest.fullName || '' : ''}">
                </div>
                <div class="device-detected-badge">
                    <span>Gadjetingiz:</span>
                    <strong>${detectDeviceInfo()}</strong>
                </div>
                <button type="submit" id="send-req-btn" class="auth-submit-btn">
                    🚀 Admindan Ruxsat So'rash
                </button>
            </form>

            <!-- Waiting Status (Visible if pending) -->
            <div id="waiting-status-box" class="waiting-box" style="${isPending ? 'display: flex;' : 'display: none;'}">
                <div class="pulse-loader"></div>
                <p class="waiting-title">Administrator tasdiqlashi kutilmoqda...</p>
                <p class="waiting-hint">Admin ruxsat bergach, ushbu sahifa <strong>avtomatik ochiladi</strong>. Qayta so'rov yuborishingiz shart emas.</p>
                
                <div class="waiting-actions">
                    <button type="button" id="re-send-btn" class="auth-submit-btn" style="padding: 11px 16px; font-size: 0.92rem;">
                        🔄 So'rovni Qayta Yuborish
                    </button>
                    <button type="button" id="cancel-req-btn" class="auth-cancel-btn">
                        ✏️ Ismni o'zgartirish / Qaytadan yozish
                    </button>
                </div>
            </div>

            <div style="margin-top: 14px; text-align: center;">
                <button id="admin-login-secret-btn" class="admin-secret-link">
                    🔑 Administrator Kirishi
                </button>
            </div>
        </div>
    `;

    const devId = getOrCreateDeviceId();
    const devInfo = detectDeviceInfo();

    // If already pending, start listening for approval
    if (isPending) {
        startPollingForApproval(devId, existingRequest.fullName, devInfo, existingRequest.requestedAt || Date.now());
    }

    // Submit Request
    const form = document.getElementById('access-request-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullName = document.getElementById('req-fullname').value.trim();
            if (!fullName) return;

            const btn = document.getElementById('send-req-btn');
            btn.disabled = true;
            btn.textContent = "Yuborilmoqda...";

            const now = Date.now();
            const reqData = {
                action: 'request',
                deviceId: devId,
                fullName: fullName,
                deviceInfo: devInfo,
                requestedAt: now
            };

            // Save locally
            localStorage.setItem('exam_student_request', JSON.stringify({
                status: 'pending',
                fullName: fullName,
                deviceInfo: devInfo,
                requestedAt: now
            }));

            // Send to cloud requests channel
            await Cloud.publish(ACCESS_CONFIG.CHANNEL_REQUESTS, reqData);

            // Switch to waiting state
            form.style.display = 'none';
            document.getElementById('waiting-status-box').style.display = 'flex';
            document.getElementById('access-subtext').innerHTML = `Hurmatli <strong>${fullName}</strong>, sizning ushbu gadjetingizdan kirish so'rovingiz adminga yuborildi. Administrator tasdiqlashini kuting.`;

            startPollingForApproval(devId, fullName, devInfo, now);
        });
    }

    // Re-Send Button Handler
    const reSendBtn = document.getElementById('re-send-btn');
    if (reSendBtn) {
        reSendBtn.addEventListener('click', async () => {
            reSendBtn.disabled = true;
            reSendBtn.textContent = "Yuborilmoqda...";
            const reqData = JSON.parse(localStorage.getItem('exam_student_request') || '{}');
            const fullName = reqData.fullName || "Foydalanuvchi";
            const now = Date.now();

            reqData.requestedAt = now;
            localStorage.setItem('exam_student_request', JSON.stringify(reqData));

            await Cloud.publish(ACCESS_CONFIG.CHANNEL_REQUESTS, {
                action: 'request',
                deviceId: devId,
                fullName: fullName,
                deviceInfo: devInfo,
                requestedAt: now
            });

            setTimeout(() => {
                reSendBtn.disabled = false;
                reSendBtn.textContent = "✅ So'rov Adminga Yuborildi!";
                setTimeout(() => { reSendBtn.textContent = "🔄 So'rovni Qayta Yuborish"; }, 2500);
            }, 500);
        });
    }

    // Cancel / Edit Name Handler
    const cancelBtn = document.getElementById('cancel-req-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            if (pollTimer) clearInterval(pollTimer);
            localStorage.removeItem('exam_student_request');
            document.getElementById('waiting-status-box').style.display = 'none';
            form.style.display = 'flex';
            const btn = document.getElementById('send-req-btn');
            if (btn) {
                btn.disabled = false;
                btn.textContent = "🚀 Admindan Ruxsat So'rash";
            }
        });
    }

    // Secret Admin Login
    const secretBtn = document.getElementById('admin-login-secret-btn');
    if (secretBtn) {
        secretBtn.addEventListener('click', promptAdminPassword);
    }
}

// Student waiting for approval (Protected against alert loops!)
function startPollingForApproval(devId, fullName, devInfo, requestedAt) {
    if (pollTimer) clearInterval(pollTimer);

    const reqTime = requestedAt || Date.now();
    let pollTicks = 0;

    pollTimer = setInterval(async () => {
        pollTicks++;

        // Har 18 soniyada (6 ta tick) so'rovni yangilab turamiz
        if (pollTicks % 6 === 0) {
            Cloud.publish(ACCESS_CONFIG.CHANNEL_REQUESTS, {
                action: 'request',
                deviceId: devId,
                fullName: fullName,
                deviceInfo: devInfo,
                requestedAt: Date.now()
            });
        }

        try {
            const msgs = await Cloud.getHistory(ACCESS_CONFIG.CHANNEL_DEV_PREFIX + devId, 10);
            for (let i = msgs.length - 1; i >= 0; i--) {
                const msg = msgs[i];
                if (!msg) continue;
                
                const msgTime = msg.timestamp || msg.approvedAt || msg.time || 0;

                // FAQAT joriy so'rov yuborilgandan KEYIN kelgan xabarlarga qaraymiz!
                if (msgTime < reqTime) continue;

                if (msg.action === 'approve') {
                    clearInterval(pollTimer);
                    localStorage.setItem('exam_student_approved', JSON.stringify({
                        status: 'active',
                        deviceId: devId,
                        fullName: msg.fullName || fullName,
                        deviceInfo: msg.deviceInfo || devInfo,
                        approvedAt: msgTime || Date.now()
                    }));
                    localStorage.removeItem('exam_student_request');

                    const modal = document.getElementById('access-modal-overlay');
                    if (modal) {
                        modal.innerHTML = `
                            <div class="auth-modal-card" style="text-align: center;">
                                <span style="font-size: 3.5rem;">🎉</span>
                                <h2 style="color: #34d399; margin: 10px 0;">Ruxsat Berildi!</h2>
                                <p style="color: #334155; font-size: 1rem;">
                                    Xush kelibsiz! Ushbu gadjetingiz uchun sayt to'liq ochildi.
                                </p>
                            </div>
                        `;
                        setTimeout(() => { location.reload(); }, 1200);
                    }
                    return;
                } else if (msg.action === 'reject') {
                    clearInterval(pollTimer);
                    // Alert bermasdan, kartani to'g'ridan-to'g'ri rad etilgan holatga o'tkazamiz
                    localStorage.setItem('exam_student_request', JSON.stringify({
                        status: 'rejected',
                        fullName: fullName,
                        deviceInfo: devInfo
                    }));
                    showAccessRequestModal({ status: 'rejected', fullName: fullName });
                    return;
                } else if (msg.action === 'delete') {
                    clearInterval(pollTimer);
                    localStorage.removeItem('exam_student_approved');
                    localStorage.removeItem('exam_student_request');
                    showAccessRequestModal(null);
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
        <span class="user-badge-name" style="color: #f59e0b; font-weight: 800;">👑 ADMIN</span>
        <button id="open-admin-btn" class="admin-panel-btn" title="Admin Paneli">
            ⚙️ Boshqaruv
            <span id="header-req-badge" class="admin-req-badge" style="display: none;">0</span>
        </button>
        <button id="auth-logout-btn" class="logout-btn" title="Chiqish">🚪</button>
    `;
    headerActions.prepend(badge);

    document.getElementById('open-admin-btn').addEventListener('click', openAdminPanel);
    document.getElementById('auth-logout-btn').addEventListener('click', adminLogout);

    startAdminRequestMonitor();
}

// Live monitor: Har 4 soniyada yangi so'rov bor-yo'qligini tekshirib, qizil raqam bilan ko'rsatish
function startAdminRequestMonitor() {
    if (adminMonitorTimer) clearInterval(adminMonitorTimer);

    const checkRequests = async () => {
        try {
            const { devices, rejected } = getLocalAdminData();

            // 1. Bulutdagi tasdiqlash, to'xtatish va o'chirishlarni sinxronlashtirish
            try {
                const approvals = await Cloud.getHistory(ACCESS_CONFIG.CHANNEL_APPROVALS, 80);
                approvals.forEach(msg => {
                    if (!msg || !msg.deviceId) return;
                    const id = msg.deviceId;
                    if (msg.action === 'delete') {
                        delete devices[id];
                    } else if (msg.action === 'block') {
                        if (devices[id]) devices[id].status = 'blocked';
                    } else if (msg.action === 'unblock') {
                        if (devices[id]) devices[id].status = 'active';
                    } else if (msg.action === 'approve') {
                        devices[id] = {
                            deviceId: id,
                            fullName: msg.fullName,
                            deviceInfo: msg.deviceInfo,
                            status: devices[id]?.status === 'blocked' ? 'blocked' : 'active',
                            approvedAt: msg.approvedAt || msg.timestamp || Date.now()
                        };
                    }
                });
                saveLocalAdminData(devices, rejected);
            } catch(e) {}

            // 2. Kutilayotgan so'rovlarni hisoblash
            const reqs = await Cloud.getHistory(ACCESS_CONFIG.CHANNEL_REQUESTS, 50);
            const reqMap = new Map();
            reqs.forEach(r => {
                if (r && r.deviceId && r.action === 'request') {
                    reqMap.set(r.deviceId, r);
                }
            });

            let pendingCount = 0;
            for (const [id, req] of reqMap.entries()) {
                if (!devices[id] && !rejected[id]) {
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
    adminMonitorTimer = setInterval(checkRequests, 4000);
}

// Inject Student Badge in Header
function injectUserBadge(name) {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions || document.getElementById('user-profile-badge')) return;

    const badge = document.createElement('div');
    badge.id = 'user-profile-badge';
    badge.className = 'user-profile-badge student-badge';
    badge.innerHTML = `
        <span class="user-badge-name" title="${escapeQuotes(name)}">👤 ${name}</span>
        <span class="online-indicator" title="Faol">🟢</span>
    `;
    headerActions.prepend(badge);
}

// Doimiy onlayn tekshiruvi (Heartbeat)
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

    ping();

    // Har 15 soniyada status tekshirish
    setInterval(async () => {
        try {
            const msgs = await Cloud.getHistory(ACCESS_CONFIG.CHANNEL_DEV_PREFIX + devId, 5);
            for (let i = msgs.length - 1; i >= 0; i--) {
                const msg = msgs[i];
                if (msg && msg.action === 'delete') {
                    localStorage.removeItem('exam_student_approved');
                    localStorage.removeItem('exam_student_request');
                    location.reload();
                    return;
                } else if (msg && msg.action === 'block') {
                    let app = JSON.parse(localStorage.getItem('exam_student_approved') || '{}');
                    app.status = 'blocked';
                    localStorage.setItem('exam_student_approved', JSON.stringify(app));
                    location.reload();
                    return;
                }
            }
        } catch(e) {}

        ping();
    }, 15000);

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) ping();
    });
}

// ==========================================
// ADMIN DASHBOARD MODAL (RESTORED MODERN DESIGN)
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
                    <h2>👑 Gadjetlarni Boshqarish Paneli</h2>
                    <p>Kirish so'rovlari, tasdiqlangan telefon/kompyuterlar va onlayn nazorat</p>
                </div>
                <button class="admin-close-btn" id="admin-close-btn" title="Yopish">✕</button>
            </div>

            <!-- Statistics Summary -->
            <div class="admin-stats-bar">
                <div class="stat-card stat-pending">
                    <span class="stat-num" id="stat-pending-reqs" style="color: #f59e0b;">0</span>
                    <span class="stat-label">🔔 Kutilayotgan So'rovlar</span>
                </div>
                <div class="stat-card stat-approved">
                    <span class="stat-num" id="stat-approved-devices" style="color: #34d399;">0</span>
                    <span class="stat-label">📱 Ruxsat Berilgan Gadjetlar</span>
                </div>
                <div class="stat-card stat-online">
                    <span class="stat-num" id="stat-online-now" style="color: #38bdf8;">0</span>
                    <span class="stat-label">🟢 Hozir Online</span>
                </div>
            </div>

            <div class="admin-content-grid" style="grid-template-columns: 1fr;">
                <!-- 1. Yangi Kirish So'rovlari -->
                <div class="admin-card">
                    <div class="table-header-row">
                        <h3>🔔 Yangi Kirish So'rovlari (Ruxsat kutilmoqda)</h3>
                        <button class="refresh-btn" id="refresh-requests-btn">🔄 Yangilash</button>
                    </div>
                    <div class="table-responsive">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Ism-Familiya</th>
                                    <th>Gadjet Nomi</th>
                                    <th>So'ralgan Vaqt</th>
                                    <th style="text-align: right;">Qaror (Tasdiqlash)</th>
                                </tr>
                            </thead>
                            <tbody id="pending-requests-tbody">
                                <tr><td colspan="4" style="text-align: center; padding: 20px; color: #64748b;">Yuklanmoqda...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 2. Tasdiqlangan Gadjetlar Ro'yxati -->
                <div class="admin-card">
                    <div class="table-header-row">
                        <h3>✅ Ruxsat Berilgan Gadjetlar Ro'yxati</h3>
                        <button class="refresh-btn" id="refresh-approved-btn">🔄 Yangilash</button>
                    </div>
                    <div class="table-responsive">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Ism-Familiya</th>
                                    <th>Gadjet</th>
                                    <th>Holat</th>
                                    <th>Ruxsat Berilgan Sana</th>
                                    <th style="text-align: right;">Boshqaruv</th>
                                </tr>
                            </thead>
                            <tbody id="approved-devices-tbody">
                                <tr><td colspan="5" style="text-align: center; padding: 20px; color: #64748b;">Yuklanmoqda...</td></tr>
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

    // Auto-refresh every 3.5 seconds while modal is open
    if (adminAutoRefreshTimer) clearInterval(adminAutoRefreshTimer);
    adminAutoRefreshTimer = setInterval(loadAdminDashboard, 3500);
}

// Local Admin Storage Helper
function getLocalAdminData() {
    let devices = {};
    let rejected = {};
    try {
        devices = JSON.parse(localStorage.getItem('exam_admin_devices_v84')) || {};
    } catch(e) {}
    try {
        rejected = JSON.parse(localStorage.getItem('exam_admin_rejected_v84')) || {};
    } catch(e) {}
    return { devices, rejected };
}

function saveLocalAdminData(devices, rejected) {
    if (devices) localStorage.setItem('exam_admin_devices_v84', JSON.stringify(devices));
    if (rejected) localStorage.setItem('exam_admin_rejected_v84', JSON.stringify(rejected));
}

// Render Admin Data
async function loadAdminDashboard() {
    const pendingTbody = document.getElementById('pending-requests-tbody');
    const approvedTbody = document.getElementById('approved-devices-tbody');
    if (!pendingTbody || !approvedTbody) return;

    const { devices, rejected } = getLocalAdminData();

    // 1. Bulutdan barcha tasdiqlash, to'xtatish va o'chirishlarni sinxronlashtirish
    try {
        const approvals = await Cloud.getHistory(ACCESS_CONFIG.CHANNEL_APPROVALS, 80);
        approvals.forEach(msg => {
            if (!msg || !msg.deviceId) return;
            const id = msg.deviceId;
            if (msg.action === 'delete') {
                delete devices[id];
            } else if (msg.action === 'block') {
                if (devices[id]) devices[id].status = 'blocked';
            } else if (msg.action === 'unblock') {
                if (devices[id]) devices[id].status = 'active';
            } else if (msg.action === 'approve') {
                devices[id] = {
                    deviceId: id,
                    fullName: msg.fullName,
                    deviceInfo: msg.deviceInfo,
                    status: devices[id]?.status === 'blocked' ? 'blocked' : 'active',
                    approvedAt: msg.approvedAt || msg.timestamp || Date.now()
                };
            }
        });
        saveLocalAdminData(devices, rejected);
    } catch(e) {}

    // 2. Real-vaqtda ONLAYN bo'lgan gadjetlarni aniqlash (oxirgi 2 daqiqa)
    const onlineMap = new Map();
    try {
        const presences = await Cloud.getHistory(ACCESS_CONFIG.CHANNEL_PRESENCE, 50);
        const now = Date.now();
        presences.forEach(p => {
            if (p && p.devId && (now - p.time < 120000)) {
                onlineMap.set(p.devId, p);
            }
        });
    } catch(e) {}

    // 3. Yangi kirish so'rovlarini olish (Kutilayotgan barcha faol so'rovlar)
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
            if (!devices[id] && !rejected[id]) {
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
        pendingTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: #64748b;">Yangi so'rovlar yo'q. Barcha gadjetlar tasdiqlangan.</td></tr>`;
    } else {
        pendingTbody.innerHTML = pendingRequests.map(r => `
            <tr>
                <td><strong>${r.fullName}</strong></td>
                <td>📱 ${r.deviceInfo}</td>
                <td><small>${new Date(r.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></td>
                <td style="text-align: right;">
                    <div class="admin-actions-cell" style="justify-content: flex-end;">
                        <button class="tbl-btn btn-approve" onclick="approveDevice('${r.deviceId}', '${escapeQuotes(r.fullName)}', '${escapeQuotes(r.deviceInfo)}')">
                            ✅ Ruxsat berish
                        </button>
                        <button class="tbl-btn btn-reject" onclick="rejectDevice('${r.deviceId}')">
                            ❌ Rad etish
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // 6. Render Approved Devices Table
    if (approvedList.length === 0) {
        approvedTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-sub);">Hozircha tasdiqlangan gadjetlar yo'q.</td></tr>`;
    } else {
        approvedTbody.innerHTML = approvedList.map(d => {
            const isOnline = onlineMap.has(d.deviceId) && d.status === 'active';
            const statusBadge = d.status === 'blocked'
                ? `<span class="badge badge-blocked">🚫 To'xtatilgan</span>`
                : (isOnline ? `<span class="badge badge-online">🟢 Online</span>` : `<span class="badge badge-offline">⚪ Oflayn</span>`);

            return `
                <tr>
                    <td><strong>${d.fullName}</strong></td>
                    <td>📱 ${d.deviceInfo}</td>
                    <td>${statusBadge}</td>
                    <td><small>${new Date(d.approvedAt).toLocaleDateString()}</small></td>
                    <td style="text-align: right;">
                        <div class="admin-actions-cell" style="justify-content: flex-end;">
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

    const now = Date.now();
    const approvedData = {
        deviceId: deviceId,
        fullName: fullName,
        deviceInfo: deviceInfo,
        status: 'active',
        approvedAt: now
    };
    devices[deviceId] = approvedData;
    saveLocalAdminData(devices, rejected);

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

    await loadAdminDashboard();
};

// Action: Rad etish
window.rejectDevice = async function(deviceId) {
    if (confirm("Ushbu so'rovni rad etmoqchimisiz?")) {
        const { devices, rejected } = getLocalAdminData();
        rejected[deviceId] = Date.now();
        saveLocalAdminData(devices, rejected);

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
    const { devices, rejected } = getLocalAdminData();
    if (devices[deviceId]) {
        const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
        devices[deviceId].status = newStatus;
        saveLocalAdminData(devices, rejected);

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
        const { devices, rejected } = getLocalAdminData();
        delete devices[deviceId];
        saveLocalAdminData(devices, rejected);

        const now = Date.now();

        await Cloud.publish(ACCESS_CONFIG.CHANNEL_DEV_PREFIX + deviceId, {
            action: 'delete',
            deviceId: deviceId,
            timestamp: now
        });

        await Cloud.publish(ACCESS_CONFIG.CHANNEL_APPROVALS, {
            action: 'delete',
            deviceId: deviceId,
            timestamp: now
        });

        await loadAdminDashboard();
    }
};

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initAccessControl();
});
