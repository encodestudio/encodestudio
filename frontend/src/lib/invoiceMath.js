// Invoice arithmetic shared by the React editor (live totals) and the Worker
// API (stored totals), so both always agree. Pure functions, no imports.

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Totals for a set of line items.
 * - `discount` (₹) is taken off before tax and spread across lines in proportion.
 * - `taxMode`: "intra" splits GST into CGST + SGST, "inter" charges IGST, "none" charges no tax.
 * Returns the lines with their amount, the tax broken down per rate, and the grand total.
 */
export function computeInvoice(items = [], discount = 0, taxMode = "intra") {
  const lines = items.map((item) => ({
    ...item,
    amount: round2((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)),
  }));
  const subtotal = round2(lines.reduce((sum, l) => sum + l.amount, 0));
  const discountApplied = Math.min(Math.max(round2(discount || 0), 0), subtotal);
  const taxable = round2(subtotal - discountApplied);
  const factor = subtotal ? taxable / subtotal : 0;

  const byRate = new Map();
  if (taxMode !== "none") {
    for (const line of lines) {
      const rate = Number(line.tax_rate) || 0;
      if (rate > 0) byRate.set(rate, (byRate.get(rate) || 0) + line.amount * factor);
    }
  }
  const taxes = [...byRate.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([rate, base]) => {
      const taxableAtRate = round2(base);
      if (taxMode === "inter") {
        const igst = round2((taxableAtRate * rate) / 100);
        return { rate, taxable: taxableAtRate, cgst: 0, sgst: 0, igst, total: igst };
      }
      const half = round2((taxableAtRate * rate) / 200);
      return { rate, taxable: taxableAtRate, cgst: half, sgst: half, igst: 0, total: round2(half * 2) };
    });
  const taxTotal = round2(taxes.reduce((sum, t) => sum + t.total, 0));

  return {
    lines,
    subtotal,
    discount: discountApplied,
    taxable,
    taxes,
    tax_total: taxTotal,
    total: round2(taxable + taxTotal),
  };
}

/** Indian financial year (April–March) for a YYYY-MM-DD date, e.g. "2026-27". */
export function financialYear(isoDate) {
  const [year, month] = String(isoDate).split("-").map(Number);
  const start = month >= 4 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** Today's date in India (YYYY-MM-DD), whatever the server's or browser's timezone. */
export function todayInIndia(now = Date.now()) {
  return new Date(now + 330 * 60_000).toISOString().slice(0, 10);
}

/** Adds days to a YYYY-MM-DD date. */
export function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
}

/** draft | void | paid | overdue | partially_paid | issued */
export function invoiceDisplayStatus(invoice, today = todayInIndia()) {
  if (invoice.status === "draft" || invoice.status === "void") return invoice.status;
  const balance = round2((invoice.total || 0) - (invoice.amount_paid || 0));
  if (balance <= 0) return "paid";
  if (invoice.due_date && invoice.due_date < today) return "overdue";
  if (invoice.amount_paid > 0) return "partially_paid";
  return "issued";
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
  "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowHundred(n) {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`;
}

function belowThousand(n) {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return [hundreds ? `${ONES[hundreds]} Hundred` : "", rest ? belowHundred(rest) : ""].filter(Boolean).join(" ");
}

/** 125000.5 → "Rupees One Lakh Twenty Five Thousand and Fifty Paise Only" (Indian numbering). */
export function amountInWords(amount) {
  const value = round2(Math.abs(Number(amount) || 0));
  let rupees = Math.floor(value);
  const paise = Math.round((value - rupees) * 100);
  const parts = [];
  for (const [size, name] of [[10_000_000, "Crore"], [100_000, "Lakh"], [1000, "Thousand"]]) {
    const chunk = Math.floor(rupees / size);
    if (chunk) parts.push(`${size === 10_000_000 && chunk >= 100 ? amountInWords(chunk).replace(/^Rupees | Only$/g, "") : belowThousand(chunk)} ${name}`);
    rupees %= size;
  }
  if (rupees) parts.push(belowThousand(rupees));
  const words = parts.join(" ") || "Zero";
  return `Rupees ${words}${paise ? ` and ${belowHundred(paise)} Paise` : ""} Only`;
}
