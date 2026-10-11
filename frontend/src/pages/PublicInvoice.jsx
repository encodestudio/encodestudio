import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Printer } from "lucide-react";
import Seo from "../components/Seo.jsx";
import { fetchPublicInvoice } from "../lib/leadsApi.js";
import InvoiceDocument from "./leads/InvoiceDocument.jsx";

// The client's view of an invoice, reached from the emailed link. "Download PDF"
// uses the browser's print dialog (Save as PDF), so no PDF library is needed.
export default function PublicInvoice() {
  const { token } = useParams();
  const [params] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPublicInvoice(token)
      .then(setData)
      .catch((e) => setError(e.message));
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
        <p className="text-center text-sm text-encode-grey">Loading invoice...</p>
      ) : (
        <>
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
