# Manual test checklist

Start from fresh sample data with `npm run db:setup -- --reset`. Every account's password is the
`SEED_PASSWORD` in `.env`. Use a private window (or a second browser) when you need two people signed in at once.

## Sign-in
- [ ] A wrong password shows "Wrong email or password."
- [ ] Clicking a sample account fills in its email.
- [ ] Students land on Dashboard, Chris Ray Belarmino on My Classes, the registrar on Registrar.
- [ ] Sign out returns to the sign-in page.

## Student with downpayment paid (Matthew, 22103502@usc.edu.ph)
- [ ] Dashboard shows the window's closing date, a countdown, the downpayment as paid, and the enrollment schedule.
- [ ] Advise & Enroll checks this term's 9 courses already. "Add courses from other terms" and "Not available yet" list the rest, with reasons.
- [ ] Checking courses past 30 units shows a warning and disables Continue.
- [ ] Continue saves the courses and opens step 2 with a turn timer.
- [ ] Block A and B open only when exactly this term's 9 courses are advised.
- [ ] In Non-block, groups that overlap your other picks or are full are greyed out.
- [ ] Enroll. Then Study Load shows the timetable and course list, and both PDFs download.
- [ ] Downpayment shows "Download receipt", and the receipt PDF downloads.
- [ ] Course History shows grades for passed courses and "Enrolled" for this term.
- [ ] Reloading the page keeps you enrolled.

## Student without downpayment (Caroline, 25100872@usc.edu.ph)
- [ ] Dashboard asks you to pay the downpayment first.
- [ ] In Advise & Enroll, step 2 says "Pay your downpayment first".
- [ ] As the registrar, record her downpayment. Reload her page: she can now enroll.

## Registrar (registrar@usc.edu.ph)
- [ ] **Downpayments:** record a payment. Using a reference number that's already taken shows an error.
- [ ] **Windows:** move 2nd Year to tomorrow. A 2nd Year student sees "Opens ..." and can't enroll. Move it into the past: they see "closed". Put it back.
- [ ] **Courses:** add a course with a prerequisite, edit it, then delete it. Deleting a course that students are enrolled in or have grades for shows an error.
- [ ] **Groups:**
  - Add a group.
  - Booking a room that's already in use at that time shows an error.
  - Assigning Chris Ray Belarmino makes the group appear on his My Classes.
- [ ] **Rooms:** add and delete a room. Deleting a room that groups meet in shows an error.
- [ ] **Enrollment line:** set "Students enrolling at once" to 1.
  - Two students who open step 2 at the same time: one gets a turn, the other sees "You're in line".
  - When the first one enrolls, the second gets a turn within a few seconds.
  - The counts on this tab update every 5 seconds.

## Faculty (chrisray.belarmino@usc.edu.ph)
- [ ] My Classes lists his groups, with each student who enrolled in them.
- [ ] Opening a student page by address (e.g. `#/advise`) sends him back to My Classes.

## Live seats and turns
- [ ] Two students pick the same group. When one enrolls, the other's seat count drops within about 10 seconds, without reloading.
- [ ] With "Minutes per turn" set to 1, the turn timer runs out and the student is told their turn ended.

## Phone
- [ ] Every page fits the screen without sideways scrolling. Students get the bottom tab bar.
