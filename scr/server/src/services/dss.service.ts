export const criterionLabels = {
  category: "Loại trang sức",
  material: "Chất liệu",
  price: "Ngân sách",
  style: "Phong cách",
  occasion: "Dịp sử dụng",
  rating: "Đánh giá",
};
export type Criterion = keyof typeof criterionLabels;
export type Weights = Record<Criterion, number>;
export const clamp = (value: number) => Math.max(0, Math.min(1, value));
export function resolveWeights(criteria: any = {}): Weights {
  const weights: Weights = {
    category: 25,
    material: 20,
    price: 20,
    style: 15,
    occasion: 15,
    rating: 5,
  };
  if (criteria.budgetMax) weights.price += 10;
  if (criteria.occasion) weights.occasion += 15;
  if (criteria.style) weights.style += 10;
  for (const key of criteria.priorities || []) {
    if (Object.hasOwn(weights, key)) weights[key as Criterion] *= 2;
  }
  if (criteria.weights !== undefined) {
    if (
      !criteria.weights ||
      typeof criteria.weights !== "object" ||
      Array.isArray(criteria.weights)
    )
      throw Object.assign(new Error("Trọng số không hợp lệ"), { status: 400 });
    for (const key of Object.keys(weights) as Criterion[]) {
      const value = criteria.weights[key] ?? 0;
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
        throw Object.assign(new Error("Trọng số phải là số không âm"), {
          status: 400,
        });
      weights[key] = value;
    }
  }
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (!Number.isFinite(total) || total <= 0)
    throw Object.assign(new Error("Tổng trọng số phải hữu hạn và lớn hơn 0"), {
      status: 400,
    });
  return Object.fromEntries(
    Object.entries(weights).map(([k, v]) => [k, v / total]),
  ) as Weights;
}
export function scoreCriteria(values: Weights, weights: Weights) {
  const scoreParts = (Object.keys(weights) as Criterion[]).map((criterion) => ({
    criterion,
    label: criterionLabels[criterion],
    value: clamp(values[criterion]),
    weight: weights[criterion],
    contribution: clamp(values[criterion]) * weights[criterion] * 100,
  }));
  const total = scoreParts.reduce((sum, part) => sum + part.contribution, 0);
  return {
    score: Math.round(total),
    dssScore: Math.round(total),
    scoreParts,
    weights,
    rankingValue: total,
  };
}
