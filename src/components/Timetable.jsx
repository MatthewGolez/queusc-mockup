import { fmtTime, gridShape, pad12, roomCode, toMin, SLOT } from "../lib/schedule.js";

// Weekly grid (desktop) and day-by-day agenda (phones) for a list of sections.
// Clashing sections sit side by side in two lanes so neither hides the other.
export default function Timetable({ list, clashes = [] }) {
  const clashing = new Set(clashes.flatMap(([a, b]) => [a.id, b.id]));
  const { days, first, slots } = gridShape(list);

  const cells = [<div key="head" className="tt-head" style={{ gridArea: "1/1" }}>Time</div>];
  days.forEach(([, name], i) => {
    cells.push(<div key={`h${i}`} className="tt-head" style={{ gridArea: `1/${i * 2 + 2}/2/${i * 2 + 4}` }}>{name}</div>);
  });
  for (let s = 0; s < slots; s++) {
    const t = first + s * SLOT;
    cells.push(<div key={`t${s}`} className="tt-time" style={{ gridArea: `${s + 2}/1` }}>{pad12(t)} - {pad12(t + SLOT)}</div>);
  }
  days.forEach(([key], di) => {
    const taken = [];
    let lane = 0;
    const col = di * 2 + 2;
    list.forEach((c) => {
      if (!c.days.includes(key)) return;
      const a = (toMin(c.start) - first) / SLOT;
      const b = (toMin(c.end) - first) / SLOT;
      for (let k = a; k < b; k++) taken[k] = true;
      let [c1, c2] = [col, col + 2];
      if (clashing.has(c.id)) {
        c1 = col + (lane % 2);
        c2 = c1 + 1;
        lane++;
      }
      cells.push(
        <div key={`${c.id}-${key}`} className={`tt-block${clashing.has(c.id) ? " is-clash" : ""}`}
          style={{ gridArea: `${a + 2}/${c1}/${b + 2}/${c2}`, background: c.color }} title={`${c.title} (Group ${c.group})`}>
          <b>{c.code}</b> {roomCode(c)}
        </div>
      );
    });
    for (let k = 0; k < slots; k++) {
      if (!taken[k]) cells.push(<div key={`c${di}-${k}`} className="tt-cell" style={{ gridArea: `${k + 2}/${col}/${k + 3}/${col + 2}` }} />);
    }
  });

  return (
    <>
      <div className="tt" style={{ gridTemplateColumns: `minmax(150px, auto) repeat(${days.length * 2}, 1fr)`, gridTemplateRows: `auto repeat(${slots}, 30px)` }}>
        {cells}
      </div>
      <div className="agenda">
        {days.map(([key, name]) => {
          const todays = list.filter((c) => c.days.includes(key)).sort((a, b) => toMin(a.start) - toMin(b.start));
          if (!todays.length) return null;
          return (
            <div className="ag-day" key={key}>
              <h4>{name}</h4>
              {todays.map((c) => (
                <div key={c.id} className={`ag-item${clashing.has(c.id) ? " is-clash" : ""}`} style={{ borderLeftColor: c.color }}>
                  <span className="ag-time">{fmtTime(c.start)} - {fmtTime(c.end)}</span>
                  <b>{c.code}</b> {c.title}
                  <span className="ag-room">Group {c.group}, {c.room}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
