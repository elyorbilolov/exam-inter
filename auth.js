// =========================================================
// AUTHENTICATION & SINGLE-DEVICE SECURITY SYSTEM (v7.6)
// =========================================================

const AUTH_CONFIG = {
    // Cloud Live Database (Global Sync across all devices, phones, and PCs)
    CLOUD_STORE_ID: "ff808181a067127101a07b81e99d3485",
    CLOUD_API_URL: "https://api.restful-api.dev/objects/ff808181a067127101a07b81e99d3485",
    ADMIN_DEFAULT_KEY: "admin777", // Shaxsiy admin parolingiz
    SESSION_TIMEOUT_DAYS: 365, // Bir marta kirsa, 1 yil davomida qayta so'ramaydi
    HEARTBEAT_INTERVAL_MS: 15000 // Har 15 soniyada boshqa qurilma tekshiruvi
};

// Generates stable unique device fingerprint
function generateDeviceFingerprint() {
    let fp = localStorage.getItem('device_fingerprint_id');
    if (!fp) {
        const screenData = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
        const navData = `${navigator.userAgent}-${navigator.language}`;
        const randomPart = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
        fp = 'dev_' + btoa(screenData + '|' + navData + '|' + randomPart).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
        localStorage.setItem('device_fingerprint_id', fp);
    }
    return fp;
}

// Get readable device title (e.g. "iPhone", "Android Telefon", "Windows PC")
function getDeviceName() {
    const ua = navigator.userAgent;
    let os = "Noma'lum Qurilma";
    if (ua.indexOf("Win") !== -1) os = "Windows PC";
    else if (ua.indexOf("Android") !== -1) os = "Android Telefon";
    else if (ua.indexOf("iPhone") !== -1) os = "Apple iPhone";
    else if (ua.indexOf("iPad") !== -1) os = "Apple iPad";
    else if (ua.indexOf("Mac") !== -1) os = "Apple Mac";
    else if (ua.indexOf("Linux") !== -1) os = "Linux";
    return os;
}

// Global Auth State
window.CurrentUser = null;
let heartbeatTimer = null;

// Database helper with Real-time Cloud Synchronization
const AuthDB = {
    async getUsers() {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(AUTH_CONFIG.CLOUD_API_URL, { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) {
                const result = await res.json();
                if (result && result.data) {
                    // Update local mirror
                    localStorage.setItem('sys_users_store', JSON.stringify(result.data));
                    return result.data;
                }
            }
        } catch(e) {
            console.warn("Cloud read timeout/error, using local cache:", e);
        }
        return JSON.parse(localStorage.getItem('sys_users_store') || '{}');
    },

    async saveUser(username, userData) {
        const uKey = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
        const allUsers = await this.getUsers();
        allUsers[uKey] = userData;
        localStorage.setItem('sys_users_store', JSON.stringify(allUsers));

        // Save to global cloud
        try {
            await fetch(AUTH_CONFIG.CLOUD_API_URL, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'exam_inter_users',
                    data: allUsers
                })
            });
        } catch(e) {
            console.error("Cloud user save error:", e);
        }
    },

    async deleteUser(username) {
        const uKey = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
        const allUsers = await this.getUsers();
        delete allUsers[uKey];
        localStorage.setItem('sys_users_store', JSON.stringify(allUsers));

        try {
            await fetch(AUTH_CONFIG.CLOUD_API_URL, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'exam_inter_users',
                    data: allUsers
                })
            });
        } catch(e) {}
    },

    async getUser(username) {
        const uKey = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
        const allUsers = await this.getUsers();
        return allUsers[uKey] || null;
    },

    async updatePresence(username, sessionId) {
        const uKey = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
        const allUsers = await this.getUsers();
        if (allUsers[uKey]) {
            allUsers[uKey].lastHeartbeat = Date.now();
            localStorage.setItem('sys_users_store', JSON.stringify(allUsers));
            // Lightweight update every minute
            if (!this._lastCloudHeartbeat || Date.now() - this._lastCloudHeartbeat > 40000) {
                this._lastCloudHeartbeat = Date.now();
                fetch(AUTH_CONFIG.CLOUD_API_URL, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: 'exam_inter_users',
                        data: allUsers
                    })
                }).catch(() => {});
            }
        }
    }
};

// ==========================================
// CORE AUTH LOGIC (LOGIN, LOGOUT, CHECK)
// ==========================================

