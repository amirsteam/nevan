/**
 * Order rules the admin screens share (they mirror the API's checks in
 * backend/services/orderService.ts).
 */
import type { IOrder, OrderStatus, PaymentStatus } from "../types";

export const orderStatusOf = (order: IOrder): OrderStatus | undefined => order.orderStatus || order.status;

export const paymentStatusOf = (order: IOrder): PaymentStatus | undefined => order.paymentStatus || order.payment?.status;

const paymentMethodOf = (order: IOrder) => order.paymentMethod || order.payment?.method;

/** An online order still waiting for its payment: it confirms itself once paid, never by hand */
export const isAwaitingOnlinePayment = (order: IOrder): boolean =>
  orderStatusOf(order) === "pending" && paymentMethodOf(order) !== "cod" && paymentStatusOf(order) !== "paid";

/** Money to give back: paid then cancelled, or paid twice */
export const isRefundOwed = (order: IOrder): boolean =>
  (orderStatusOf(order) === "cancelled" && paymentStatusOf(order) === "paid") || Boolean(order.payment?.refundRequired);

/** COD cash not yet marked collected */
export const isCashToCollect = (order: IOrder): boolean =>
  paymentMethodOf(order) === "cod" && paymentStatusOf(order) !== "paid" && orderStatusOf(order) !== "cancelled";

/** "98XXXXXXXX" / "+977 98…" -> "97798XXXXXXXX" for wa.me links */
export const whatsappNumber = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `977${digits}` : digits;
};
