import { ArrowRight, Check, Gem, RefreshCw, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import Image from "../components/Image";

export type ServiceKind = "bespoke" | "maintenance" | "exchange";
const services = {
  bespoke: {
    title: "Dịch vụ chế tác riêng",
    eyebrow: "DẤU ẤN CỦA BẠN",
    icon: Gem,
    image: "/editorial/atelier.jpg",
    description:
      "Bắt đầu từ một ý tưởng, một kỷ niệm hay một món quà bạn muốn dành riêng cho ai đó",
    introduction:
      "Trao đổi với MIRA về kiểu dáng, chất liệu và ngân sách mong muốn. Chuyên viên sẽ đánh giá khả năng thực hiện và cùng bạn thống nhất phương án trước khi chế tác",
    heading: "Từ ý tưởng đến thiết kế riêng",
    steps: [
      [
        "Chia sẻ mong muốn",
        "Chuẩn bị ảnh tham khảo, câu chuyện của bạn, loại trang sức và khoảng ngân sách dự kiến",
      ],
      [
        "Tư vấn phương án",
        "Trao đổi về chất liệu, loại đá, kích cỡ và các chi tiết cá nhân hóa có thể thực hiện",
      ],
      [
        "Xác nhận trước khi chế tác",
        "Thống nhất thiết kế, báo giá, tiến độ và điều kiện điều chỉnh trước khi xác nhận thực hiện",
      ],
    ],
    prepare: [
      "Ảnh hoặc bản phác thảo ý tưởng nếu có",
      "Kích cỡ và dịp sử dụng dự kiến",
      "Ngân sách và thời điểm bạn cần nhận sản phẩm",
    ],
    note: "Khả năng chế tác, chi phí và thời gian phụ thuộc vào từng thiết kế, chất liệu và loại đá; MIRA sẽ xác nhận sau khi tư vấn",
    faqs: [
      [
        "Chưa có bản thiết kế thì bắt đầu thế nào?",
        "Bạn có thể mang ảnh tham khảo hoặc mô tả điều mình muốn. Chuyên viên sẽ cùng bạn làm rõ kiểu dáng và những chi tiết phù hợp",
      ],
      [
        "Có thể khắc tên hoặc lời nhắn không?",
        "Khả năng khắc tùy thuộc vào bề mặt, kích thước và cấu trúc món trang sức. Với mẫu có hỗ trợ sẵn, bạn có thể nhập nội dung khắc ngay tại trang sản phẩm",
      ],
      [
        "Khi nào có báo giá và lịch nhận?",
        "Sau khi đánh giá phương án, MIRA sẽ trao đổi báo giá và thời gian dự kiến để bạn xem xét trước khi xác nhận",
      ],
    ],
  },
  maintenance: {
    title: "Bảo dưỡng trang sức",
    eyebrow: "CHĂM SÓC ĐỂ ĐỒNG HÀNH LÂU HƠN",
    icon: Wrench,
    image: "/editorial/rings.jpg",
    description:
      "Kiểm tra tình trạng và chọn cách chăm sóc phù hợp cho từng món trang sức",
    introduction:
      "Khi trang sức xỉn màu, khóa khó đóng hoặc chi tiết có dấu hiệu lỏng, hãy để chuyên viên kiểm tra trước khi tiếp tục sử dụng. Mỗi chất liệu và cấu trúc cần một cách xử lý riêng",
    heading: "Quy trình tiếp nhận bảo dưỡng",
    steps: [
      [
        "Ghi nhận tình trạng",
        "Mang sản phẩm cùng thông tin mua hàng nếu có, mô tả vấn đề và những lần sửa chữa trước đây",
      ],
      [
        "Kiểm tra và tư vấn",
        "Chuyên viên xem xét bề mặt, khóa, mối nối, chấu giữ đá và đặc tính chất liệu để đề xuất cách xử lý",
      ],
      [
        "Xác nhận và bàn giao",
        "Trao đổi hạng mục, chi phí và thời gian dự kiến trước khi thực hiện; kiểm tra sản phẩm khi nhận lại",
      ],
    ],
    prepare: [
      "Sản phẩm và các chi tiết rời nếu có",
      "Mã đơn, hóa đơn hoặc thông tin mua hàng",
      "Mô tả vị trí hư hỏng và lịch sử sửa chữa",
    ],
    note: "Không tự dùng hóa chất mạnh hoặc thiết bị làm sạch khi chưa rõ chất liệu, lớp mạ và loại đá của sản phẩm",
    faqs: [
      [
        "Có thể đánh bóng hoặc chỉnh size mọi sản phẩm không?",
        "Khả năng thực hiện phụ thuộc vào cấu trúc, chất liệu, lớp mạ và chi tiết gắn đá. Chuyên viên cần kiểm tra sản phẩm trước khi xác nhận",
      ],
      [
        "Đá hoặc chấu bị lỏng thì cần làm gì?",
        "Ngừng đeo, cất riêng sản phẩm và giữ lại chi tiết rời nếu có. Liên hệ cửa hàng để được hướng dẫn tiếp nhận",
      ],
      [
        "Chi phí bảo dưỡng được tính thế nào?",
        "Chi phí phụ thuộc vào tình trạng và hạng mục xử lý. Thông tin mua hàng và điều kiện chăm sóc của sản phẩm sẽ được kiểm tra trước khi báo phí",
      ],
    ],
  },
  exchange: {
    title: "Chính sách thu đổi",
    eyebrow: "THÔNG TIN RÕ RÀNG TRƯỚC KHI QUYẾT ĐỊNH",
    icon: RefreshCw,
    image: "/editorial/bracelets.jpg",
    description:
      "Tìm hiểu cách gửi yêu cầu thu đổi và những thông tin cần chuẩn bị",
    introduction:
      "MIRA tiếp nhận yêu cầu để kiểm tra nguồn gốc, chất liệu, tình trạng sản phẩm và điều kiện đi kèm lúc mua. Phương án và giá trị thu đổi được xác nhận theo từng sản phẩm sau khi kiểm tra",
    heading: "Ba bước gửi yêu cầu thu đổi",
    steps: [
      [
        "Gửi thông tin sản phẩm",
        "Cung cấp mã đơn hoặc hóa đơn, ảnh sản phẩm và nhu cầu đổi sang thiết kế khác hoặc đề nghị thu lại",
      ],
      [
        "Kiểm tra điều kiện",
        "Chuyên viên đối chiếu thông tin mua hàng, giấy tờ đi kèm, tình trạng thực tế và chính sách áp dụng",
      ],
      [
        "Xem phương án trước khi xác nhận",
        "Bạn được trao đổi về giá trị, phần chênh lệch và các khoản phí nếu có trước khi quyết định thực hiện",
      ],
    ],
    prepare: [
      "Mã đơn, hóa đơn hoặc thông tin người mua",
      "Sản phẩm và phụ kiện, giấy kiểm định đi kèm nếu có",
      "Thông tin về việc khắc, chỉnh size hoặc sửa chữa trước đây",
    ],
    note: "Trang này hướng dẫn tiếp nhận yêu cầu. Tỷ lệ, mức phí và điều kiện cụ thể được đối chiếu với thông tin mua hàng và xác nhận trước khi thực hiện thu đổi",
    faqs: [
      [
        "Sản phẩm chế tác riêng hoặc khắc tên có thu đổi được không?",
        "Các sản phẩm cá nhân hóa cần được xem xét riêng theo thỏa thuận lúc mua và tình trạng thực tế. Hãy gửi thông tin để được kiểm tra điều kiện",
      ],
      [
        "Không còn hóa đơn giấy thì có gửi yêu cầu được không?",
        "Bạn có thể cung cấp mã đơn trong tài khoản hoặc thông tin liên quan đến giao dịch để cửa hàng hỗ trợ đối chiếu",
      ],
      [
        "Giá trị thu đổi có cố định cho mọi sản phẩm không?",
        "Giá trị phụ thuộc vào chất liệu, loại đá, tình trạng, hồ sơ mua hàng và điều kiện áp dụng. MIRA sẽ trao đổi phương án sau khi kiểm tra",
      ],
    ],
  },
};

export default function ServicePage({ kind }: { kind: ServiceKind }) {
  const service = services[kind];
  const Icon = service.icon;
  return (
    <main className="service-page">
      <nav className="service-breadcrumb" aria-label="Đường dẫn">
        <Link to="/">Trang chủ</Link>
        <span>/</span>
        <span>Dịch vụ & đặc quyền</span>
      </nav>
      <section className="service-hero">
        <div className="service-hero-copy">
          <Icon size={26} aria-hidden="true" />
          <span className="eyebrow">{service.eyebrow}</span>
          <h1>{service.title}</h1>
          <p>{service.description}</p>
          <div className="service-actions">
            <Link className="gold-btn" to={`/appointments?service=${kind}`}>
              Đặt lịch tư vấn <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link className="ui-secondary" to="/support">
              Trao đổi với MIRA
            </Link>
          </div>
        </div>
        <Image
          src={service.image}
          alt={service.title}
          className="service-hero-image"
        />
      </section>
      <section
        className="service-process"
        aria-labelledby="service-process-title"
      >
        <div className="service-section-heading">
          <span className="eyebrow">ĐỒNG HÀNH CÙNG MIRA</span>
          <h2 id="service-process-title">{service.heading}</h2>
          <p>{service.introduction}</p>
        </div>
        <div className="service-step-grid">
          {service.steps.map(([title, text], index) => (
            <article key={title}>
              <span className="service-step-number">0{index + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="service-preparation">
        <div>
          <h2>Chuẩn bị trước buổi tư vấn</h2>
          <ul>
            {service.prepare.map((item) => (
              <li key={item}>
                <Check size={17} aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <aside>
          <Icon size={24} aria-hidden="true" />
          <h3>Thông tin cần biết</h3>
          <p>{service.note}</p>
          {kind === "maintenance" && (
            <Link to="/jewelry-care">
              Xem cẩm nang bảo quản theo chất liệu →
            </Link>
          )}
        </aside>
      </section>
      <section className="service-faq" aria-labelledby="service-faq-title">
        <h2 id="service-faq-title">Câu hỏi thường gặp</h2>
        {service.faqs.map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </section>
      <section className="service-bottom-cta">
        <div>
          <h2>Trao đổi về món trang sức của bạn</h2>
          <p>
            Chọn thời gian phù hợp hoặc gửi câu hỏi để MIRA hỗ trợ chuẩn bị buổi
            tư vấn
          </p>
        </div>
        <Link className="gold-btn" to={`/appointments?service=${kind}`}>
          Chọn lịch tại salon <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}
