/* Time and schedule helpers shared by the enrollment flow, the timetable and the PDFs. */

export const DAYS = [["M", "Monday"], ["T", "Tuesday"], ["W", "Wednesday"], ["Th", "Thursday"], ["F", "Friday"], ["S", "Saturday"]];
export const SLOT = 30;

export const toMin = (t) => {
  const [h, m] = t.split(":");
  return +h * 60 + +m;
};

// "10:00" -> "10:00 AM"
export function fmtTime(t) {
  const m = toMin(t);
  const h = Math.floor(m / 60);
  return `${h % 12 || 12}:${String(m % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

// Minutes since midnight -> "07:30 AM" (padded, as on the printed study load)
export function pad12(m) {
  const h = Math.floor(m / 60);
  return `${String(h % 12 || 12).padStart(2, "0")}:${String(m % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export const sumUnits = (list) => list.reduce((s, c) => s + c.units, 0);
export const roomCode = (c) => c.room.replace(/\s+/g, "");
export const when = (sec) => `${sec.days.join(" ")} ${fmtTime(sec.start)} - ${fmtTime(sec.end)}`;
export const isFull = (sec) => sec.enrolled >= sec.cap;

// A course in one specific group, flattened into what the timetable and PDFs need.
export function section(course, n) {
  const g = course.groups.find((row) => row[0] === n);
  return {
    id: course.id, code: course.code, title: course.title, units: course.units, color: course.color, group: g[0],
    days: g[1].split(" "), start: g[2], end: g[3], room: g[4], faculty: g[5], enrolled: g[6], cap: g[7]
  };
}

export function overlaps(a, b) {
  const sharedDay = a.days.some((d) => b.days.includes(d));
  return sharedDay && toMin(a.start) < toMin(b.end) && toMin(b.start) < toMin(a.end);
}

// Every pair of sections whose times overlap.
export function conflicts(list) {
  const hits = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      if (overlaps(list[i], list[j])) hits.push([list[i], list[j]]);
    }
  }
  return hits;
}

// The days and 30-minute rows a list of sections needs. Saturday only appears when used.
export function gridShape(list) {
  const days = DAYS.filter((d, i) => i < 5 || list.some((c) => c.days.includes(d[0])));
  const first = Math.floor(Math.min(...list.map((c) => toMin(c.start))) / SLOT) * SLOT;
  const last = Math.ceil(Math.max(...list.map((c) => toMin(c.end))) / SLOT) * SLOT;
  return { days, first, slots: (last - first) / SLOT };
}
