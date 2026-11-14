import { BookOpen, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

const guides = [
  {
    title: "Bạc 925",
    intro: "Chăm sóc bề mặt bạc và hạn chế xỉn màu.",
    steps: [
      "Lau nhẹ bằng khăn mềm sạch sau khi đeo. Với bạc xỉn màu, chọn sản phẩm làm sạch chuyên dụng phù hợp với món trang sức và làm theo hướng dẫn của nhà sản xuất.",
      "Cất riêng trong túi chống xỉn hoặc hộp có ngăn lót mềm. Tránh tiếp xúc với nước hồ bơi và hóa chất gia dụng.",
      "Nếu có lớp mạ, ngọc trai hoặc đá đính kèm, hỏi chuyên viên trước khi dùng chất đánh bóng hay dung dịch làm sạch bạc.",
    ],
  },
  {
    title: "Trang sức vàng",
    intro: "Giữ bề mặt sạch và bảo vệ các chi tiết nhỏ.",
    steps: [
      "Dùng khăn mềm không xơ để lau bụi và dấu tay. Tránh chà xát mạnh hoặc dùng chất tẩy có tính mài mòn.",
      "Tháo trang sức khi làm việc với chất tẩy rửa, đặc biệt là thuốc tẩy chứa clo. Cất từng món riêng để tránh cọ xát.",
      "Với thiết kế gắn đá hoặc ngọc trai, chọn cách vệ sinh theo phần chất liệu nhạy cảm nhất; không áp dụng một cách làm sạch cho mọi mẫu.",
    ],
  },
  {
    title: "Ngọc trai",
    intro: "Ưu tiên thao tác nhẹ và tránh hóa chất.",
    steps: [
      "Lau từng viên bằng khăn thật mềm, sạch sau mỗi lần đeo. Không dùng máy siêu âm hoặc hơi nước để làm sạch ngọc trai.",
      "Đeo sau khi dùng mỹ phẩm, nước hoa và keo xịt tóc để hạn chế tiếp xúc trực tiếp với hóa chất.",
      "Để chuỗi ngọc khô hoàn toàn trước khi cất. Giữ riêng khỏi các món cứng có thể gây trầy và tránh nơi quá nóng hoặc quá khô.",
    ],
  },
  {
    title: "Trang sức đính đá quý",
    intro: "Mỗi loại đá và phương pháp xử lý cần cách chăm sóc riêng.",
    steps: [
      "Lau nhẹ bằng khăn mềm sạch. Kiểm tra thông tin loại đá và cách xử lý trên hồ sơ sản phẩm trước khi ngâm hoặc dùng dung dịch vệ sinh.",
      "Tránh va đập, nhiệt cao và thay đổi nhiệt độ đột ngột. Cất riêng từng món để các viên đá không cọ vào nhau.",
      "Không tự dùng máy siêu âm khi chưa xác nhận loại đá phù hợp. Nếu đá lung lay hoặc chấu bị móc vào vải, ngừng đeo và mang đến thợ kim hoàn kiểm tra.",
    ],
  },
];

export default function JewelryCare() {
  return (
    <main className="personal-tool-page jewelry-care-page">
      <Link className="tool-back" to="/#personal-tools">
        ← Tiện ích & dịch vụ
      </Link>
      <div className="personal-tool-heading">
        <BookOpen size={30} />
        <span>CHĂM SÓC TRANG SỨC</span>
        <h1>Cẩm nang bảo quản trang sức</h1>
        <p>
          Một chút chăm sóc mỗi ngày để món trang sức luôn sẵn sàng đồng hành
          cùng bạn. Mở từng mục để xem hướng dẫn theo chất liệu.
        </p>
      </div>
      <div className="care-guide-list">
        {guides.map((guide, index) => (
          <details key={guide.title} open={index === 0}>
            <summary>
              <span>{guide.title}</span>
              <small>{guide.intro}</small>
            </summary>
            <ul>
              {guide.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </details>
        ))}
      </div>
      <aside className="care-guide-note">
        <ShieldCheck size={22} />
        <div>
          <h2>Kiểm tra trước khi vệ sinh</h2>
          <p>
            Với trang sức kết hợp nhiều chất liệu, có lớp mạ hoặc đá đã qua xử
            lý, ưu tiên hướng dẫn đi kèm sản phẩm. Nếu chưa rõ chất liệu, hãy để
            chuyên viên kiểm tra trước khi dùng hóa chất hoặc thiết bị làm sạch.
          </p>
        </div>
      </aside>
      <p className="care-guide-sources">
        Tham khảo:{" "}
        <a
          href="https://www.gia.edu/articles/gia-news-research-tips-caring-jewelry"
          target="_blank"
          rel="noreferrer"
        >
          GIA · Chăm sóc trang sức
        </a>
        {" · "}
        <a
          href="https://www.gia.edu/pearl-care-cleaning"
          target="_blank"
          rel="noreferrer"
        >
          GIA · Ngọc trai
        </a>
        {" · "}
        <a
          href="https://www.tiffany.com/faq/care-repair-faq/how-do-i-care-for-my-jewelry/"
          target="_blank"
          rel="noreferrer"
        >
          Tiffany & Co. · Hướng dẫn bảo quản
        </a>
      </p>
    </main>
  );
}