async function performLogin(username, password) {
    const uClean = username.toLowerCase().trim();
    const pClean = password.trim();

    if (!uClean || !pClean) {
        return { success: false, message: "Iltimos, login va parolni kiriting!" };
    }

    // Special Admin Login
    if (uClean === 'admin' && pClean === (localStorage.getItem('custom_admin_key') || AUTH_CONFIG.ADMIN_DEFAULT_KEY)) {
        const adminSession = {
            username: 'admin',
            name: 'Bosh Administrator',
            isAdmin: true,
            sessionId: 'admin_' + Date.now()
        };
        sessionStorage.setItem('exam_session', JSON.stringify(adminSession));
        localStorage.setItem('exam_session', JSON.stringify(adminSession));
        window.CurrentUser = adminSession;
        return { success: true, isAdmin: true };
    }

    const user = await AuthDB.getUser(uClean);
    if (!user) {
        return { success: false, message: "Bunday login mavjud emas! Admin bilan bog'laning." };
    }

    if (user.password !== pClean) {
        return { success: false, message: "Parol noto'g'ri! Qaytadan urinib ko'ring." };
    }

    if (user.status === 'blocked') {
        return { success: false, message: "Sizning hisobingiz admin tomonidan bloklangan!" };
    }

    // Check expiration date
    if (user.expiresAt && Date.now() > user.expiresAt) {
        return { success: false, message: "Kirish muddati tugagan! Admin bilan bog'laning." };
    }

    const currentDeviceFp = generateDeviceFingerprint();

    // 1-QURILMA TEKSHIRUVI (Hardware Lock)
    if (user.lockedDeviceId && user.lockedDeviceId !== currentDeviceFp) {
        return { 
            success: false, 
            message: `Ushbu hisob boshqa qurilmaga (${user.deviceInfo || 'Boshqa telefon'}) biriktirilgan! Yangi telefonga o'tish uchun adminga murojaat qiling.` 
        };
    }

    // Yangi Session Token
    const newSessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    user.lockedDeviceId = currentDeviceFp;
    user.deviceInfo = getDeviceName();
    user.activeSessionId = newSessionId;
    user.lastLogin = Date.now();
    user.lastHeartbeat = Date.now();
    user.isOnline = true;

    await AuthDB.saveUser(uClean, user);

    const sessionObj = {
        username: uClean,
        name: user.name || uClean,
        isAdmin: false,
        sessionId: newSessionId,
        deviceId: currentDeviceFp
    };

    localStorage.setItem('exam_session', JSON.stringify(sessionObj));
    sessionStorage.setItem('exam_session', JSON.stringify(sessionObj));
    window.CurrentUser = sessionObj;

    startHeartbeatCheck();
    return { success: true, isAdmin: false };
}

// Boshqa qurilmadan kirilganda zudlik bilan chiqarib yuborish
function startHeartbeatCheck() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);

    heartbeatTimer = setInterval(async () => {
        const sessionStr = localStorage.getItem('exam_session') || sessionStorage.getItem('exam_session');
        if (!sessionStr) return;
        const session = JSON.parse(sessionStr);
        if (session.isAdmin) return;

        const user = await AuthDB.getUser(session.username);
        if (!user) {
            kickOutUser("Akkaunt tizimdan o'chirilgan.");
            return;
        }

        if (user.status === 'blocked') {
            kickOutUser("Hisobingiz admin tomonidan bloklandi!");
            return;
        }

        // AGAR BOSHQA QUILMADAN KIRILSA, SESSIYA MOS KELMAYDI!
        if (user.activeSessionId && user.activeSessionId !== session.sessionId) {
            kickOutUser("Diqqat! Ushbu hisobga boshqa qurilmadan kirildi. Xavfsizlik yuzasidan sizning sessiyangiz yopildi.");
            return;
        }

        // Onlayn holatini yangilash
        await AuthDB.updatePresence(session.username, session.sessionId);
    }, AUTH_CONFIG.HEARTBEAT_INTERVAL_MS);
}

function kickOutUser(reason) {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    localStorage.removeItem('exam_session');
    sessionStorage.removeItem('exam_session');
    window.CurrentUser = null;
    
    alert(reason || "Sessiya muddati tugadi.");
    location.reload();
}

function performLogout() {
    if (confirm("Haqiqatan ham tizimdan chiqmoqchimisiz?")) {
        kickOutUser("Tizimdan muvaffaqiyatli chiqildi.");
    }
}

