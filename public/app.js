
'use strict';

const el = id => document.getElementById(id);

const text = (tag, value, className) => {
  const element = document.createElement(tag);
  element.textContent = value;

  if (className) {
    element.className = className;
  }

  return element;
};

function addCard(container, parts, className) {
  const card = document.createElement('article');
  card.className = className;

  parts.forEach(part => card.append(part));
  container.append(card);
}

async function load() {
  try {
    const response = await fetch('/api/content');

    if (!response.ok) {
      throw new Error('Unable to load station content.');
    }

    const data = await response.json();

    // Display radio show schedules.
    const scheduleList = el('scheduleList');
    scheduleList.replaceChildren();

    data.shows.forEach(show => {
      addCard(
        scheduleList,
        [
          text('div', show.start + ' – ' + show.end, 'time'),
          text('p', show.day, 'day'),
          text('h3', show.title),
          text('p', 'With ' + show.host),
          text('p', show.genre, 'genre')
        ],
        'show'
      );
    });

    // Display radio host biographies.
    const hostList = el('hostList');
    hostList.replaceChildren();

    data.hosts.forEach(host => {
      const initials = host.name
        .split(' ')
        .map(part => part[0])
        .join('');

      addCard(
        hostList,
        [
          text('div', initials, 'avatar'),
          text('h3', host.name),
          text('p', host.role, 'role'),
          text('p', host.bio)
        ],
        'host'
      );
    });

    // Display station announcements.
    const newsList = el('newsList');
    newsList.replaceChildren();

    data.announcements.forEach(announcement => {
      const dateElement = text('time', announcement.date);
      dateElement.dateTime = announcement.date;

      addCard(
        newsList,
        [
          dateElement,
          text('h3', announcement.title),
          text('p', announcement.body)
        ],
        'news'
      );
    });

    // The live broadcast is integrated through the official
    // iHeartRadio iframe in index.html.
    // Its own embedded controls handle playback and stopping.
    // The iframe is separate from the backend RADIO_STREAM_URL.

  } catch (error) {
    console.error('Content loading error:', error);

    ['scheduleList', 'hostList', 'newsList'].forEach(id => {
      const container = el(id);

      if (container && !container.hasChildNodes()) {
        container.append(
          text('p', 'Station content is temporarily unavailable.')
        );
      }
    });
  }
}

// Handle contact messages and song requests.
const contactForm = el('contactForm');

contactForm.addEventListener('submit', async event => {
  event.preventDefault();

  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const formStatus = el('formStatus');

  const data = Object.fromEntries(new FormData(form));

  formStatus.textContent = 'Sending…';
  submitButton.disabled = true;

  try {
    const response = await fetch('/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || 'Unable to submit your message.'
      );
    }

    formStatus.textContent =
      'Message received and saved. Thank you!';

    form.reset();

  } catch (error) {
    formStatus.textContent =
      error.message || 'Unable to send message. Please try again.';

  } finally {
    submitButton.disabled = false;
  }
});

// Initialize station content.
load();
