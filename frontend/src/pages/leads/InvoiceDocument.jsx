import Logo from "../../components/Logo.jsx";
import { amountInWords } from "../../lib/invoiceMath.js";
import { formatDay, formatInr, stateName } from "./format.js";

const qty = (n) => Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });

function Lines({ children }) {
  return <div className="space-y-0.5 text-[12px] leading-relaxed text-black/70">{children}</div>;
}

/**
 * The invoice as the client sees and prints it (A4). Used by the portal preview
 * and the public /invoice/:token page. `business` is the invoice settings.
 */
export default function InvoiceDocument({ invoice, business }) {
  const gst = invoice.tax_mode !== "none" && business.gstin;
  const title = gst ? "Tax Invoice" : "Invoice";
  const showSac = invoice.items.some((i) => i.sac);
  const showTax = invoice.tax_mode !== "none";
  const placeOfSupply = invoice.client_state_code
    ? `${stateName(invoice.client_state_code)} (${invoice.client_state_code})`
    : business.state_code
      ? `${stateName(business.state_code)} (${business.state_code})`
      : "";

  return (
    <article className="invoice-doc relative mx-auto w-full max-w-[820px] bg-white p-8 text-black sm:p-12">
      {(invoice.status === "draft" || invoice.status === "void") && (
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <span className="-rotate-[24deg] select-none text-[120px] font-black uppercase tracking-widest text-black/[0.04]">
            {invoice.status === "void" ? "Void" : "Draft"}
          </span>
        </div>
      )}

      <header className="flex flex-col gap-6 border-b border-black pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Logo className="mb-3 h-8 w-auto" />
          <p className="text-sm font-bold">{business.legal_name || business.business_name}</p>
          <Lines>
            {business.address && <p className="whitespace-pre-line">{business.address}</p>}
            {business.state_code && (
              <p>
                {stateName(business.state_code)} ({business.state_code})
              </p>
            )}
            {business.gstin && <p>GSTIN: <span className="font-semibold text-black">{business.gstin}</span></p>}
            {business.pan && <p>PAN: {business.pan}</p>}
            {(business.email || business.phone) && <p>{[business.email, business.phone].filter(Boolean).join(" · ")}</p>}
          </Lines>
        </div>
        <div className="sm:text-right">
          <h1 className="font-display text-2xl font-bold uppercase tracking-tight">{title}</h1>
          <dl className="mt-3 grid grid-cols-[auto_auto] justify-start gap-x-4 gap-y-1 text-[12px] sm:justify-end">
            <dt className="text-black/60">Invoice no.</dt>
            <dd className="font-semibold">{invoice.number || "Draft"}</dd>
            <dt className="text-black/60">Invoice date</dt>
            <dd>{formatDay(invoice.issue_date)}</dd>
            {invoice.due_date && (
              <>
                <dt className="text-black/60">Due date</dt>
                <dd>{formatDay(invoice.due_date)}</dd>
              </>
            )}
            {gst && placeOfSupply && (
              <>
                <dt className="text-black/60">Place of supply</dt>
                <dd>{placeOfSupply}</dd>
              </>
            )}
          </dl>
        </div>
      </header>

      <section className="grid gap-6 py-6 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-black/50">Bill to</p>
          <p className="text-sm font-bold">{invoice.client_company || invoice.client_name}</p>
          <Lines>
            {invoice.client_company && <p>Attn: {invoice.client_name}</p>}
            {invoice.client_address && <p className="whitespace-pre-line">{invoice.client_address}</p>}
            {invoice.client_state_code && (
              <p>
                {stateName(invoice.client_state_code)} ({invoice.client_state_code})
              </p>
            )}
            {invoice.client_gstin && <p>GSTIN: <span className="font-semibold text-black">{invoice.client_gstin}</span></p>}
            {(invoice.client_email || invoice.client_phone) && (
              <p>{[invoice.client_email, invoice.client_phone].filter(Boolean).join(" · ")}</p>
            )}
          </Lines>
        </div>
        {invoice.balance > 0 && invoice.status === "issued" && (
          <div className="self-start rounded-xl bg-encode-soft p-4 sm:justify-self-end sm:text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/50">Amount due</p>
            <p className="mt-1 font-display text-2xl font-bold">{formatInr(invoice.balance)}</p>
            {invoice.due_date && <p className="text-[12px] text-black/60">by {formatDay(invoice.due_date)}</p>}
          </div>
        )}
      </section>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-[12px]">
          <thead>
            <tr className="border-y border-black text-left text-[10px] font-bold uppercase tracking-[0.12em] text-black/60">
              <th className="w-8 py-2 pr-2">#</th>
              <th className="py-2 pr-2">Description</th>
              {showSac && <th className="py-2 pr-2">SAC/HSN</th>}
              <th className="py-2 pr-2 text-right">Qty</th>
              <th className="py-2 pr-2 text-right">Rate</th>
              {showTax && <th className="py-2 pr-2 text-right">GST</th>}
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={item.id ?? i} className="border-b border-encode-border align-top">
                <td className="py-2.5 pr-2 text-black/50">{i + 1}</td>
                <td className="whitespace-pre-line py-2.5 pr-2">{item.description}</td>
                {showSac && <td className="py-2.5 pr-2 text-black/70">{item.sac}</td>}
                <td className="py-2.5 pr-2 text-right tabular-nums">{qty(item.quantity)}</td>
                <td className="py-2.5 pr-2 text-right tabular-nums">{formatInr(item.unit_price)}</td>
                {showTax && <td className="py-2.5 pr-2 text-right tabular-nums">{item.tax_rate}%</td>}
                <td className="py-2.5 text-right font-medium tabular-nums">{formatInr(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-5 flex flex-col-reverse gap-6 sm:flex-row sm:justify-between">
        <div className="max-w-sm text-[12px]">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/50">Amount in words</p>
          <p className="mt-1 font-medium">{amountInWords(invoice.total)}</p>
        </div>
        <table className="w-full text-[12px] tabular-nums sm:w-72">
          <tbody>
            <tr>
              <td className="py-1 text-black/60">Subtotal</td>
              <td className="py-1 text-right">{formatInr(invoice.subtotal)}</td>
            </tr>
            {invoice.discount > 0 && (
              <>
                <tr>
                  <td className="py-1 text-black/60">Discount</td>
                  <td className="py-1 text-right">−{formatInr(invoice.discount)}</td>
                </tr>
                <tr>
                  <td className="py-1 text-black/60">Taxable value</td>
                  <td className="py-1 text-right">{formatInr(invoice.taxable)}</td>
                </tr>
              </>
            )}
            {invoice.taxes.map((t) =>
              invoice.tax_mode === "inter" ? (
                <tr key={t.rate}>
                  <td className="py-1 text-black/60">IGST @ {t.rate}%</td>
                  <td className="py-1 text-right">{formatInr(t.igst)}</td>
                </tr>
              ) : (
                [
                  <tr key={`c${t.rate}`}>
                    <td className="py-1 text-black/60">CGST @ {t.rate / 2}%</td>
                    <td className="py-1 text-right">{formatInr(t.cgst)}</td>
                  </tr>,
                  <tr key={`s${t.rate}`}>
                    <td className="py-1 text-black/60">SGST @ {t.rate / 2}%</td>
                    <td className="py-1 text-right">{formatInr(t.sgst)}</td>
                  </tr>,
                ]
              ),
            )}
            <tr className="border-t border-black text-sm font-bold">
              <td className="pt-2">Total</td>
              <td className="pt-2 text-right">{formatInr(invoice.total)}</td>
            </tr>
            {invoice.amount_paid > 0 && (
              <>
                <tr>
                  <td className="py-1 text-black/60">Paid</td>
                  <td className="py-1 text-right">−{formatInr(invoice.amount_paid)}</td>
                </tr>
                <tr className="font-bold">
                  <td className="py-1">Balance due</td>
                  <td className="py-1 text-right">{formatInr(invoice.balance)}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </section>

      {(business.account_number || business.upi_id) && (
        <section className="mt-8 rounded-xl border border-encode-border p-4 text-[12px]">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-black/50">Payment details</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr_auto_1fr]">
            {business.account_name && (
              <>
                <dt className="text-black/60">Account name</dt>
                <dd className="font-medium">{business.account_name}</dd>
              </>
            )}
            {business.bank_name && (
              <>
                <dt className="text-black/60">Bank</dt>
                <dd className="font-medium">{business.bank_name}</dd>
              </>
            )}
            {business.account_number && (
              <>
                <dt className="text-black/60">Account no.</dt>
                <dd className="font-medium">{business.account_number}</dd>
              </>
            )}
            {business.ifsc && (
              <>
                <dt className="text-black/60">IFSC</dt>
                <dd className="font-medium">{business.ifsc}</dd>
              </>
            )}
            {business.upi_id && (
              <>
                <dt className="text-black/60">UPI</dt>
                <dd className="font-medium">{business.upi_id}</dd>
              </>
            )}
          </dl>
        </section>
      )}

      {(invoice.notes || invoice.terms) && (
        <section className="mt-6 grid gap-6 text-[12px] sm:grid-cols-2">
          {invoice.notes && (
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-black/50">Notes</p>
              <p className="whitespace-pre-line text-black/70">{invoice.notes}</p>
            </div>
          )}
          {invoice.terms && (
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-black/50">Terms</p>
              <p className="whitespace-pre-line text-black/70">{invoice.terms}</p>
            </div>
          )}
        </section>
      )}

      <footer className="mt-10 border-t border-encode-border pt-4 text-center text-[11px] text-black/50">
        {invoice.status === "void"
          ? `This invoice was voided${invoice.void_reason ? `: ${invoice.void_reason}` : ""}.`
          : "This is a computer-generated invoice and does not require a signature."}
        {business.website && <span> · {business.website.replace(/^https?:\/\//, "")}</span>}
      </footer>
    </article>
  );
}
