'use strict';

const $ = id => document.getElementById(id);
const status = $('accountStatus');
const loginForm = $('loginForm');
const registerForm = $('registerForm');
const loginTab = $('showLogin');
const registerTab = $('showRegister');

function message(text, error = false) {
  status.textContent = text;
  status.classList.toggle('is-error', error);
}
function chooseForm(mode) {
  const login = mode === 'login';
  loginForm.hidden = !login;
  registerForm.hidden = login;
  loginTab.classList.toggle('is-active', login);
  registerTab.classList.toggle('is-active', !login);
  loginTab.setAttribute('aria-pressed', String(login));
  registerTab.setAttribute('aria-pressed', String(!login));
  message('');
}
async function api(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status}).`);
  return body;
}
function showUser(user) {
  $('authForms').hidden = true;
  $('sessionPanel').hidden = false;
  $('welcomeName').textContent = `Welcome, ${user.fullName}!`;
  $('sessionEmail').textContent = user.email;
  $('sessionRole').textContent = user.role;
  $('adminDashboardLink').hidden = user.role !== 'admin';
  message('');
}
function showLoggedOut() {
  $('authForms').hidden = false;
  $('sessionPanel').hidden = true;
  chooseForm('login');
}
function setBusy(form, busy) {
  form.querySelector('button[type="submit"]').disabled = busy;
}
function jsonOptions(body) {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}
loginTab.addEventListener('click', () => chooseForm('login'));
registerTab.addEventListener('click', () => chooseForm('register'));

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  setBusy(loginForm, true);
  message('Signing in…');
  try {
    const data = await api('/api/auth/login', jsonOptions({
      email: $('loginEmail').value.trim(),
      password: $('loginPassword').value
    }));
    loginForm.reset();
    showUser(data.user);
  } catch (error) {
    message(error.message || 'Could not sign in.', true);
  } finally {
    setBusy(loginForm, false);
  }
});

registerForm.addEventListener('submit', async event => {
  event.preventDefault();
  if ($('registerPassword').value !== $('confirmPassword').value) {
    message('Passwords do not match.', true);
    return;
  }
  setBusy(registerForm, true);
  message('Creating account…');
  try {
    const email = $('registerEmail').value.trim();
    await api('/api/auth/register', jsonOptions({
      fullName: $('registerName').value.trim(),
      email,
      password: $('registerPassword').value
    }));
    registerForm.reset();
    chooseForm('login');
    $('loginEmail').value = email;
    message('Account created! Sign in to continue.');
  } catch (error) {
    message(error.message || 'Could not register.', true);
  } finally {
    setBusy(registerForm, false);
  }
});

$('logoutButton').addEventListener('click', async () => {
  $('logoutButton').disabled = true;
  try {
    await api('/api/auth/logout', jsonOptions({}));
    showLoggedOut();
    message('You have logged out.');
  } catch (error) {
    message(error.message || 'Could not log out.', true);
  } finally {
    $('logoutButton').disabled = false;
  }
});

(async function init() {
  try {
    const data = await api('/api/auth/me');
    showUser(data.user);
  } catch (error) {
    // 401 is the normal response for a visitor without an active session.
    showLoggedOut();
    if (error.message !== 'Not logged in.') {
      message('Could not check your session. Sign-in may still be available.', true);
    }
  }
})();
