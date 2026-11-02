import Icon from "../components/Icon.jsx";

const CHANNELS = [
  ["Over the counter", "Business Office, ground floor"],
  ["Bank deposit", "BDO and BPI partner branches"],
  ["Online", "Dragonpay or GCash"]
];

export default function Downpayment() {
  return (
    <section className="page active" id="page-downpayment" aria-labelledby="page-title">
      <div className="dp-layout">
        <div className="card dp-card">
          <div className="dp-top">
            <div>
              <div className="dl">1st Semester downpayment</div>
              <div className="dp-amount">&#8369;3,000.00</div>
            </div>
            <span className="badge badge-ok"><Icon name="check" />Paid in full</span>
          </div>
          <dl className="dp-details">
            <div><dt>Reference number</dt><dd className="mono">DP-2026-118273</dd></div>
            <div><dt>Date paid</dt><dd>July 20, 2026</dd></div>
            <div><dt>Payment channel</dt><dd>Over the counter, Business Office</dd></div>
            <div><dt>Applies to</dt><dd>Your 1st Semester enrollment slot</dd></div>
          </dl>
          <div className="dp-actions">
            <button className="btn btn-ghost" type="button">Download receipt</button>
          </div>
        </div>

        <div className="card channel-list">
          <h3 className="card-h">For future payments</h3>
          {CHANNELS.map(([name, where]) => (
            <div className="channel-item" key={name}><b>{name}</b><span>{where}</span></div>
          ))}
        </div>
      </div>
    </section>
  );
}