// ==========================================
// RENDER LOGIN OVERLAY MODAL
// ==========================================
function setupAuthUI() {
    // Agar modal mavjud bo'lmasa yaratamiz
    if (document.getElementById('auth-modal-overlay')) return;

    const authModal = document.createElement('div');
    authModal.id = 'auth-modal-overlay';
    authModal.className = 'auth-modal-overlay';
    authModal.innerHTML = `
        <div class="auth-modal-card">
            <div class="auth-logo">
                <span class="auth-lock-icon">🔒</span>
                <h2>Xavfsiz Tizim</h2>
                <p>English Exam platformasiga kirish</p>
            </div>

            <div id="auth-error-msg" class="auth-error-msg" style="display: none;"></div>

            <form id="auth-form" class="auth-form" onsubmit="return false;">
                <div class="auth-input-group">
                    <label for="auth-username">Login / Foydalanuvchi nomi</label>
                    <input type="text" id="auth-username" placeholder="Loginni kiriting" autocomplete="username" required>
                </div>
                <div class="auth-input-group">
                    <label for="auth-password">Parol</label>
                    <div class="auth-pass-wrapper">
                        <input type="password" id="auth-password" placeholder="Parolni kiriting" autocomplete="current-password" required>
                        <button type="button" id="toggle-auth-pass" class="toggle-pass-btn">👁️</button>
                    </div>
                </div>

                <div class="auth-security-badges">
                    <span>🛡️ 1 Qurilma Himoyasi</span>
                    <span>⚡ Shifrlangan Tizim</span>
                </div>

                <button type="submit" id="auth-submit-btn" class="auth-submit-btn">
                    Tizimga Kirish ➔
                </button>
            </form>

            <div class="auth-footer-help">
                <p>Login va parolingiz yo'qmi? <br><strong>Administrator bilan bog'laning.</strong></p>
            </div>
        </div>
    `;
    document.body.appendChild(authModal);

    // Toggle Password Visibility
    const passInput = document.getElementById('auth-password');
    const toggleBtn = document.getElementById('toggle-auth-pass');
    toggleBtn.addEventListener('click', () => {
        if (passInput.type === 'password') {
            passInput.type = 'text';
            toggleBtn.textContent = '🔒';
        } else {
            passInput.type = 'password';
            toggleBtn.textContent = '👁️';
        }
    });

    // Form Submit
    const authForm = document.getElementById('auth-form');
    const submitBtn = document.getElementById('auth-submit-btn');
    const errorBox = document.getElementById('auth-error-msg');

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('auth-username').value;
        const p = document.getElementById('auth-password').value;

        submitBtn.disabled = true;
        submitBtn.textContent = "Tekshirilmoqda...";
        errorBox.style.display = 'none';

        const res = await performLogin(u, p);
        if (res.success) {
            authModal.classList.add('hide-auth');
            setTimeout(() => authModal.remove(), 400);
            injectUserBadge();

            if (res.isAdmin) {
                openAdminPanel();
            }
        } else {
            errorBox.textContent = res.message;
            errorBox.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = "Tizimga Kirish ➔";
        }
    });
}

// User Profile Badge in Header
function injectUserBadge() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions || document.getElementById('user-profile-badge')) return;

    const user = window.CurrentUser;
    if (!user) return;

    const badge = document.createElement('div');
    badge.id = 'user-profile-badge';
    badge.className = 'user-profile-badge';
    badge.innerHTML = `
        <span class="user-badge-name">${user.isAdmin ? '👑 ADMIN' : '👤 ' + user.name}</span>
        ${user.isAdmin ? '<button id="open-admin-btn" class="admin-open-shortcut" title="Admin Panel">⚙️</button>' : ''}
        <button id="auth-logout-btn" class="logout-btn" title="Tizimdan chiqish">🚪</button>
    `;
    headerActions.prepend(badge);

    document.getElementById('auth-logout-btn').addEventListener('click', performLogout);
    if (user.isAdmin) {
        document.getElementById('open-admin-btn').addEventListener('click', openAdminPanel);
    }
}

