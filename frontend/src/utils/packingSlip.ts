/**
 * Printable packing slip for an order (admin). Opens a minimal page in a new
 * window and starts printing, so the slip doesn't inherit the admin layout.
 */
import { formatPrice, formatDateTime, PROVINCES, populated } from "./helpers";
import { STORE_NAME, CONTACT } from "../config/store";
import type { IOrder } from "../types";

const escapeHtml = (value: unknown): string =>
  String(value ?? "").replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] as string,
  );

export const buildPackingSlipHtml = (order: IOrder): string => {
  const address = order.shippingAddress;
  const province = PROVINCES.find((p) => p.id === address?.province)?.name;
  const customer = populated(order.user);
  const method = (order.payment?.method || order.paymentMethod || "").toLowerCase();
  const paid = (order.payment?.status || order.paymentStatus) === "paid";
  const total = order.pricing?.total ?? order.total ?? 0;
  const collect = method === "cod" && !paid;

  const rows = (order.items || [])
    .map((item) => {
      const variant = item.variant || item.variantDetails;
      const options = variant ? [variant.size, variant.color].filter(Boolean).join(" / ") : "";
      return `<tr>
        <td>${escapeHtml(item.name)}${options ? `<div class="muted">${escapeHtml(options)}</div>` : ""}</td>
        <td class="num">${escapeHtml(item.quantity)}</td>
        <td class="num">${escapeHtml(formatPrice(item.price))}</td>
        <td class="num">${escapeHtml(formatPrice(item.price * item.quantity))}</td>
      </tr>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Packing slip #${escapeHtml(order.orderNumber)}</title>
<style>
  * { box-sizing: border-box; }
  body { font: 14px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; color: #222; margin: 24px; }
  h1 { font-size: 20px; margin: 0; }
  .head { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 16px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .box { border: 1px solid #bbb; border-radius: 6px; padding: 12px; }
  .label { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #666; margin-bottom: 4px; }
  .big { font-size: 16px; font-weight: 600; }
  .muted { color: #666; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #ddd; vertical-align: top; }
  th { font-size: 12px; color: #555; }
  .num { text-align: right; white-space: nowrap; }
  .collect { border: 2px solid #222; padding: 12px; font-size: 18px; font-weight: 700; text-align: center; }
  @media print { body { margin: 0; } }
</style></head>
<body>
  <div class="head">
    <div><h1>${escapeHtml(STORE_NAME)}</h1><div class="muted">${escapeHtml(CONTACT.phoneDisplay)} · ${escapeHtml(CONTACT.email)}</div></div>
    <div style="text-align:right"><div class="big">Order #${escapeHtml(order.orderNumber)}</div><div class="muted">${escapeHtml(formatDateTime(order.createdAt))}</div></div>
  </div>
  <div class="grid">
    <div class="box">
      <div class="label">Ship to</div>
      <div class="big">${escapeHtml(address?.name || address?.fullName || customer?.name)}</div>
      <div>${escapeHtml(address?.phone)}</div>
      <div>${escapeHtml([address?.street, address?.city].filter(Boolean).join(", "))}</div>
      <div>${escapeHtml([address?.district, province].filter(Boolean).join(", "))}</div>
    </div>
    <div class="box">
      <div class="label">Payment</div>
      <div class="big">${escapeHtml(method === "cod" ? "Cash on delivery" : method === "esewa" ? "eSewa" : method || "—")}</div>
      <div>${paid ? "Paid" : "Not paid yet"}</div>
      ${order.customerNotes ? `<div class="label" style="margin-top:8px">Customer note</div><div>${escapeHtml(order.customerNotes)}</div>` : ""}
    </div>
  </div>
  <table>
    <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Total</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr><td colspan="3" class="num">Subtotal</td><td class="num">${escapeHtml(formatPrice(order.pricing?.subtotal ?? order.subtotal ?? 0))}</td></tr>
      <tr><td colspan="3" class="num">Shipping</td><td class="num">${escapeHtml(formatPrice(order.pricing?.shippingCost ?? order.shippingCost ?? 0))}</td></tr>
      <tr><td colspan="3" class="num"><strong>Total</strong></td><td class="num"><strong>${escapeHtml(formatPrice(total))}</strong></td></tr>
    </tfoot>
  </table>
  ${collect ? `<div class="collect">Collect ${escapeHtml(formatPrice(total))} in cash</div>` : ""}
</body></html>`;
};

/** Returns false when the browser blocked the print window */
export const printPackingSlip = (order: IOrder): boolean => {
  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) return false;
  win.document.open();
  win.document.write(buildPackingSlipHtml(order));
  win.document.close();
  win.focus();
  // Let the new document lay out before opening the print dialog
  win.setTimeout(() => win.print(), 250);
  return true;
};
