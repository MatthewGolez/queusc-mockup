export default function Seats({ enrolled, cap }) {
  const left = cap - enrolled;
  if (left <= 0) return <span className="seat-full">Full</span>;
  return (
    <>
      <span className={`seat-n${left <= 7 ? " low" : ""}`}>{left} left</span>
      <span className="meter"><span style={{ width: `${Math.round((enrolled / cap) * 100)}%` }} /></span>
      <span className="seat-of">{enrolled} of {cap}</span>
    </>
  );
}
