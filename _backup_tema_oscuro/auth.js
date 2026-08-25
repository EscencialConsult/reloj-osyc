// js/auth.js
const ADMIN_USERS = {
    "runasgestion@gmail.com": { pass: "Gerardo001", role: "ADMIN_GENERAL" }
};

const SESSION_KEY = 'one_admin_session';

const Auth = {
    loginAdmin: function(u, p) {
        const user = ADMIN_USERS[u.toLowerCase()];
        if (user && user.pass === p) {
            localStorage.setItem(SESSION_KEY, 'true');
            localStorage.setItem('admin_role', user.role);
            localStorage.setItem('admin_user', u.toLowerCase());
            return true;
        }
        return false;
    },
    isLoggedIn: function() {
        return localStorage.getItem(SESSION_KEY) === 'true';
    },
    // ESTA ES LA FUNCIÓN QUE TE FALTA:
    requireAdmin: function() {
        if (!this.isLoggedIn()) {
            window.location.href = 'index.html';
        }
    },
    logout: function() {
        localStorage.clear();
        window.location.href = 'index.html';
    }
};