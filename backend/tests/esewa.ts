/**
 * eSewa test helpers: callback payloads signed with the test secret exactly as
 * eSewa signs them, plus a mock of eSewa's status API.
 */
import crypto from "crypto";
import axios from "axios";

export const signEsewa = (fields: Record<string, string>): string => {
  const names = "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names";
  const payload: Record<string, string> = { ...fields, signed_field_names: names };
  const message = names
    .split(",")
    .map((n) => `${n}=${payload[n]}`)
    .join(",");
  payload.signature = crypto
    .createHmac("sha256", process.env.ESEWA_SECRET_KEY as string)
    .update(message)
    .digest("base64");
  return Buffer.from(JSON.stringify(payload)).toString("base64");
};

/** What eSewa would send back after a completed payment */
export const esewaCallback = (uuid: string, amount: number | string) =>
  signEsewa({
    transaction_code: `TXN${Math.floor(Math.random() * 1e6)}`,
    status: "COMPLETE",
    total_amount: String(amount),
    transaction_uuid: uuid,
    product_code: process.env.ESEWA_MERCHANT_CODE as string,
  });

/** eSewa status API: report whatever was asked about as COMPLETE */
export const mockEsewaStatusApi = () =>
  jest.spyOn(axios, "get").mockImplementation(async (_url, config: any) => ({
    data: { status: "COMPLETE", total_amount: config?.params?.total_amount },
  }));
