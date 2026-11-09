'use strict';
(() => {
  const section = document.getElementById('scheduleManagement');
  if (!section) return;
  const list = document.getElementById('scheduleShows');
  const message = document.getElementById('scheduleStatus');
  const form = document.getElementById('scheduleForm');
  const editor = document.getElementById('scheduleEditor');
  const slots = document.getElementById('scheduleSlots');
  const saveButton = document.getElementById('saveSchedule');
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let selectedId = null;
  let currentShows = [];

  function status(text, error = false) {
    message.textContent = text;
    message.classList.toggle('is-error', error);
  }
  async function api(url, options = {}) {
    const response = await fetch(url, { credentials: 'same-origin', ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
    return data;
  }
  function createField(tag, value, className) {
    const element = document.createElement(tag);
    element.textContent = value;
    if (className) element.className = className;
    return element;
  }
  function addSlot(day = 1, start = '08:00', end = '10:00') {
    const row = document.createElement('div');
    row.className = 'schedule-slot';
    const dayInput = document.createElement('select');
    dayInput.setAttribute('aria-label', 'Day of week');
    dayInput.className = 'slot-day';
    days.forEach((dayName, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = dayName;
      dayInput.append(option);
    });
    dayInput.value = String(day);
    const startInput = document.createElement('input');
    startInput.type = 'time'; startInput.value = start; startInput.required = true;
    startInput.className = 'slot-start'; startInput.setAttribute('aria-label', 'Start time');
    const endInput = document.createElement('input');
    endInput.type = 'time'; endInput.value = end; endInput.required = true;
    endInput.className = 'slot-end'; endInput.setAttribute('aria-label', 'End time');
    const removeButton = document.createElement('button');
    removeButton.type = 'button'; removeButton.className = 'auth-outline';
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => row.remove());
    row.append(dayInput, startInput, endInput, removeButton);
    slots.append(row);
  }
  function openEditor(show = null) {
    selectedId = show ? show.id : null;
    document.getElementById('scheduleFormTitle').textContent = show ? 'Edit show' : 'New show';
    form.elements.title.value = show ? show.title : '';
    form.elements.host.value = show ? show.host : '';
    form.elements.genre.value = show ? show.genre : '';
    slots.replaceChildren();
    if (show) show.slots.forEach(s => addSlot(s.dayOfWeek, s.start, s.end));
    else addSlot();
    editor.hidden = false;
    form.elements.title.focus();
  }
  async function loadSchedule() {
    status('Loading schedule…');
    try {
      const result = await api('/api/admin/schedule');
      currentShows = result.shows;
      list.replaceChildren();
      if (!currentShows.length) list.append(createField('p', 'No shows yet. Add your first show.', 'auth-muted'));
      for (const show of currentShows) {
        const item = document.createElement('article');
        item.className = 'schedule-item';
        const details = document.createElement('div');
        details.append(createField('h3', show.title));
        details.append(createField('p', `${show.host} · ${show.genre || 'No genre'}`, 'auth-muted'));
        for (const slot of show.slots) details.append(createField('p', `${days[slot.dayOfWeek]} · ${slot.start}–${slot.end}`, 'schedule-time'));
        const actions = document.createElement('div');
        actions.className = 'schedule-actions';
        const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'auth-outline'; edit.textContent = 'Edit';
        edit.addEventListener('click', () => openEditor(show));
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'auth-outline'; remove.textContent = 'Delete';
        remove.addEventListener('click', async () => {
          if (!confirm(`Delete "${show.title}" and all its broadcast slots?`)) return;
          remove.disabled = true;
          try {
            await api(`/api/admin/schedule/${show.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
            if (selectedId === show.id) editor.hidden = true;
            await loadSchedule();
            status('Show deleted.');
          } catch (err) { status(err.message, true); remove.disabled = false; }
        });
        actions.append(edit, remove);
        item.append(details, actions);
        list.append(item);
      }
      status(`${currentShows.length} shows loaded.`);
    } catch (err) { status(err.message, true); }
  }
  document.getElementById('newScheduleShow').addEventListener('click', () => openEditor());
  document.getElementById('refreshSchedule').addEventListener('click', loadSchedule);
  document.getElementById('addScheduleSlot').addEventListener('click', () => addSlot());
  document.getElementById('cancelScheduleEdit').addEventListener('click', () => { editor.hidden = true; });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const payload = {
      title: form.elements.title.value,
      host: form.elements.host.value,
      genre: form.elements.genre.value,
      slots: Array.from(slots.querySelectorAll('.schedule-slot')).map(row => ({
        dayOfWeek: Number(row.querySelector('.slot-day').value),
        start: row.querySelector('.slot-start').value,
        end: row.querySelector('.slot-end').value
      }))
    };
    saveButton.disabled = true;
    try {
      await api(selectedId === null ? '/api/admin/schedule' : `/api/admin/schedule/${selectedId}`, {
        method: selectedId === null ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      editor.hidden = true;
      await loadSchedule();
      status('Schedule saved. Refresh the public homepage to see the update.');
    } catch (err) { status(err.message, true); }
    finally { saveButton.disabled = false; }
  });
  // The existing admin page's authentication check controls adminContent visibility.
  // Server-side role checks remain the actual security boundary.
  loadSchedule();
})();
