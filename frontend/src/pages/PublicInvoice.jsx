import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, Printer } from "lucide-react";
import Seo from "../components/Seo.jsx";
import { confirmRazorpayReturn, fetchPublicInvoice } from "../lib/leadsApi.js";
import InvoiceDocument from "./leads/InvoiceDocument.jsx";

const RAZORPAY_PARAMS = [
  "razorpay_payment_id",
  "razorpay_payment_link_id",
  "razorpay_payment_link_reference_id",
  "razorpay_payment_link_status",
  "razorpay_signature",
];

// The client's view of an invoice, reached from the emailed link. "Download PDF"
// uses the browser's print dialog (Save as PDF), so no PDF library is needed.
// Razorpay sends the customer back here after paying, with signed razorpay_* params.
export default function PublicInvoice() {
  const { token } = useParams();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState(null); // null | "confirming" | "paid" | "pending"

  useEffect(() => {
    const returned = Object.fromEntries(RAZORPAY_PARAMS.map((k) => [k, params.get(k)]));
    const isReturn = Boolean(returned.razorpay_payment_id && returned.razorpay_signature);
    if (isReturn) {
      setPayment("confirming");
      // Drop the params so a refresh or a shared URL doesn't carry them.
      setParams({}, { replace: true });
    }
    (async () => {
      try {
        const loaded = await fetchPublicInvoice(token);
        if (!isReturn) return setData(loaded);
        try {
          const confirmed = await confirmRazorpayReturn(token, returned);
          setData({ ...loaded, invoice: confirmed.invoice });
          setPayment("paid");
        } catch {
          // Not verifiable here; the Razorpay webhook will still record it.
          setData(loaded);
          setPayment("pending");
        }
      } catch (e) {
        setError(e.message);
      }
    })();
    // Runs once per invoice; params are read on first load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!data) return;
    const name = data.invoice.number ? `Invoice ${data.invoice.number.replace(/\//g, "-")}` : "Invoice";
    const previous = document.title;
    document.title = `${name} — ${data.business.business_name}`; // becomes the default PDF file name
    if (params.get("print") === "1") setTimeout(() => window.print(), 400);
    return () => {
      document.title = previous;
    };
  }, [data, params]);

  return (
    <div className="min-h-screen bg-encode-soft py-6 sm:py-10 print:bg-white print:py-0">
      <Seo title="Invoice" path={`/invoice/${token}`} noindex />
      {error ? (
        <div className="mx-auto max-w-md rounded-2xl border border-encode-border bg-white p-8 text-center">
          <p className="font-semibold">This invoice link isn't valid.</p>
          <p className="mt-1 text-sm text-encode-grey">Check the link in your email, or reply to it and we'll help.</p>
        </div>
      ) : !data ? (
        <p className="text-center text-sm text-encode-grey">{payment === "confirming" ? "Confirming your payment..." : "Loading invoice..."}</p>
      ) : (
        <>
          {payment && payment !== "confirming" && (
            <div role="status" className="mx-auto mb-4 flex max-w-[820px] items-start gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 print:hidden">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <p>
                <strong>Thank you, payment received.</strong>{" "}
                {payment === "paid"
                  ? data.invoice.balance > 0
                    ? "It's been applied to this invoice."
                    : "This invoice is now paid in full."
                  : "It can take a minute to show on this invoice. You'll also get a receipt from Razorpay."}
              </p>
            </div>
          )}
          <div className="mx-auto mb-4 flex max-w-[820px] items-center justify-between px-4 print:hidden sm:px-0">
            <p className="text-sm text-encode-grey">
              Invoice from <strong className="text-black">{data.business.business_name}</strong>
            </p>
            <button onClick={() => window.print()} className="btn-primary !px-4 !py-2.5">
              <Printer size={15} /> Download PDF
            </button>
          </div>
          <div className="mx-auto max-w-[820px] overflow-hidden rounded-2xl border border-encode-border shadow-sm print:max-w-none print:rounded-none print:border-0 print:shadow-none">
            <InvoiceDocument invoice={data.invoice} business={data.business} />
          </div>
        </>
      )}
    </div>
  );
}
