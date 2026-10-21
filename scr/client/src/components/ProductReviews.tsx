import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { request, token } from "../lib/api";

type ReviewData = {
  reviews: {
    _id: string;
    name: string;
    rating: number;
    comment: string;
    createdAt: string;
  }[];
  total: number;
  average: number;
  page: number;
  pages: number;
  canReview: boolean;
  hasReviewed: boolean;
};
export default function ProductReviews({ slug }: { slug: string }) {
  const [data, setData] = useState<ReviewData | null>(null);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    request(`/products/${encodeURIComponent(slug)}/reviews?page=${page}`)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug, page, revision]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setError("");
    setNotice("");
    try {
      await request(`/products/${encodeURIComponent(slug)}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating, comment }),
      });
      setData((current) =>
        current ? { ...current, canReview: false, hasReviewed: true } : null,
      );
      setComment("");
      setPage(1);
      setRevision((value) => value + 1);
      setNotice("Cảm ơn bạn! Đánh giá đã được đăng.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }
  return (
    <section className="product-reviews" aria-labelledby="reviews-title">
      <div className="reviews-heading">
        <div>
          <p className="pd-eyebrow">TRẢI NGHIỆM TỪ KHÁCH HÀNG</p>
          <h2 id="reviews-title">Đánh giá sản phẩm</h2>
        </div>
        {data && (
          <p className="reviews-summary">
            {data.total ? (
              <>
                <strong>
                  ★{" "}
                  {data.average.toLocaleString("vi-VN", {
                    maximumFractionDigits: 1,
                  })}
                  /5
                </strong>
                <span>{data.total} đánh giá</span>
              </>
            ) : (
              "Chưa có đánh giá"
            )}
          </p>
        )}
      </div>
      {notice && (
        <p role="status" className="cart-notice">
          {notice}
        </p>
      )}
      {error && (
        <div role="alert">
          <p>{error}</p>
          {!sending && (
            <button
              type="button"
              onClick={() => setRevision((value) => value + 1)}
            >
              Tải lại đánh giá
            </button>
          )}
        </div>
      )}
      {loading ? (
        <p role="status">Đang tải đánh giá...</p>
      ) : (
        data && (
          <>
            {data.canReview && token() ? (
              <form className="review-form" onSubmit={submit}>
                <h3>Chia sẻ trải nghiệm của bạn</h3>
                <p>Bạn đã mua sản phẩm này trong đơn hàng đã hoàn tất.</p>
                <fieldset disabled={sending}>
                  <legend>Số sao</legend>
                  <div className="review-stars">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <label
                        key={value}
                        className={value <= rating ? "selected" : ""}
                      >
                        <input
                          type="radio"
                          name="rating"
                          value={value}
                          checked={rating === value}
                          onChange={() => setRating(value)}
                          aria-label={`${value} sao`}
                        />
                        <span aria-hidden="true">★</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label htmlFor="review-comment">Nội dung đánh giá</label>
                <textarea
                  id="review-comment"
                  required
                  maxLength={2000}
                  rows={4}
                  value={comment}
                  disabled={sending}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Chia sẻ về thiết kế, chất liệu hoặc trải nghiệm sử dụng..."
                />
                <small>{comment.length}/2.000 ký tự</small>
                <button type="submit" disabled={sending || !comment.trim()}>
                  {sending ? "Đang gửi..." : "Gửi đánh giá"}
                </button>
              </form>
            ) : (
              <p className="review-eligibility">
                {data.hasReviewed ? (
                  "Bạn đã đánh giá sản phẩm này. Cảm ơn bạn đã chia sẻ!"
                ) : token() ? (
                  "Bạn chỉ có thể đánh giá khi đơn hàng chứa sản phẩm này đã hoàn tất."
                ) : (
                  <>
                    <Link
                      to={`/login?next=${encodeURIComponent(`/product/${slug}`)}`}
                    >
                      Đăng nhập
                    </Link>{" "}
                    để kiểm tra quyền đánh giá. Chỉ khách đã mua sản phẩm trong
                    đơn hàng hoàn tất được gửi đánh giá.
                  </>
                )}
              </p>
            )}
            <div className="review-list">
              {data.reviews.map((review) => (
                <article className="review-item" key={review._id}>
                  <div className="review-author">
                    <b>{review.name}</b>
                    <span>✓ Đã mua hàng</span>
                    <time dateTime={review.createdAt}>
                      {new Date(review.createdAt).toLocaleDateString("vi-VN")}
                    </time>
                  </div>
                  <p
                    className="review-score"
                    aria-label={`${review.rating} trên 5 sao`}
                  >
                    {"★".repeat(review.rating)}
                    {"☆".repeat(5 - review.rating)}
                  </p>
                  <p className="review-comment">{review.comment}</p>
                </article>
              ))}
            </div>
            {!data.total && (
              <p>Chưa có nhận xét từ khách hàng đã mua sản phẩm này.</p>
            )}
            {data.pages > 1 && (
              <nav className="pagination" aria-label="Phân trang đánh giá">
                <button
                  disabled={data.page <= 1}
                  onClick={() => setPage(data.page - 1)}
                >
                  Trước
                </button>
                <span>
                  {data.page} / {data.pages}
                </span>
                <button
                  disabled={data.page >= data.pages}
                  onClick={() => setPage(data.page + 1)}
                >
                  Sau
                </button>
              </nav>
            )}
          </>
        )
      )}
    </section>
  );
}
