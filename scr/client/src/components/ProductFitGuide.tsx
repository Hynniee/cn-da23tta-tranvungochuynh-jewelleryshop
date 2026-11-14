import { useId, useRef } from "react";
import { Link } from "react-router-dom";
import RingSizeTable from "./RingSizeTable";
import "./ring-size-guide.css";

export default function ProductFitGuide({
  name,
  material,
  stone,
  category,
  sizes,
  selectedSize,
}: {
  name: string;
  material: string;
  stone?: string;
  category?: string;
  sizes: string[];
  selectedSize: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const isRing = category === "Nhẫn" || category === "Nhẫn cưới";
  return (
    <>
      <button
        type="button"
        className="pd-salon"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        Hướng dẫn chất liệu & kích cỡ
      </button>
      <dialog
        ref={dialog}
        className="ring-size-dialog product-fit-dialog"
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="ring-size-heading">
          <h2 id={titleId}>Chất liệu & kích cỡ</h2>
          <button
            type="button"
            aria-label="Đóng hướng dẫn chất liệu và kích cỡ"
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </div>
        <p>{name}</p>
        <section>
          <h3>Thông tin chất liệu</h3>
          <dl className="product-specs">
            <div>
              <dt>Chất liệu</dt>
              <dd>{material}</dd>
            </div>
            <div>
              <dt>Đá / điểm nhấn</dt>
              <dd>{stone || "Không đính đá"}</dd>
            </div>
          </dl>
          <Link to="/jewelry-care">Xem cách bảo quản theo chất liệu →</Link>
        </section>
        <section>
          <h3>Chọn kích cỡ</h3>
          {isRing ? (
            <>
              <p>
                Đo đường kính bên trong chiếc nhẫn đang đeo vừa, không tính độ
                dày thành nhẫn, rồi đối chiếu bảng size theo ni Việt Nam.
              </p>
              <p>
                Size có thể chọn cho sản phẩm này: {sizes.join(", ")}.
                {selectedSize
                  ? ` Bạn đang chọn size ${selectedSize}`
                  : " Bạn chưa chọn size"}
              </p>
              <RingSizeTable selectedSize={selectedSize} />
              <Link to="/ring-sizer">Xem hướng dẫn đo và tính size nhẫn →</Link>
            </>
          ) : sizes.length ? (
            <>
              <p>
                Dùng thước dây đo vị trí muốn đeo. Với dây chuyền, đo theo độ
                dài dây mong muốn; với vòng hoặc lắc, chừa khoảng vừa đủ để đeo
                thoải mái.
              </p>
              <p>
                Kích cỡ có thể chọn: {sizes.join(" · ")}.
                {selectedSize
                  ? ` Bạn đang chọn ${selectedSize}`
                  : " Bạn chưa chọn kích cỡ"}
              </p>
            </>
          ) : (
            <p>
              Sản phẩm theo kích thước thiết kế, không cần chọn size. Xem phần
              thông tin sản phẩm để biết thêm chi tiết
            </p>
          )}
        </section>
        <p>Cần xác nhận chất liệu hoặc kích cỡ trước khi mua?</p>
        <Link to="/support">Nhắn nhân viên hỗ trợ →</Link>
      </dialog>
    </>
  );
}
