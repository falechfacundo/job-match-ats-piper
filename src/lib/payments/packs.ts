export const CREDIT_PACKS = {
  pack_5: { credits: 5, priceArs: 4999, title: "5 créditos — Job Match ATS" },
  pack_15: { credits: 15, priceArs: 12999, title: "15 créditos — Job Match ATS" },
  pack_40: { credits: 40, priceArs: 29999, title: "40 créditos — Job Match ATS" },
} as const;

export type CreditPackId = keyof typeof CREDIT_PACKS;

export function isCreditPackId(value: string): value is CreditPackId {
  return value in CREDIT_PACKS;
}