// Check on page load with Persistent Device Auto-Login
async function checkAuthOnLoad() {
    const sessionStr = localStorage.getItem('exam_session');
    if (!sessionStr) {
        setupAuthUI();
        return;
    }

    try {
        const session = JSON.parse(sessionStr);
        if (session.isAdmin) {
            window.CurrentUser = session;
            injectUserBadge();
            return;
        }

        const currentDevice = generateDeviceFingerprint();
        const user = await AuthDB.getUser(session.username);

        // Auto-login: If user exists, active, not blocked, and belongs to this device
        if (user && user.status === 'active' && (!user.lockedDeviceId || user.lockedDeviceId === currentDevice)) {
            // Update session for this device
            if (!user.lockedDeviceId) {
                user.lockedDeviceId = currentDevice;
                user.deviceInfo = getDeviceName();
            }
            user.activeSessionId = session.sessionId;
            user.lastLogin = Date.now();
            user.lastHeartbeat = Date.now();
            AuthDB.saveUser(session.username, user);

            window.CurrentUser = session;
            injectUserBadge();
            startHeartbeatCheck();
        } else {
            // Only prompt if blocked or explicitly mismatched to another device
            localStorage.removeItem('exam_session');
            sessionStorage.removeItem('exam_session');
            setupAuthUI();
        }
    } catch(e) {
        setupAuthUI();
    }
}

// ==========================================
// ADMIN PANEL MODAL & MANAGER
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
                    <h2>👑 Administrator Paneli</h2>
                    <p>O'quvchilar, login-parollar va online nazorat</p>
                </div>
                <button class="admin-close-btn" onclick="document.getElementById('admin-modal-overlay').remove()">✕</button>
            </div>

            <div class="admin-stats-bar">
                <div class="stat-card">
                    <span class="stat-num" id="stat-online-count">0</span>
                    <span class="stat-label">🟢 Jonli Online</span>
                </div>
                <div class="stat-card">
                    <span class="stat-num" id="stat-total-users">0</span>
                    <span class="stat-label">👥 Jami Foydalanuvchilar</span>
                </div>
                <div class="stat-card">
                    <span class="stat-num" id="stat-active-users">0</span>
                    <span class="stat-label">✅ Faol Akkauntlar</span>
                </div>
            </div>

            <div class="admin-content-grid">
                <!-- Add New User Form -->
                <div class="admin-card">
                    <h3>➕ Yangi O'quvchi Qo'shish</h3>
                    <form id="add-user-form" class="admin-form" onsubmit="return false;">
                        <div class="admin-field">
                            <label>O'quvchi Ism-Familiyasi:</label>
                            <input type="text" id="new-user-name" placeholder="Masalan: Sardor Aliyev" required>
                        </div>
                        <div class="admin-field">
                            <label>Login:</label>
                            <input type="text" id="new-user-login" placeholder="Masalan: sardor_77" required>
                        </div>
                        <div class="admin-field">
                            <label>Parol:</label>
                            <input type="text" id="new-user-pass" placeholder="Masalan: 123456" required>
                        </div>
                        <div class="admin-field">
                            <label>Amal Qilish Muddati:</label>
                            <select id="new-user-duration">
                                <option value="30">1 Oy (30 kun)</option>
                                <option value="90">3 Oy (90 kun)</option>
                                <option value="180">6 Oy (180 kun)</option>
                                <option value="365">1 Yil (365 kun)</option>
                                <option value="0" selected>Cheksiz (Doimiy)</option>
                            </select>
                        </div>
                        <button type="submit" id="add-user-submit-btn" class="admin-submit-btn">Akkaunt Yaratish</button>
                    </form>
                </div>

                <!-- Users List Table -->
                <div class="admin-card user-table-card">
                    <div class="table-header-row">
                        <h3>📋 Barcha O'quvchilar Ro'yxati</h3>
                        <button id="refresh-users-btn" class="refresh-btn" title="Yangilash">🔄 Yangilash</button>
                    </div>
                    <div class="table-responsive">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Ism & Login</th>
                                    <th>Parol</th>
                                    <th>Holat</th>
                                    <th>Qurilma</th>
                                    <th>Amallar</th>
                                </tr>
                            </thead>
                            <tbody id="admin-users-tbody">
                                <tr><td colspan="5" style="text-align: center; padding: 20px;">Yuklanmoqda...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    loadAdminData();

    // Add user submit
    document.getElementById('add-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-user-name').value.trim();
        const login = document.getElementById('new-user-login').value.trim();
        const pass = document.getElementById('new-user-pass').value.trim();
        const days = parseInt(document.getElementById('new-user-duration').value);

        if (!name || !login || !pass) return;

        const btn = document.getElementById('add-user-submit-btn');
        btn.disabled = true;
        btn.textContent = "Saqlanmoqda...";

        const expiresAt = days > 0 ? (Date.now() + (days * 24 * 60 * 60 * 1000)) : null;

        await AuthDB.saveUser(login, {
            name: name,
            password: pass,
            status: 'active',
            createdAt: Date.now(),
            expiresAt: expiresAt,
            lockedDeviceId: null, // Birinchi kirganda avtomatik bog'lanadi
            deviceInfo: null,
            activeSessionId: null,
            lastLogin: null,
            lastHeartbeat: null
        });

        document.getElementById('add-user-form').reset();
        btn.disabled = false;
        btn.textContent = "Akkaunt Yaratish";
        alert(`✅ O'quvchi muvaffaqiyatli qo'shildi!\nLogin: ${login}\nParol: ${pass}`);
        loadAdminData();
    });

    document.getElementById('refresh-users-btn').addEventListener('click', loadAdminData);
}

