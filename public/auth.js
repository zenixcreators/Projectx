/**
 * Frontend Authentication Utility
 * Handles session state, redirects, form submissions, and Google OAuth
 */

const Auth = {
    /**
     * Checks if the user is currently authenticated
     */
    async check() {
        try {
            const response = await fetch('/auth/me');
            if (response.ok) {
                const data = await response.json();
                return data.user;
            }
        } catch (err) {
            console.error('Auth check failed:', err);
        }
        return null;
    },

    /**
     * Redirects to login if the user is not authenticated
     */
    async requireAuth() {
        const user = await this.check();
        if (!user) {
            window.location.href = '/login.html';
        }
        return user;
    },

    /**
     * Redirects to app if the user is already authenticated
     */
    async redirectIfAuthenticated() {
        const user = await this.check();
        if (user) {
            window.location.href = '/app/';
        }
    },

    /**
     * Logs the user out
     */
    async logout() {
        try {
            await fetch('/auth/logout', { method: 'POST' });
            window.location.href = '/';
        } catch (err) {
            console.error('Logout failed:', err);
            window.location.href = '/';
        }
    },

    /**
     * Handles local Login/Signup form submission
     */
    async handleSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const mode = form.dataset.mode; // 'login' or 'signup'
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const messageEl = document.getElementById('authMessage');

        try {
            const endpoint = mode === 'signup' ? '/auth/signup' : '/auth/login';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                window.location.href = '/app/';
            } else {
                if (messageEl) {
                    messageEl.textContent = result.error || 'Authentication failed';
                    messageEl.style.color = '#ff4444';
                }
            }
        } catch (err) {
            console.error('Form submission error:', err);
            if (messageEl) messageEl.textContent = 'Connection error. Please try again.';
        }
    },

    /**
     * Initializes Google One Tap / Button
     */
    async initGoogle() {
        try {
            const configResp = await fetch('/auth/config');
            const { googleClientId } = await configResp.json();

            if (!googleClientId) return;

            const render = () => {
                if (!window.google || !window.google.accounts || !window.google.accounts.id) {
                    return false;
                }

                window.google.accounts.id.initialize({
                    client_id: googleClientId,
                    callback: async (response) => {
                        const authResp = await fetch('/auth/google', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ credential: response.credential })
                        });

                        if (authResp.ok) {
                            window.location.href = '/app/';
                        } else {
                            const err = await authResp.json();
                            alert(err.error || 'Google Login failed');
                        }
                    }
                });

                const googleBtn = document.getElementById('googleButton');
                if (googleBtn) {
                    // Measure container width, round to integer to prevent fractional pixel validation failures (common on high-DPI screens)
                    let containerWidth = Math.floor(googleBtn.offsetWidth) || 380;
                    
                    // Clamp to Google GSI button limits (200px to 400px)
                    if (containerWidth < 200) containerWidth = 200;
                    if (containerWidth > 400) containerWidth = 400;
                    
                    window.google.accounts.id.renderButton(googleBtn, {
                        type: 'standard',
                        theme: 'outline',
                        size: 'large',
                        text: 'continue_with',
                        shape: 'pill',
                        width: containerWidth
                    });
                }
                return true;
            };

            // Try rendering immediately if already loaded
            if (render()) return;

            // Otherwise, poll every 100ms (up to 5 seconds) to handle slower network loading
            let attempts = 0;
            const interval = setInterval(() => {
                attempts++;
                if (render() || attempts >= 50) {
                    clearInterval(interval);
                }
            }, 100);

        } catch (err) {
            console.error('Google Auth Init failed:', err);
        }
    }
};

// --- Initialization Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Handle Forms
    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', Auth.handleSubmit);
    }

    // 2. Handle Logout buttons
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => Auth.logout());
    }

    // 3. Initialize Google Auth if needed
    if (document.getElementById('googleButton')) {
        Auth.initGoogle();
    }

    // 4. Page Protection Redirects
    const path = window.location.pathname;
    if (path.includes('/app/')) {
        Auth.requireAuth();
    } else if (path === '/login.html' || path === '/signup.html') {
        Auth.redirectIfAuthenticated();
    }
});

// Export to window
window.Auth = Auth;
