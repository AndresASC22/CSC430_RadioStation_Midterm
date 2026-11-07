
# CSC430 Midterm Project — Waveform Radio
## Team Knicks in 5

**Course:** CSC430 — Software Project Management  
**Project:** Radio Station Website  
**Release:** Release 1 — Minimum Viable Product (MVP)  
**Presentation Date:** November 9, 2026

## 1. Project Overview

Waveform Radio is a responsive radio station website developed as an
educational software engineering project for CSC430.

The application provides visitors with access to an embedded live
radio player, radio show schedules, host biographies, station
announcements, and a contact/song-request form.

The project follows an incremental software development approach.
Release 1 focuses on the essential listener-facing functionality,
while administrative tools and additional features are planned for
future releases.

Waveform Radio is a fictional station. Its schedules, hosts, and
announcements are illustrative. The live audio player embeds the
real 106.7 Lite FM station through iHeartRadio.

## 2. Team Members and Responsibilities

- Franklin Shehu — Product Manager, project coordination, UML diagrams,
  MVP requirements and release planning.
- Louis Varveris — Requirements documentation and version-control
  coordination.
- Andres Romero — Frontend interface, GUI design and responsive layout.
- Alexandru Voicu — Backend development and application architecture.
- Mohammed Zabadneh — Functional and nonfunctional requirements,
  testing and quality assurance.

## 3. System Requirements

- Node.js 18 or later
- A modern web browser (Chrome, Edge, Firefox or Safari)
- Internet access for the embedded iHeartRadio broadcast

No external npm packages are required.

The application can run locally without an internet connection,
but live radio playback requires access to iHeartRadio.

## 4. How to Run the Application

1. Extract the submitted project ZIP.
2. Open the project folder in VS Code.
3. Open a terminal in the folder containing server.js.
4. Run:

```bash
node server.js
```

5. Open the following address in a browser:

http://localhost:3000

The local server uses port 3000 by default.

## 5. Release 1 — MVP Features

### Feature 1: Live Radio Integration (SR-01)

The website integrates the 106.7 Lite FM live radio player using
an embedded iHeartRadio iframe.

The player provides its own playback controls, allowing listeners
to start and stop the third-party broadcast.

The embedded player is displayed on the homepage.

No RADIO_STREAM_URL environment variable is required for this
integration.

Live audio playback depends on the external provider, browser
compatibility and internet connectivity.

### Feature 2: Radio Show Schedule (SR-02)

The website displays four sample radio programs:

- Morning Frequency
- Midday Mix
- Evening Sessions
- Weekend Spotlight

Each schedule entry includes the show title, broadcasting day,
start and end times, host and program category.

### Feature 3: Host Biographies (SR-03)

The website displays host information for:

- Jordan Lee
- Taylor Morgan
- Casey Rivera

Each profile includes the host's name, role and biography.

### Feature 4: Station Announcements (SR-05, Visitor View)

Visitors can view station announcements.

Release 1 includes announcements about the website launch
and Weekend Spotlight programming.

Administrative announcement editing is planned for Release 2.

### Feature 5: Contact and Song Requests (SR-07)

Visitors can submit a contact message or song request.

The form collects:

- Name
- Email address
- Message type
- Message or song request

The backend validates submissions and stores accepted requests
in data/requests.json.

After successful submission, the website displays:

"Message received and saved. Thank you!"

Requests are stored for this student prototype and are not
forwarded to the external iHeartRadio station.

## 6. Responsive Design (SR-06)

The website uses responsive CSS layouts to adapt to different
screen sizes.

The interface includes:

- Responsive navigation
- Flexible homepage layout
- Responsive schedule and host cards
- Mobile-friendly contact form
- Embedded radio player with responsive width

The website can be inspected at mobile screen sizes using
Chrome Developer Tools.

## 7. Software Architecture

The application follows a simplified three-tier architecture.

### Presentation Tier

Files located in public/:

- index.html
- styles.css
- app.js

These files provide the user interface, styling and frontend
interaction.

### Application Tier

server.js implements the Node.js HTTP server.

It handles API requests, validates form submissions, returns
station information and serves frontend files.

### Data Tier

data/requests.json stores submitted contact messages and
song requests.

Illustrative schedule, host and announcement data is currently
defined in server.js.

JSON file storage was selected for the educational MVP.
A relational database such as MySQL is a possible future
enhancement.

## 8. API Endpoints

### GET /api/content

Returns:

- Radio show schedules
- Host biographies
- Station announcements
- Legacy optional stream configuration fields

### POST /api/requests

Accepts validated contact messages and song requests.

Valid submissions are stored locally.

### Static Website

GET / serves the homepage.

The server also serves the website's JavaScript, CSS and other
static assets.

## 9. Testing

The project includes automated backend tests in:

tests/api.test.js

Run the tests using:

```bash
node --test tests/api.test.js
```

### Automated Test Results

Five automated tests passed successfully.

1. Homepage loads — PASS
2. Content includes schedule, hosts and announcements — PASS
3. Invalid request is rejected — PASS
4. Valid song request is stored — PASS
5. Unknown path returns HTTP 404 — PASS

**Total: 5 passed, 0 failed.**

### Manual Interface Verification

The website was inspected in a desktop browser.

The following interface components were displayed:

- Homepage with embedded iHeartRadio player
- Four radio show schedule cards
- Three host biography cards
- Two station announcements
- Contact and song-request form
- Successful message-submission confirmation

The embedded player was visually confirmed to load.
Actual live audio playback should be tested on the
presentation network.

Automated backend tests do not verify third-party audio playback.

## 10. Future Releases

### Release 2 — Administrative Features

Planned enhancements:

- Staff authentication
- Administrative dashboard
- Schedule creation, editing and deletion
- Announcement creation, editing and deletion
- Improved persistent data storage

### Release 3 — Additional Features

Planned enhancements:

- Optional listener accounts
- Personalized listener features
- Additional station interactions
- Enhanced accessibility and security
- Production deployment and compliance review

## 11. Project Limitations

Waveform Radio is an educational prototype.

The project does not operate its own broadcasting server.

The live broadcast is supplied by iHeartRadio and is separate
from the fictional Waveform Radio schedule and hosts.

The embedded player may require internet access and may be
subject to external service availability.

The application uses local JSON storage rather than a
production database.

Staff administration and listener accounts are outside
the scope of Release 1.

No formal broadcasting compliance audit has been conducted.

## 12. Project Structure

CSC430_RadioStation_Midterm/
  server.js
  README.md
  public/
    index.html
    styles.css
    app.js
  data/
    requests.json
  tests/
    api.test.js
  evidence/
    test_results.txt

## 13. Presentation Instructions

The project is demonstrated locally using:

```bash
node server.js
```

Open:

http://localhost:3000

Demonstrate the following:

1. Homepage and embedded live-radio player
2. Radio show schedule
3. Host biographies
4. Station announcements
5. Contact and song-request submission
6. Automated test execution

The application is designed to run on the presenting laptop.
An internet connection is required for external live radio audio.

## 14. Conclusion

Waveform Radio Release 1 provides the core listener-facing
functionality selected for the CSC430 midterm MVP.

The project demonstrates frontend development, backend API
integration, local data persistence, third-party live-radio
integration, responsive interface design and automated testing.

The MVP establishes a foundation for additional administrative
and listener features in future releases.
