/**
 * Start (or retry) an eSewa/Khalti payment for an existing order.
 * The browser leaves the site: eSewa needs a POSTed form, Khalti a redirect.
 */
import { paymentsAPI } from "../api/orders";
import type { IOrder, PaymentMethod } from "../types";

const submitPaymentForm = (url: string, fields: Record<string, string | number>) => {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = url;

  Object.entries(fields).forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = String(value);
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
};

export const isOnlinePayment = (method?: string): method is "esewa" | "khalti" =>
  method === "esewa" || method === "khalti";

/**
 * "redirecting": the browser is leaving for the gateway. "already_paid": a retry
 * found that an earlier attempt went through — send the shopper to the order.
 */
export const startOnlinePayment = async (
  orderId: string,
  gateway: PaymentMethod,
): Promise<"redirecting" | "already_paid"> => {
  const response = await paymentsAPI.initiatePayment(orderId, gateway);
  const payment = response.data;

  if (payment?.alreadyPaid) return "already_paid";
  if (gateway === "esewa" && payment?.formData && payment.redirectUrl) {
    submitPaymentForm(payment.redirectUrl, payment.formData);
    return "redirecting";
  }
  if (gateway === "khalti" && payment?.redirectUrl) {
    window.location.href = payment.redirectUrl;
    return "redirecting";
  }
  throw new Error(`Could not start ${gateway} payment`);
};

/** An eSewa/Khalti order that is still pending and unpaid can be paid (again) */
export const canPayOnline = (order: IOrder | null | undefined): boolean => {
  if (!order) return false;
  const method = order.payment?.method ?? order.paymentMethod;
  const paymentStatus = order.payment?.status ?? order.paymentStatus;
  const status = order.orderStatus ?? order.status;
  return isOnlinePayment(method) && paymentStatus !== "paid" && status === "pending";
};
