export function paymentQrUrl(amount: number, content: string) {
  if (!Number.isSafeInteger(amount) || amount <= 0)
    throw new Error("Số tiền chuyển khoản không hợp lệ");
  const template = process.env.QR_TEMPLATE?.trim();
  if (template)
    return template
      .replaceAll("{amount}", String(amount))
      .replaceAll("{content}", encodeURIComponent(content));
  const bank = process.env.BANK_BIN?.trim();
  const account = process.env.BANK_ACCOUNT_NO?.trim();
  if (!bank || !account) throw new Error("Chưa cấu hình ngân hàng nhận tiền");
  const url = new URL(
    `https://img.vietqr.io/image/${encodeURIComponent(bank)}-${encodeURIComponent(account)}-compact2.png`,
  );
  url.searchParams.set("amount", String(amount));
  url.searchParams.set("addInfo", content);
  const name = process.env.BANK_ACCOUNT_NAME?.trim();
  if (name) url.searchParams.set("accountName", name);
  return url.toString();
}
