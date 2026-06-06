/**
 * Frontend Authentication Utility
 * Handles session state, redirects, form submissions, and Google OAuth
 */

const Auth = {
    trustedDomains: new Set([
        'gmail.com',
        'googlemail.com',
        'outlook.com',
        'hotmail.com',
        'live.com',
        'msn.com',
        'proton.me',
        'protonmail.com',
        'pm.me'
    ]),

    normalizeEmail(email) {
        return String(email || '').toLowerCase().trim();
    },

    isTrustedEmail(email) {
        const normalized = this.normalizeEmail(email);
        const parts = normalized.split('@');
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) &&
            parts.length === 2 &&
            this.trustedDomains.has(parts[1]);
    },

    isStrongPassword(password) {
        const value = String(password || '');
        return value.length >= 10 &&
            /[a-z]/.test(value) &&
            /[A-Z]/.test(value) &&
            /\d/.test(value) &&
            /[^A-Za-z0-9]/.test(value);
    },

    pendingVerificationEmail: '',
    pendingResetEmail: '',

    setMessage(text, color = '#ff4444') {
        const messageEl = document.getElementById('authMessage');
        if (messageEl) {
            if (!text) {
                messageEl.style.display = 'none';
                messageEl.className = 'auth-message';
                messageEl.innerHTML = '';
                return;
            }
            const isError = color === '#ff4444' || color.toLowerCase() === 'red';
            const friendlyText = isError ? this.getFriendlyError(text) : text;
            const icon = isError ? '<i class="fa-solid fa-triangle-exclamation"></i>' : '<i class="fa-solid fa-circle-check"></i>';
            
            messageEl.className = `auth-message ${isError ? 'error' : 'success'}`;
            messageEl.style.display = 'flex';
            messageEl.innerHTML = `${icon} <span style="flex:1;">${friendlyText}</span>`;
        }
    },

    getFriendlyError(message) {
        if (!message || typeof message !== 'string') return 'Something went wrong. Please try again.';
        const msg = message.toLowerCase().trim();
        
        if (msg.includes('too many authentication') || msg.includes('too many attempts') || msg.includes('rate limit')) {
            return "Too many sign-in attempts. For security, please wait 15 minutes before trying again.";
        }
        if (msg.includes('database is currently unavailable') || msg.includes('mongodb') || msg.includes('readystate') || msg.includes('buffering timed out')) {
            return "Our authentication system is experiencing temporary database issues. Please try again shortly.";
        }
        if (msg.includes('use a trusted google') || msg.includes('trusted email')) {
            return "Please sign up using a Google, Outlook, or Proton email account to keep your space secure.";
        }
        if (msg.includes('password must be at least 10 characters') || msg.includes('strong password')) {
            return "To keep your account secure, choose a password with at least 10 characters, including an uppercase letter, lowercase letter, a number, and a symbol.";
        }
        if (msg.includes('user already exists') || msg.includes('already registered')) {
            return "It looks like you already have an account! Please log in directly.";
        }
        if (msg.includes('verification code expired') || msg.includes('otp expired')) {
            return "Your verification code has expired. Don't worry, click 'Resend' to get a fresh code.";
        }
        if (msg.includes('too many wrong codes') || msg.includes('too many incorrect attempts')) {
            return "Too many incorrect attempts. Please request a new verification code to try again.";
        }
        if (msg.includes('incorrect verification code') || msg.includes('incorrect reset code') || msg.includes('verification failed')) {
            return "That verification code didn't match. Please check the code in your email and try again.";
        }
        if (msg.includes('invalid credentials') || msg.includes('incorrect current password')) {
            return "The email or password didn't match. Please check your credentials and try again.";
        }
        if (msg.includes('verify your email before logging in')) {
            return "Almost there! Please verify your email using the verification code sent to your inbox before logging in.";
        }
        if (msg.includes('not an administrator') || msg.includes('access denied')) {
            return "Administrator access is required to view this portal. Please check your login details.";
        }
        if (msg.includes('google sign-in requires')) {
            return "Google sign-in requires a verified Gmail or Googlemail address to synchronize correctly.";
        }
        if (msg.includes('connection error') || msg.includes('failed to fetch') || msg.includes('network')) {
            return "Could not connect to the network. Please check your internet connection and try again.";
        }
        
        return message;
    },

    async readJson(response) {
        const fallbackResponse = response.clone();
        try {
            return await response.json();
        } catch (err) {
            let body = '';
            try {
                body = await fallbackResponse.text();
            } catch (textErr) {
                body = '';
            }
            const fallback = body && !body.trim().startsWith('<')
                ? body.trim()
                : `Server returned ${response.status || 'an'} error. Please refresh and try again.`;
            return { error: response.ok ? '' : fallback };
        }
    },

    showOtpStep(email, message) {
        this.pendingVerificationEmail = this.normalizeEmail(email);
        const authForm = document.getElementById('authForm');
        const otpForm = document.getElementById('otpForm');
        const otpEmailText = document.getElementById('otpEmailText');
        const socialDivider = document.querySelector('.social-divider');
        const socialGroup = document.querySelector('.social-group');

        if (authForm) authForm.hidden = true;
        if (otpForm) otpForm.hidden = false;
        if (otpEmailText) otpEmailText.textContent = `Enter the 6-digit code sent to ${this.pendingVerificationEmail}.`;
        if (socialDivider) socialDivider.hidden = true;
        if (socialGroup) socialGroup.hidden = true;

        this.setMessage(message || 'Enter the verification code sent to your email.', '#16a34a');
    },

    setAuthMode(mode) {
        const authForm = document.getElementById('authForm');
        const forgotPasswordForm = document.getElementById('forgotPasswordForm');
        const resetPasswordForm = document.getElementById('resetPasswordForm');
        const socialDivider = document.querySelector('.social-divider');
        const socialGroup = document.querySelector('.social-group');

        if (authForm) authForm.hidden = mode !== 'login';
        if (forgotPasswordForm) forgotPasswordForm.hidden = mode !== 'forgot';
        if (resetPasswordForm) resetPasswordForm.hidden = mode !== 'reset';
        if (socialDivider) socialDivider.hidden = mode !== 'login';
        if (socialGroup) socialGroup.hidden = mode !== 'login';

        if (mode === 'login') {
            this.pendingResetEmail = '';
            this.setMessage('');
        }
    },

    showResetStep(email, message) {
        this.pendingResetEmail = this.normalizeEmail(email);
        const resetEmailText = document.getElementById('resetEmailText');
        if (resetEmailText) resetEmailText.textContent = `Use the 6-digit code sent to ${this.pendingResetEmail}.`;
        this.setAuthMode('reset');
        this.setMessage(message || 'Reset code sent. Check your email.', '#16a34a');
    },

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
        const submitBtn = form.querySelector('button[type="submit"]');
        const mode = form.dataset.mode; // 'login' or 'signup'
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const messageEl = document.getElementById('authMessage');

        try {
            if (submitBtn) submitBtn.disabled = true;
            data.email = this.normalizeEmail(data.email);

            if (!this.isTrustedEmail(data.email)) {
                this.setMessage('Use a trusted Google, Outlook, or Proton Mail address.');
                return;
            }

            if (mode === 'signup') {
                if (!String(data.firstName || '').trim()) {
                    this.setMessage('First name is required.');
                    return;
                }

                if (!this.isStrongPassword(data.password)) {
                    this.setMessage('Password must be 10+ characters with uppercase, lowercase, number, and symbol.');
                    return;
                }
            }

            const endpoint = mode === 'signup' ? '/auth/signup' : '/auth/login';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await this.readJson(response);

            if (response.ok) {
                if (mode === 'signup') {
                    this.showOtpStep(result.email || data.email, result.message);
                    return;
                }

                window.location.href = '/app/';
            } else {
                this.setMessage(result.error || 'Authentication failed');
            }
        } catch (err) {
            console.error('Form submission error:', err);
            this.setMessage(err.message || 'Connection error. Please try again.');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    },

    async handleOtpSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const otp = String(formData.get('otp') || '').trim();

        if (!/^\d{6}$/.test(otp)) {
            this.setMessage('Enter the 6-digit verification code.');
            return;
        }

        try {
            const response = await fetch('/auth/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: this.pendingVerificationEmail,
                    otp
                })
            });
            const result = await this.readJson(response);

            if (!response.ok) {
                this.setMessage(result.error || 'Verification failed.');
                return;
            }

            this.setMessage(result.message || 'Email verified. Redirecting...', '#16a34a');
            window.location.href = '/app/';
        } catch (err) {
            console.error('OTP verification error:', err);
            this.setMessage('Connection error. Please try again.');
        }
    },

    async resendOtp() {
        if (!this.pendingVerificationEmail) {
            this.setMessage('Please submit the signup form first.');
            return;
        }

        try {
            const response = await fetch('/auth/resend-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: this.pendingVerificationEmail })
            });
            const result = await this.readJson(response);

            if (!response.ok) {
                this.setMessage(result.error || 'Could not resend verification code.');
                return;
            }

            this.setMessage(result.message || 'New verification code sent.', '#16a34a');
        } catch (err) {
            console.error('Resend OTP error:', err);
            this.setMessage('Connection error. Please try again.');
        }
    },

    async handleForgotPassword(e) {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const formData = new FormData(form);
        const email = this.normalizeEmail(formData.get('email'));

        if (!this.isTrustedEmail(email)) {
            this.setMessage('Use a trusted Google, Outlook, or Proton Mail address.');
            return;
        }

        try {
            if (submitBtn) submitBtn.disabled = true;
            const response = await fetch('/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const result = await this.readJson(response);

            if (!response.ok) {
                this.setMessage(result.error || 'Could not send reset code.');
                return;
            }

            this.showResetStep(result.email || email, result.message);
        } catch (err) {
            console.error('Forgot password error:', err);
            this.setMessage('Connection error. Please try again.');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    },

    async handleResetPassword(e) {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const formData = new FormData(form);
        const otp = String(formData.get('otp') || '').trim();
        const password = String(formData.get('password') || '');

        if (!/^\d{6}$/.test(otp)) {
            this.setMessage('Enter the 6-digit reset code.');
            return;
        }

        if (!this.isStrongPassword(password)) {
            this.setMessage('Password must be 10+ characters with uppercase, lowercase, number, and symbol.');
            return;
        }

        try {
            if (submitBtn) submitBtn.disabled = true;
            const response = await fetch('/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: this.pendingResetEmail,
                    otp,
                    password
                })
            });
            const result = await this.readJson(response);

            if (!response.ok) {
                this.setMessage(result.error || 'Password reset failed.');
                return;
            }

            this.setMessage(result.message || 'Password reset successfully. Redirecting...', '#16a34a');
            window.location.href = '/app/';
        } catch (err) {
            console.error('Reset password error:', err);
            this.setMessage('Connection error. Please try again.');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    },

    /**
     * Initializes Google One Tap / Button
     */
    async initGoogle() {
        const googleBtn = document.getElementById('googleButton');
        const messageEl = document.getElementById('authMessage');

        const renderGoogleError = (reason) => {
            if (messageEl) {
                messageEl.textContent = reason;
                messageEl.style.color = '#ef4444';
            }
            if (googleBtn) {
                googleBtn.innerHTML = `
                    <div style="color: #ef4444; font-size: 0.875rem; text-align: center; padding: 10px; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 6px; background-color: rgba(239, 68, 68, 0.05); width: 100%;">
                        <i class="fa-solid fa-triangle-exclamation" style="margin-right: 5px;"></i>
                        Google Sign-In is unavailable
                    </div>
                `;
            }
        };

        try {
            const configResp = await fetch('/auth/config');
            const { googleClientId } = await configResp.json();

            if (!googleClientId) {
                renderGoogleError('Google configuration (GOOGLE_CLIENT_ID) is missing on the server.');
                return;
            }

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
                            if (messageEl) {
                                messageEl.textContent = err.error || 'Google Login failed';
                                messageEl.style.color = '#ef4444';
                            }
                        }
                    }
                });

                if (googleBtn) {
                    googleBtn.innerHTML = '';
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
                    if (attempts >= 50 && googleBtn && !googleBtn.querySelector('iframe')) {
                        renderGoogleError('Google sign-in script could not load. Check your network or Google client setup.');
                    }
                }
            }, 100);

        } catch (err) {
            console.error('Google Auth Init failed:', err);
            renderGoogleError('Google sign-in could not initialize. Please try again later.');
        }
    }
};

// --- Initialization Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Handle Forms
    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', Auth.handleSubmit.bind(Auth));
    }

    const otpForm = document.getElementById('otpForm');
    if (otpForm) {
        otpForm.addEventListener('submit', Auth.handleOtpSubmit.bind(Auth));
    }

    const resendOtpBtn = document.getElementById('resendOtpBtn');
    if (resendOtpBtn) {
        resendOtpBtn.addEventListener('click', () => Auth.resendOtp());
    }

    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener('click', () => Auth.setAuthMode('forgot'));
    }

    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', Auth.handleForgotPassword.bind(Auth));
    }

    const resetPasswordForm = document.getElementById('resetPasswordForm');
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', Auth.handleResetPassword.bind(Auth));
    }

    const backToLoginBtn = document.getElementById('backToLoginBtn');
    if (backToLoginBtn) {
        backToLoginBtn.addEventListener('click', () => Auth.setAuthMode('login'));
    }

    const requestAnotherResetBtn = document.getElementById('requestAnotherResetBtn');
    if (requestAnotherResetBtn) {
        requestAnotherResetBtn.addEventListener('click', () => Auth.setAuthMode('forgot'));
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
