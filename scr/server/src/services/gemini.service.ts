export type Intent = {
  category?: string;
  material?: string;
  stone?: string;
  excludeStone?: string;
  style?: string;
  occasion?: string;
  budgetMin?: number;
  budgetMax?: number;
};
const fallback = (message: string): Intent => {
  const m = message.toLowerCase();
  const nums = [
    ...m.matchAll(/(\d+(?:[.,]\d+)?)\s*(triệu|tr\b|m\b|nghìn|ngàn|k\b)/g),
  ].map(
    (x) =>
      Number(x[1].replace(",", ".")) *
      (/nghìn|ngàn|k/.test(x[2]) ? 1000 : 1000000),
  );
  const lowerOnly =
    nums.length === 1 && /(?:trên|từ)\s*\d/i.test(m) && !/dưới|tối đa/.test(m);
  const withoutDiamond = /không(?:\s+\S+){0,2}\s+kim cương/.test(m);
  return {
    category: m.includes("bộ trang sức")
      ? "Bộ trang sức"
      : m.includes("lắc chân")
        ? "Lắc chân"
        : m.includes("charm")
          ? "Charm"
          : m.includes("nhẫn")
            ? "Nhẫn"
            : m.includes("dây chuyền") || m.includes("mặt dây")
              ? "Dây chuyền"
              : m.includes("vòng tay") || m.includes("lắc tay")
                ? "Vòng tay"
                : m.includes("bông tai") || m.includes("hoa tai")
                  ? "Bông tai"
                  : undefined,
    material: m.includes("bạc")
      ? "Bạc 925"
      : m.includes("platinum") || m.includes("bạch kim")
        ? "Platinum 950"
        : m.includes("vàng trắng")
          ? /14\s*k/.test(m)
            ? "Vàng Trắng 14K"
            : "Vàng Trắng 18K"
          : m.includes("vàng hồng")
            ? "Vàng Hồng 18K"
            : /vàng.*14\s*k/.test(m)
              ? "Vàng 14K"
              : /vàng.*18\s*k/.test(m)
                ? "Vàng Vàng 18K"
                : undefined,
    stone: m.includes("ngọc trai")
      ? "Ngọc trai"
      : m.includes("ruby") || m.includes("hồng ngọc")
        ? "Ruby"
        : m.includes("sapphire")
          ? "Sapphire"
          : m.includes("emerald") || m.includes("ngọc lục bảo")
            ? "Emerald"
            : m.includes("thạch anh tím")
              ? "Thạch anh tím"
              : m.includes("zircon")
                ? "Zircon"
                : /không đính đá|không đá|trơn/.test(m)
                  ? "Không đính đá"
                  : !withoutDiamond && m.includes("kim cương")
                    ? "Kim cương"
                    : undefined,
    excludeStone: withoutDiamond ? "Kim cương" : undefined,
    style: /tối giản|đơn giản/.test(m) ? "Tối giản" : undefined,
    occasion: m.includes("cầu hôn")
      ? "Cầu hôn"
      : m.includes("sinh nhật")
        ? "Sinh nhật"
        : undefined,
    budgetMin:
      nums.length > 1 ? Math.min(...nums) : lowerOnly ? nums[0] : undefined,
    budgetMax: lowerOnly
      ? undefined
      : nums.length
        ? Math.max(...nums)
        : undefined,
  };
};
export async function extractIntent(message: string): Promise<Intent> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return fallback(message);
  try {
    const prompt = `Trích xuất nhu cầu mua trang sức thành JSON thuần với các khóa category, material, stone, excludeStone, style, occasion, budgetMin, budgetMax. category chỉ Nhẫn/Dây chuyền/Vòng tay/Bông tai/Lắc chân/Charm/Bộ trang sức. stone chỉ Kim cương/Ngọc trai/Ruby/Sapphire/Emerald/Thạch anh tím/Zircon/Không đính đá. Chất liệu bạc dùng Bạc 925. Tiền là VND. Không markdown. Nội dung: ${message}`;
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || "gemini-2.5-flash"}:generateContent?key=${key}`,
      {
        signal: AbortSignal.timeout(12000),
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      },
    );
    if (!r.ok) throw new Error("Gemini error");
    const j: any = await r.json();
    const extracted = JSON.parse(
      j.candidates?.[0]?.content?.parts?.[0]?.text || "{}",
    );
    return {
      ...extracted,
      ...Object.fromEntries(
        Object.entries(fallback(message)).filter(
          ([, value]) => value !== undefined,
        ),
      ),
    };
  } catch {
    return fallback(message);
  }
}
export async function explain(message: string, products: any[]) {
  if (!products.length)
    return "Chưa có sản phẩm khớp nhu cầu hiện tại. Bạn có thể tăng ngân sách hoặc thử chất liệu, loại đá khác.";
  const key = process.env.GEMINI_API_KEY;
  if (!key)
    return `MIRA đã phân tích nhu cầu “${message}” và xếp hạng ${products.length} sản phẩm theo ngân sách, danh mục, chất liệu, phong cách và sở thích của bạn.`;
  try {
    const prompt = `Bạn là tư vấn viên MIRA. Chỉ giải thích dựa trên danh sách sản phẩm thật sau, không bịa sản phẩm. Nhu cầu: ${message}. Kết quả: ${JSON.stringify(products.map((p) => ({ name: p.name, price: p.price, score: p.score, material: p.material, style: p.style })))}. Trả lời tiếng Việt ngắn gọn.`;
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || "gemini-2.5-flash"}:generateContent?key=${key}`,
      {
        signal: AbortSignal.timeout(12000),
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    );
    const j: any = await r.json();
    return (
      j.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Đã tìm được các lựa chọn phù hợp."
    );
  } catch {
    return "Đã tìm được các lựa chọn phù hợp dựa trên dữ liệu sản phẩm của MIRA.";
  }
}
