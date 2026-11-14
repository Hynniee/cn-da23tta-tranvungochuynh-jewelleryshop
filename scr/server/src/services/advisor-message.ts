function normalize(message: string) {
  return message
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const greeting =
  /^(?:good morning|good afternoon|good evening|xin chao|chao buoi sang|chao buoi toi|hello+|hi+|hey+|helo+|chao|alo)(?:\s+|$)/;
const restart =
  /^(?:bat dau lai(?: tu dau)?|bat dau (?:hoi thoai|tu van) moi|hoi thoai moi|tu van moi|lam lai tu dau|reset|start over|new chat|tu van lai tu dau|doi chu de|quen (?:cac |nhung )?(?:tieu chi|thong tin|nhu cau)(?: cu| truoc do| truoc)?)(?:\s+|$)/;

function isShoppingMessage(text: string) {
  return (
    /\b(?:trang suc|nhan(?! vien| tin)|day chuyen|mat day|bong tai|hoa tai|vong tay|lac tay|lac chan|charm|kim cuong|diamond|jewelry|jewellery|ring|necklace|earrings?|bracelet|bac|vang|bach kim|platinum|ngoc trai|ruby|sapphire|emerald|zircon|da mau|loai da|dinh da|khong da|tron|thach anh|chat lieu|phong cach|toi gian|don gian|co dien|hien dai|cau hon|sinh nhat|ky niem|qua tang|mua qua|tim qua|qua cho|tang qua|hang ngay|ngan sach|budget|carat|4cs|clarity|cut|color|giac cat|tinh khiet|trong so|uu tien|tieu chi|danh gia|re hon|dat hon|cheaper|mau khac|loai khac|cai khac|mau nay|mau do|mau thu|mau dau|mau cuoi|mau so|chi tiet|cai nay|cai do|cai thu|san pham|lua chon|so sanh|them mau|giam|tang len|giu nguyen|bo gioi han)\b/.test(
      text,
    ) ||
    /\d+\s*(?:trieu|nghin|ngan|k|tr|m)\b/.test(text) ||
    /\b(?:duoi|tren|tu|toi da|khoang|tam)\s+\d+/.test(text) ||
    /^\d+(?:\s*\d+)*(?:\s*(?:k|tr|m|ct))?$/.test(text) ||
    /\b(?:vvs[12]|vs[12]|si[12]|excellent)\b/.test(text) ||
    /^(?:co|khong|dung roi|yes|no)$/.test(text)
  );
}

export function classifyAdvisorMessage(message: string): {
  kind: "continue" | "restart" | "unrelated";
  hasRequest: boolean;
} {
  let text = normalize(message);
  let startsFresh = false;
  // Consume repeated salutations, optional names and explicit restart commands.
  for (let count = 0; count < 5; count++) {
    const prefix = text.match(greeting) || text.match(restart);
    if (!prefix) break;
    startsFresh = true;
    text = text
      .slice(prefix[0].length)
      .replace(
        /^(?:(?:mira(?: ai)?|shop|ban|em|chi|anh)(?: oi)?|oi)(?:\s+|$)/,
        "",
      )
      .trim();
  }
  const hasRequest = isShoppingMessage(text);
  return {
    kind: startsFresh ? "restart" : hasRequest ? "continue" : "unrelated",
    hasRequest,
  };
}

export function freshAdvisorAnswer(message: string) {
  const text = normalize(message);
  if (/\b(?:cam on|thank you|thanks|thank u)\b/.test(text))
    return "Rất vui được hỗ trợ bạn! Bạn có thể hỏi thêm hoặc điều chỉnh nhu cầu ngay trong cuộc trò chuyện này.";
  if (/\b(?:ban la ai|mira la ai|who are you)\b/.test(text))
    return "Mình là MIRA AI, trợ lý tư vấn trang sức của MIRA. Bạn đang tìm loại trang sức nào và ngân sách khoảng bao nhiêu?";
  if (/\b(?:tam biet|bye|goodbye)\b/.test(text))
    return "Tạm biệt bạn! Khi quay lại, bạn có thể tiếp tục cuộc trò chuyện này nhé.";
  if (restart.test(text))
    return "Để bắt đầu lại với tiêu chí mới, bạn hãy bấm nút Hội thoại mới. Mình vẫn giữ nội dung cuộc trò chuyện hiện tại cho đến khi bạn bấm nút đó.";
  return "Xin chào! Mình là MIRA AI. Bạn muốn mình hỗ trợ thêm điều gì về trang sức?";
}
