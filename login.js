// ============================================================
//  RISYAH MUSIC · LOGIN
// ============================================================

const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');
const loginError = document.getElementById('loginError');

// ===================== LOCALSTORAGE USER =====================
const USER_KEY = 'risyah_user';

function saveUserSession(username) {
    localStorage.setItem(USER_KEY, JSON.stringify({
        loggedIn: true,
        username: username,
        loginTime: new Date().toISOString()
    }));
}

function clearUserSession() {
    localStorage.removeItem(USER_KEY);
}

// ===================== LOGIN HANDLER =====================
function handleLogin() {
    const username = loginUsername.value.trim();
    const password = loginPassword.value.trim();

    // Validasi
    if (!username) {
        showError('⚠️ Masukkan username');
        return;
    }
    if (!password) {
        showError('⚠️ Masukkan password');
        return;
    }
    if (password.length < 3) {
        showError('⚠️ Password minimal 3 karakter');
        return;
    }

    // Simulasi validasi (bisa diganti dengan API nanti)
    // Demo: username 'user' dengan password '123'
    if (username === 'user' && password === '123') {
        // Login sukses
        saveUserSession(username);
        window.location.href = 'music.html';
    } else {
        showError('❌ Username atau password salah!');
    }
}

function showError(message) {
    loginError.textContent = message;
    loginError.classList.remove('hidden');
    setTimeout(() => {
        loginError.classList.add('hidden');
    }, 3000);
}

// ===================== EVENT LISTENERS =====================
loginSubmitBtn.addEventListener('click', handleLogin);

loginUsername.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') loginSubmitBtn.click();
});

loginPassword.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') loginSubmitBtn.click();
});

// ===================== CEK SESSION =====================
// Jika sudah login, langsung ke music
function checkSession() {
    try {
        const saved = localStorage.getItem(USER_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            if (data.loggedIn) {
                window.location.href = 'music.html';
            }
        }
    } catch (e) {
        console.log('[LOGIN] Session check error');
    }
}

// Cek session saat halaman dimuat
checkSession();

console.log('✦ Risyah Music · Login page ready');