import type { RequestHandler } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/auth.js";
import { extractIntent, explain } from "../services/gemini.service.js";
import { recommend } from "../services/recommendation.service.js";
import { rebuildPreference } from "../services/preference.service.js";
import { rankDiamonds } from "../services/diamond.service.js";
import AIConversation from "../models/AIConversation.js";

const diamondWords = /kim cương|diamond|4cs|carat|clarity|cut|color/i;

const personalWords =
  /dành (riêng )?cho (tôi|tớ|mình|t)|hợp với (tôi|tớ|mình|t)|sở thích|cá nhân/i;

const money = (t: string) => {
  const m = t.match(/(\d+(?:[.,]\d+)?)\s*(?:triệu|tr)/i);
  return m ? Number(m[1].replace(",", ".")) * 1_000_000 : undefined;
};

export const chat: RequestHandler = async (req: AuthRequest, res) => {
  const started = Date.now();
  const message = String(req.body.message || "").trim();
  if (!message)
    return res.status(400).json({ message: "Vui lòng nhập nhu cầu" });
  const dbReady = mongoose.connection.readyState === 1;
  try {
    if (
      diamondWords.test(message) &&
      !/nhẫn|dây chuyền|mặt dây|vòng tay|bông tai|hoa tai|lắc|charm|bộ trang sức|ngọc trai|không.*kim cương/i.test(
        message,
      )
    ) {
      const diamonds = (
        await rankDiamonds({
          targetCarat: Number(
            message
              .match(/(\d+(?:[.,]\d+)?)\s*(?:carat|ct)/i)?.[1]
              ?.replace(",", ".") || 1,
          ),
          budgetMax: money(message),
          weights: {
            carat: 0.25,
            cut: /ưu tiên.*cut|ưu tiên.*giác cắt/i.test(message) ? 0.55 : 0.25,
            color: 0.25,
            clarity: 0.25,
          },
        })
      ).slice(0, 5);
      const top: any = diamonds[0];
      return res.json({
        mode: "diamond",
        answer: top
          ? `MIRA đã phân tích theo 4Cs. Gợi ý nổi bật: ${top.carat} carat, Cut ${top.cut}, Color ${top.color}, Clarity ${top.clarity}, mức phù hợp ${top.score}%.`
          : "Chưa có lựa chọn phù hợp.",
        diamonds,
      });
    }
    const intent = await extractIntent(message);
    let products: any[];
    if (dbReady && req.user?.id) {
      await rebuildPreference(req.user.id);
      products = await recommend(req.user.id, 5, intent);
    } else products = await recommend("demo", 5, intent);
    let answer = await explain(message, products);
    if (personalWords.test(message) && !req.user?.id)
      answer =
        "Bạn chưa đăng nhập nên MIRA đang gợi ý theo nhu cầu hiện tại và dữ liệu demo. Đăng nhập sau này sẽ giúp hệ thống học hành vi để cá nhân hóa tốt hơn. " +
        answer;
    if (dbReady && req.user?.id)
      AIConversation.create({
        user: req.user.id,
        message,
        intent,
        answer,
        recommendedProducts: products.map((p: any) => p._id),
        latencyMs: Date.now() - started,
      }).catch(() => undefined);
    return res.json({
      mode: personalWords.test(message) ? "recommendation" : "advisor",
      intent,
      answer,
      products,
      demo: !dbReady,
    });
  } catch (e: any) {
    console.error("assistant:", e);
    const intent = await extractIntent(message);
    const products = await recommend("demo", 5, intent);
    return res.json({
      mode: "advisor",
      intent,
      answer: `MIRA đã chọn ${products.length} sản phẩm demo gần nhất với nhu cầu của bạn.`,
      products,
      demo: true,
    });
  }
};