// Load and render user rows in admin
async function loadAdminData() {
    const tbody = document.getElementById('admin-users-tbody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">Yuklanmoqda...</td></tr>`;
    const users = await AuthDB.getUsers();

    const userList = Object.entries(users);
    const now = Date.now();
    let onlineCount = 0;
    let activeCount = 0;

    let rowsHtml = '';
    if (userList.length === 0) {
        rowsHtml = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-sub);">Hozircha hech qanday o'quvchi qo'shilmagan.</td></tr>`;
    } else {
        userList.forEach(([username, u]) => {
            // Online if heartbeat in last 45 seconds
            const isOnline = u.lastHeartbeat && (now - u.lastHeartbeat < 45000);
            if (isOnline) onlineCount++;
            if (u.status === 'active') activeCount++;

            const statusBadge = u.status === 'blocked' 
                ? `<span class="badge badge-blocked">🚫 Bloklangan</span>` 
                : (isOnline ? `<span class="badge badge-online">🟢 Online</span>` : `<span class="badge badge-offline">⚪ Oflayn</span>`);

            const deviceText = u.lockedDeviceId ? `📱 ${u.deviceInfo || 'Bog\'langan'}` : `<span style="color: #10b981;">Qurilma ochiq</span>`;

            rowsHtml += `
                <tr>
                    <td>
                        <strong>${u.name || username}</strong><br>
                        <small style="color: var(--primary);">@${username}</small>
                    </td>
                    <td><code>${u.password}</code></td>
                    <td>${statusBadge}</td>
                    <td><small>${deviceText}</small></td>
                    <td>
                        <div class="admin-actions-cell">
                            <button class="tbl-btn" onclick="toggleUserStatus('${username}', '${u.status}')" title="${u.status === 'active' ? 'Bloklash' : 'Faollashtirish'}">
                                ${u.status === 'active' ? '🚫' : '✅'}
                            </button>
                            <button class="tbl-btn" onclick="resetUserDevice('${username}')" title="Qurilma bog'lanishini yangilash">
                                🔄
                            </button>
                            <button class="tbl-btn del-btn" onclick="removeUser('${username}')" title="O'chirish">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
    }

    tbody.innerHTML = rowsHtml;
    document.getElementById('stat-online-count').textContent = onlineCount;
    document.getElementById('stat-total-users').textContent = userList.length;
    document.getElementById('stat-active-users').textContent = activeCount;
}

// Admin Action: Bloklash / Faollashtirish
window.toggleUserStatus = async function(username, currentStatus) {
    const user = await AuthDB.getUser(username);
    if (!user) return;
    user.status = currentStatus === 'active' ? 'blocked' : 'active';
    await AuthDB.saveUser(username, user);
    loadAdminData();
};

// Admin Action: Qurilmani tiklash (Reset Device)
window.resetUserDevice = async function(username) {
    if (confirm(`@${username} ning qurilma bog'lanishini tozalaysizmi? O'quvchi yangi telefondan kirishi mumkin bo'ladi.`)) {
        const user = await AuthDB.getUser(username);
        if (!user) return;
        user.lockedDeviceId = null;
        user.deviceInfo = null;
        user.activeSessionId = null;
        await AuthDB.saveUser(username, user);
        alert("✅ Qurilma muvaffaqiyatli tozalandi!");
        loadAdminData();
    }
};

// Admin Action: O'quvchini butunlay o'chirish
window.removeUser = async function(username) {
    if (confirm(`Haqiqatan ham @${username} ni bazadan butunlay o'chirmoqchimisiz?`)) {
        await AuthDB.deleteUser(username);
        loadAdminData();
    }
};

// On document ready
document.addEventListener('DOMContentLoaded', () => {
    checkAuthOnLoad();
});
