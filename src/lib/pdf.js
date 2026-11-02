/* Builds one of two PDFs with jsPDF: part "schedule" (weekly timetable) or "list" (study load course list).
   Imported on demand, so jsPDF only loads when someone downloads. */
import { jsPDF } from "jspdf";
import { gridShape, pad12, roomCode, toMin, SLOT } from "./schedule.js";

const INK = "#333333";
const MUTED = "#666666";
const LINE = "#333333";

export function buildStudyLoadPdf(courses, opts) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const mx = 12;
  const y = 14;
  const isSchedule = opts.part === "schedule";

  /* Header */
  doc.setTextColor(INK);
  doc.setFont("helvetica", "bold").setFontSize(16);
  doc.text(isSchedule ? "Class Schedule" : "Study Load", mx, y);
  doc.setFont("helvetica", "normal").setFontSize(9.5);
  doc.text(opts.term, mx, y + 6);
  doc.text(opts.student, mx, y + 11);
  doc.setTextColor(MUTED).setFontSize(8.5);
  doc.text("QueuSC", pageW - mx, y, { align: "right" });
  doc.text(`Generated ${opts.generated}`, pageW - mx, y + 6, { align: "right" });
  doc.text(`${opts.section}: ${courses.length} courses, ${opts.units.toFixed(1)} units`, pageW - mx, y + 11, { align: "right" });

  const top = y + 17;
  if (isSchedule) drawTimetable(doc, courses, { mx, top, pageW });
  else drawCourseList(doc, courses, opts, { mx, top, pageW, pageH });

  /* Page numbers when the study load runs to a second page */
  const pages = doc.internal.getNumberOfPages();
  for (let pg = 1; pages > 1 && pg <= pages; pg++) {
    doc.setPage(pg);
    doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(MUTED);
    doc.text(`Page ${pg} of ${pages}`, pageW - mx, pageH - 8, { align: "right" });
  }
  return doc;
}

function drawTimetable(doc, courses, { mx, top, pageW }) {
  const { days, first, slots } = gridShape(courses);
  const timeW = 40;
  const headH = 7;
  const dayW = (pageW - 2 * mx - timeW) / days.length;
  const rowH = Math.min(6, 92 / slots);

  doc.setDrawColor(LINE).setLineWidth(0.2).setTextColor(INK);
  doc.setFont("helvetica", "bold").setFontSize(8.5);
  doc.rect(mx, top, timeW, headH);
  doc.text("Time", mx + timeW / 2, top + headH / 2, { align: "center", baseline: "middle" });
  days.forEach(([, name], i) => {
    const x = mx + timeW + i * dayW;
    doc.rect(x, top, dayW, headH);
    doc.text(name, x + dayW / 2, top + headH / 2, { align: "center", baseline: "middle" });
  });

  doc.setFontSize(7.5);
  for (let s = 0; s < slots; s++) {
    const ry = top + headH + s * rowH;
    const t = first + s * SLOT;
    doc.rect(mx, ry, timeW, rowH);
    doc.text(`${pad12(t)} - ${pad12(t + SLOT)}`, mx + timeW / 2, ry + rowH / 2, { align: "center", baseline: "middle" });
  }

  days.forEach(([key], di) => {
    const x = mx + timeW + di * dayW;
    const taken = [];
    courses.forEach((c) => {
      if (!c.days.includes(key)) return;
      const a = (toMin(c.start) - first) / SLOT;
      const b = (toMin(c.end) - first) / SLOT;
      for (let k = a; k < b; k++) taken[k] = true;
      const by = top + headH + a * rowH;
      const bh = (b - a) * rowH;
      doc.setFillColor(c.color);
      doc.rect(x, by, dayW, bh, "FD");
      doc.setFontSize(8);
      doc.text(`${c.code} ${roomCode(c)}`, x + dayW / 2, by + bh / 2, { align: "center", baseline: "middle" });
    });
    for (let k = 0; k < slots; k++) {
      if (!taken[k]) doc.rect(x, top + headH + k * rowH, dayW, rowH);
    }
  });
}

function drawCourseList(doc, courses, opts, { mx, top, pageW, pageH }) {
  const cols = [["Course code", 24], ["Group", 14], ["Description", 72], ["Schedule", 50], ["Room", 20], ["Faculty", 73], ["Units", 20]];
  const listW = pageW - 2 * mx;
  const lineH = 6;
  const scale = listW / cols.reduce((sum, col) => sum + col[1], 0);
  let ty = top;

  const row = (cells, yy, bold, fill) => {
    let x = mx;
    if (fill) {
      doc.setFillColor(fill);
      doc.rect(mx, yy, listW, lineH, "F");
    }
    doc.setFont("helvetica", bold ? "bold" : "normal");
    cells.forEach((text, i) => {
      const w = cols[i][1] * scale;
      const right = i === cells.length - 1;
      const str = doc.splitTextToSize(String(text), w - 3)[0];
      doc.text(str, right ? x + w - 2 : x + 2, yy + lineH / 2, { align: right ? "right" : "left", baseline: "middle" });
      x += w;
    });
    doc.setDrawColor("#BBBBBB").line(mx, yy + lineH, mx + listW, yy + lineH);
  };

  // Move the list to a second page when it won't fit above the bottom margin.
  if (ty + lineH * (courses.length + 1) + 8 > pageH - 10) {
    doc.addPage();
    doc.setTextColor(INK).setFont("helvetica", "bold").setFontSize(12);
    doc.text("Study Load (continued)", mx, 16);
    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text(opts.student, mx, 22);
    ty = 30;
  }

  doc.setFontSize(8).setTextColor(INK);
  row(cols.map((col) => col[0]), ty, true, "#EEEEEE");
  courses.forEach((c, i) => {
    const time = `${c.days.join(" ")} ${pad12(toMin(c.start))} - ${pad12(toMin(c.end))}`;
    row([c.code, String(c.group), c.title, time, roomCode(c), c.faculty, c.units.toFixed(1)], ty + lineH * (i + 1), false);
  });
  const endY = ty + lineH * (courses.length + 1);
  doc.setFont("helvetica", "bold");
  doc.text(`Total units: ${opts.units.toFixed(1)}`, mx + listW - 2, endY + 5, { align: "right" });
}
