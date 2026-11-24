# QueuSC

An enrollment portal for USC students. CIS 2102 final project.

- **Frontend:** React and Vite
- **Backend:** Node.js and Express
- **Database:** MariaDB (MySQL)

## What it does

**Students**
- Sign in, check their enrollment window and downpayment, and advise the courses they'll take.
- Enroll in a block (a fixed schedule) or non-block (a group for each course).
- Download their class schedule, study load and receipt as PDFs.

**Faculty** see the groups they teach and who enrolled in each.

**The registrar** manages:
- courses and the prospectus
- groups, rooms and enrollment windows
- downpayments
- the enrollment line

**Rules the server checks**, so they can't be bypassed from the browser:
- **Prerequisites:** from each student's grades, plus year standing.
- **Load limits:** a 30-unit cap and no time conflicts.
- **Seats:** two students can't take the last seat, because each seat is taken inside a database transaction.
- **Preconditions:** the student's window must be open and their downpayment paid.
- **Enrollment line:** only a set number of students can enroll at once. Everyone else waits in line and gets a turn in order.

## Sample accounts

Every account uses the `SEED_PASSWORD` from `.env`.

| Account | Email |
| --- | --- |
| Caroline Gobonseng (student, downpayment not yet paid) | 25100872@usc.edu.ph |
| Sebastian Subang (student, downpayment not yet paid) | 25100916@usc.edu.ph |
| Matthew Golez (student, paid) | 22103502@usc.edu.ph |
| Chris Ray Belarmino (faculty) | chrisray.belarmino@usc.edu.ph |
| Registrar | registrar@usc.edu.ph |

## Run it on your computer

You need Node.js 20.19 or newer, and MariaDB or MySQL.

```bash
npm install
cp .env.example .env     # then fill in your database name, user and password
npm run db:setup         # create the tables and load the sample data
npm run dev:server       # API on http://localhost:3000
npm run dev              # React dev server; open the link it prints
```

`npm run db:setup -- --reset` drops every QueuSC table and starts over.

## Deploy on the DCISM server

This follows the DCISM guides: Git deploy, PM2 and the MySQL/MariaDB connection guide.

1. On **webadmin.dcism.org**:
   - Create a subdomain, for example `queusc`. Its folder is `~/queusc`.
   - Create a MariaDB database, and note its name/username and password.
   - Note the port assigned to your app.
2. Connect over SSH, then sign in to GitHub once with `gh auth login` (choose HTTPS, and answer Yes to authenticating Git).
3. Clone the project into the subdomain folder:
   ```bash
   cd ~/queusc
   ls -A                                     # must be empty; remove any placeholder files first
   gh repo clone MatthewGolez/queusc-mockup .
   ```
4. Create `.env` and fill it in with your database details, port and a sample password:
   ```bash
   cp .env.example .env
   nano .env
   ```
5. Install, build, and set up the database:
   ```bash
   npm ci
   npm run build
   npm run db:setup
   ```
6. Start it with PM2. Replace 4000 with your assigned port.
   ```bash
   pm2 start server/index.js --name queusc -- -p 4000
   pm2 save
   ```
7. Open `https://queusc.dcism.org`.
8. Check that `https://queusc.dcism.org/.env` shows "Not found". If it downloads a file instead, the subdomain isn't pointing at the app yet. Stop and fix that in the subdomain settings.

### Updating after you push changes

```bash
cd ~/queusc
git pull
npm ci
npm run build
pm2 restart queusc
```

Use `pm2 logs queusc` to see errors.

## Project structure

```
server/
  index.js        starts the server (port from -p, or PORT in .env)
  app.js          Express app: /api routes, serves the built React app
  auth.js         passwords (scrypt), sessions, roles, sign-in limits
  student.js      catalog, advising, enrollment line, seats, enrolling
  staff.js        faculty class lists, registrar tools
  db.js           MariaDB connection pool
  schema.sql      the tables
  setup.js        creates the tables and loads the sample data
  seed-data.js    sample students, BS Information Systems prospectus, groups, blocks
src/
  App.jsx         routes
  components/     layout (sidebar, session checks), timetable, seats, icons
  pages/          one component per page
  state/          sign-in, enrollment data and state, toasts
  lib/            API calls, schedule helpers, enrollment rules, PDFs (jsPDF)
  styles.css      all styles
```
