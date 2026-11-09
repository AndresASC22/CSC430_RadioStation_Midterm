'use strict';
const statusElement = document.getElementById('adminStatus');
const panel = document.getElementById('adminContent');
const accessDenied = document.getElementById('accessDenied');
const usersBody = document.getElementById('usersBody');

async function fetchJson(path) {
  const response = await fetch(path, { credentials: 'same-origin' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
  return payload;
}
function showError(message) {
  statusElement.classList.add('is-error');
  statusElement.textContent = message;
}
async function loadUsers() {
  document.getElementById('refreshUsers').disabled = true;
  statusElement.textContent = 'Loading accounts…';
  statusElement.classList.remove('is-error');
  try {
    const { users } = await fetchJson('/api/admin/users');
    usersBody.replaceChildren();
    for (const user of users) {
      const tr = document.createElement('tr');
      const cells = [user.id, user.fullName, user.email, user.role, user.isActive ? 'Active' : 'Inactive'];
      for (const value of cells) {
        const td = document.createElement('td');
        td.textContent = String(value);
        tr.append(td);
      }
      usersBody.append(tr);
    }
    statusElement.textContent = `${users.length} accounts shown.`;
  } catch (error) {
    usersBody.replaceChildren();
    showError(error.message || 'Unable to load account list.');
  } finally {
    document.getElementById('refreshUsers').disabled = false;
  }
}
document.getElementById('refreshUsers').addEventListener('click', loadUsers);

(async function initAdmin() {
  try {
    const { user } = await fetchJson('/api/auth/me');
    if (user.role !== 'admin') {
      statusElement.textContent = '';
      accessDenied.hidden = false;
      return;
    }
    panel.hidden = false;
    await loadUsers();
  } catch (error) {
    statusElement.textContent = '';
    accessDenied.hidden = false;
  }
})();
