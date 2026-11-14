import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { AuthRequest } from "../middleware/auth.js";
import {
  extractIntent,
  explain,
  mergeIntent,
} from "../services/gemini.service.js";
import { recommend } from "../services/recommendation.service.js";
import { rebuildPreference } from "../services/preference.service.js";
import { rankDiamonds, diamondCriteria } from "../services/diamond.service.js";
import AIConversation from "../models/AIConversation.js";
import AdvisorSession from "../models/AdvisorSession.js";
import { resolveWeights } from "../services/dss.service.js";
import {
  classifyAdvisorMessage,
  freshAdvisorAnswer,
} from "../services/advisor-message.js";

export const chat: RequestHandler = async (req: AuthRequest, res, next) => {
  const started = Date.now();
  const message =
    typeof req.body.message === "string" ? req.body.message.trim() : "";
  if (!message || message.length > 2000)
    return res
      .status(400)
      .json({ message: "Vui lòng nhập nhu cầu từ 1 đến 2.000 ký tự" });
  const requestedId = req.body.conversationId;
  if (
    requestedId !== undefined &&
    (typeof requestedId !== "string" || !/^[0-9a-f-]{36}$/i.test(requestedId))
  )
    return res.status(400).json({ message: "Mã hội thoại không hợp lệ" });
  try {
    let session = requestedId
      ? await AdvisorSession.findOne({
          sessionId: requestedId,
          user: req.user?.id || null,
          expiresAt: { $gt: new Date() },
        })
      : null;
    if (requestedId && !session)
      return res.status(404).json({
        message:
          "Phiên tư vấn hết hạn hoặc không thuộc tài khoản này. Hãy bắt đầu hội thoại mới",
      });
    const messageType = classifyAdvisorMessage(message);
    session ||= new AdvisorSession({
      sessionId: randomUUID(),
      user: req.user?.id || null,
      expiresAt: new Date(Date.now() + 30 * 86400000),
    });
    if (!messageType.hasRequest) {
      const answer = freshAdvisorAnswer(message);
      session.turns.push(
        { role: "user", text: message },
        { role: "assistant", text: answer },
      );
      session.expiresAt = new Date(Date.now() + 30 * 86400000);
      await session.save();
      if (req.user?.id)
        await AIConversation.create({
          user: req.user.id,
          sessionId: session.sessionId,
          message,
          intent: session.intent || {},
          answer,
          recommendedProducts: [],
          latencyMs: Date.now() - started,
        });
      return res.json({
        conversationId: session.sessionId,
        conversationReset: false,
        mode: session.mode,
        intent: session.intent || {},
        missingCriteria: [
          ...(session.mode === "diamond"
            ? !session.intent?.targetCarat
              ? ["targetCarat"]
              : []
            : !session.intent?.category
              ? ["category"]
              : []),
          ...(!session.intent?.budgetMax ? ["budgetMax"] : []),
        ],
        optionalCriteria:
          session.mode === "diamond"
            ? []
            : ["material", "style", "occasion"].filter(
                (key) => !session.intent?.[key],
              ),
        answer,
        products: [],
        diamonds: [],
      });
    }
    const previous: any = session.intent || {};
    const context = JSON.stringify({
      criteria: previous,
      turns: session.turns.slice(-8).map(({ role, text }) => ({ role, text })),
    });
    const extracted = await extractIntent(message, context);
    const diamondRequest =
      /kim cương|diamond|4cs|carat|clarity|\bcut\b|\bcolor\b/i.test(message);
    const explicitDiamondSwitch =
      /kim cương rời|chuyển.*(?:kim cương|4cs)/i.test(message);
    const isDiamond =
      !extracted.category &&
      !/không.*kim cương/i.test(message) &&
      (session.mode === "diamond" ||
        explicitDiamondSwitch ||
        (!previous.category && diamondRequest));
    const mode = isDiamond ? "diamond" : "advisor";
    const switched = mode !== session.mode;
    const intent: any = mergeIntent(switched ? {} : previous, extracted);
    const removable: Record<string, string[]> = {
      "chất liệu": ["material"],
      "phong cách": ["style"],
      "loại đá": ["stone", "excludeStone"],
      dịp: ["occasion"],
      "ngân sách": ["budgetMin", "budgetMax"],
    };
    for (const [label, keys] of Object.entries(removable)) {
      if (
        new RegExp(
          `(?:bỏ|không cần)(?: giới hạn| ràng buộc| tiêu chí)?\\s*${label}`,
          "i",
        ).test(message)
      )
        for (const key of keys) delete intent[key];
    }
    if (isDiamond)
      Object.assign(intent, diamondCriteria(message, switched ? {} : previous));
    if (req.body.weights === null) delete intent.weights;
    else if (req.body.weights !== undefined && !isDiamond)
      intent.weights = req.body.weights;
    if (!isDiamond) resolveWeights(intent);
    const missingCriteria: string[] = [];
    if (!isDiamond && !intent.category) missingCriteria.push("category");
    if (!intent.budgetMax) missingCriteria.push("budgetMax");
    if (isDiamond && !intent.targetCarat) missingCriteria.push("targetCarat");
    let products: any[] = [],
      diamonds: any[] = [],
      answer: string;
    if (missingCriteria.length) {
      const questions: Record<string, string> = {
        category:
          "Bạn muốn tìm loại trang sức nào (nhẫn, dây chuyền, bông tai…)?",
        budgetMax: "Ngân sách tối đa của bạn là bao nhiêu?",
        targetCarat: "Bạn mong muốn kim cương khoảng bao nhiêu carat?",
      };
      answer = missingCriteria.map((key) => questions[key]).join(" ");
    } else if (isDiamond) {
      diamonds = await rankDiamonds({ ...intent, limit: 5 });
      answer = diamonds.length
        ? await explain(JSON.stringify(intent), diamonds)
        : "Không có kim cương phù hợp. Bạn có thể tăng ngân sách hoặc điều chỉnh carat";
    } else {
      if (req.user?.id) await rebuildPreference(req.user.id);
      products = await recommend(req.user?.id || "", 5, intent);
      answer = await explain(JSON.stringify(intent), products);
    }
    session.mode = mode;
    session.intent = intent;
    session.turns.push(
      { role: "user", text: message },
      { role: "assistant", text: answer },
    );
    session.expiresAt = new Date(Date.now() + 30 * 86400000);
    await session.save();
    if (req.user?.id)
      await AIConversation.create({
        user: req.user.id,
        sessionId: session.sessionId,
        message,
        intent,
        answer,
        recommendedProducts: products.map((p) => p._id),
        latencyMs: Date.now() - started,
      });
    const optionalCriteria = !isDiamond
      ? ["material", "style", "occasion"].filter((key) => !intent[key])
      : [];
    res.json({
      conversationId: session.sessionId,
      conversationReset: false,
      mode,
      intent,
      missingCriteria,
      optionalCriteria,
      answer,
      products,
      diamonds,
    });
  } catch (error: any) {
    if (error.name === "VersionError")
      return res.status(409).json({
        message: "Hội thoại vừa được cập nhật. Vui lòng gửi lại tin nhắn",
      });
    next(error);
  }
};
