import { useRef } from "react";
import { Link } from "react-router-dom";
import RingSizeTable from "./RingSizeTable";
import "./ring-size-guide.css";

export default function RingSizeGuide({
  selectedSize,
}: {
  selectedSize: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        className="ring-size-trigger"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        Chọn kích thước phù hợp
      </button>
      <dialog
        ref={dialog}
        className="ring-size-dialog"
        aria-labelledby="ring-size-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="ring-size-heading">
          <h2 id="ring-size-title">Bảng size nhẫn</h2>
          <button
            type="button"
            aria-label="Đóng bảng size nhẫn"
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </div>
        <p>
          Đo đường kính bên trong chiếc nhẫn đang đeo vừa, không tính độ dày
          thành nhẫn, rồi đối chiếu bảng dưới đây.
        </p>
        <RingSizeTable selectedSize={selectedSize} />
        <p>
          Nếu số đo nằm giữa hai size, nên chọn size lớn hơn và xác nhận lại với
          cửa hàng.
        </p>
        <Link to="/ring-sizer">Xem cách đo và tính size nhẫn →</Link>
      </dialog>
    </>
  );
}
