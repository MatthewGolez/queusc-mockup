import { useState } from "react";
import { fmtDate, useEnrollment } from "../state/Enrollment.jsx";
import { useAuth } from "../state/Auth.jsx";
import { useToast } from "../state/Toast.jsx";
import { fullName } from "../lib/auth.js";
import Icon from "../components/Icon.jsx";

const CHANNELS = [
  ["Over the counter", "Business Office, ground floor"],
  ["Bank deposit", "BDO and BPI partner branches"],
  ["Online", "Dragonpay or GCash"]
];

const peso = (n) => `₱${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

export default function Downpayment() {
  const { data } = useEnrollment();
  const { user } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const p = data.payment;

  const receipt = async () => {
    setBusy(true);
    try {
      const { buildReceiptPdf } = await import("../lib/pdf.js");
      buildReceiptPdf({
        student: `${fullName(user)} (${user.id})`, program: user.program, term: data.term.label,
        amount: `PHP ${p.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, reference: p.reference, channel: p.channel, paidAt: fmtDate(Date.parse(p.paidAt))
      }).save(`QueuSC-Receipt-${p.reference}.pdf`);
      toast("Receipt downloaded.");
    } catch {
      toast("Couldn’t create the receipt. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="page active" id="page-downpayment" aria-labelledby="page-title">
      <div className="dp-layout">
        <div className="card dp-card">
          <div className="dp-top">
            <div>
              <div className="dl">1st Semester downpayment</div>
              <div className="dp-amount">{peso(p ? p.amount : data.downpaymentAmount)}</div>
            </div>
            {p ? <span className="badge badge-ok"><Icon name="check" />Paid in full</span>
              : <span className="badge badge-due">Not paid</span>}
          </div>
          {p ? (
            <>
              <dl className="dp-details">
                <div><dt>Reference number</dt><dd className="mono">{p.reference}</dd></div>
                <div><dt>Date paid</dt><dd>{fmtDate(Date.parse(p.paidAt))}</dd></div>
                <div><dt>Payment channel</dt><dd>{p.channel}</dd></div>
                <div><dt>Applies to</dt><dd>Your 1st Semester enrollment slot</dd></div>
              </dl>
              <div className="dp-actions">
                <button className="btn btn-ghost" type="button" disabled={busy} onClick={receipt}>
                  <Icon name="download" /><span>{busy ? "Preparing PDF…" : "Download receipt"}</span>
                </button>
              </div>
            </>
          ) : (
            <p className="dp-due">
              Pay through any channel on the right. The Registrar&rsquo;s Office records your payment, and you can
              enroll once it shows here.
            </p>
          )}
        </div>

        <div className="card channel-list">
          <h3 className="card-h">{p ? "For future payments" : "Where to pay"}</h3>
          {CHANNELS.map(([name, where]) => (
            <div className="channel-item" key={name}><b>{name}</b><span>{where}</span></div>
          ))}
        </div>
      </div>
    </section>
  );
}
