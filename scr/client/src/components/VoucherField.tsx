import usePromotionQuote from "../controllers/usePromotionQuote";
export default function VoucherField({
  promotion,
}: {
  promotion: ReturnType<typeof usePromotionQuote>;
}) {
  return (
    <section className="voucher-field" aria-label="Ưu đãi đơn hàng">
      <label htmlFor="voucher-code">Mã ưu đãi</label>
      <div className="voucher-input">
        <input
          id="voucher-code"
          maxLength={32}
          value={promotion.code}
          onChange={(e) => promotion.setCode(e.target.value.toUpperCase())}
          placeholder="Nhập mã voucher"
          disabled={promotion.loading}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              promotion.apply();
            }
          }}
        />
        <button
          type="button"
          disabled={promotion.loading}
          onClick={() => promotion.apply()}
        >
          {promotion.loading ? "Đang tính..." : "Áp dụng"}
        </button>
      </div>
      {promotion.quote?.voucher && (
        <p className="voucher-success" role="status">
          Đã áp dụng {promotion.quote.voucher.code}: −
          {promotion.quote.discountTotal.toLocaleString("vi-VN")}₫
        </p>
      )}
      {promotion.error && (
        <p className="voucher-error" role="alert">
          {promotion.error}
        </p>
      )}
      {promotion.code && (
        <button
          type="button"
          className="voucher-remove"
          disabled={promotion.loading}
          onClick={promotion.remove}
        >
          Bỏ mã ưu đãi
        </button>
      )}
      <small>Ưu đãi được kiểm tra lại khi đặt hàng.</small>
    </section>
  );
}
