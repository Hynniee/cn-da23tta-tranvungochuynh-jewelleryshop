import { randomBytes } from "node:crypto";
const configured = process.env.JWT_SECRET;
if (
  process.env.NODE_ENV === "production" &&
  (!configured || configured.length < 32 || configured.startsWith("change_"))
) {
  throw new Error(
    "JWT_SECRET phải được cấu hình tối thiểu 32 ký tự trong production",
  );
}
export const jwtSecret =
  configured && !configured.startsWith("change_")
    ? configured
    : randomBytes(48).toString("hex");

export const bankTransferAvailable = () =>
  Boolean(
    process.env.BANK_NAME?.trim() &&
    process.env.BANK_ACCOUNT_NO?.trim() &&
    process.env.BANK_ACCOUNT_NAME?.trim(),
  );
