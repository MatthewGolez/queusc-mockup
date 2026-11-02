# QueuSC

An enrollment portal for USC students, built with **React** and **Vite**. CIS 2102 final project.

Students sign in, advise the courses they will take this semester, then enroll either in a block
(Block A or B, a fixed schedule) or non-block (picking a group for each course). They can then
view and download their class schedule and study load as PDFs.

## Run it locally

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install     # install dependencies (first time only)
npm run dev     # start the dev server, then open the link it prints
npm run build   # build the production site into dist/
```

## Project structure

```
index.html              Vite entry page
src/
  main.jsx              mounts the app with React Router
  App.jsx               routes: login, dashboard, advise, study load, downpayment, course history
  components/           Layout (sidebar, top bar, session guard), Timetable, Seats, Icon
  pages/                one component per page
  state/                enrollment state (useReducer + context), countdown, toasts
  data/                 sample accounts and session, BS Information Systems prospectus and class groups
  lib/                  schedule helpers, enrollment rules, PDF builder (jsPDF)
  styles.css            all styles
```

## Deployment

Every push to `main` builds the site and publishes it to GitHub Pages through
`.github/workflows/deploy.yml`.

Sign-in is simulated: the sample accounts have no passwords, and all data is illustrative.
