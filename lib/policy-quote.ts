export type MarketProductType =
  | "TERM_15"
  | "TERM_20"
  | "TERM_30"
  | "TERM_GENERIC"
  | "IUL"
  | "UNIVERSAL"
  | "WHOLE"
  | "FINAL_EXPENSE"
  | "OTHER";

export type MarketAgeBand = "AGE_18_30" | "AGE_31_45" | "AGE_46_59" | "AGE_60_PLUS";

export type MarketFaceBand = "FACE_UP_TO_100K" | "FACE_100K_250K" | "FACE_250K_500K" | "FACE_500K_PLUS";

export type MarketPremiumQuote = {
  premium: number;
  productType: MarketProductType;
  ratePerThousand: number;
  ageBand: MarketAgeBand;
  faceBand: MarketFaceBand;
  ageFactor: number;
  faceFactor: number;
  formulaLabel: string;
};

export type MarketQuoteProduct = {
  code: MarketProductType;
  label: string;
  suggestedInput: string;
  ratePerThousand: number;
};

export const MARKET_QUOTE_PRODUCTS: MarketQuoteProduct[] = [
  { code: "TERM_15", label: "Term 15", suggestedInput: "Term 15", ratePerThousand: 0.42 },
  { code: "TERM_20", label: "Term 20", suggestedInput: "Term 20", ratePerThousand: 0.55 },
  { code: "TERM_30", label: "Term 30", suggestedInput: "Term 30", ratePerThousand: 0.72 },
  { code: "IUL", label: "IUL", suggestedInput: "Indexed Universal Life", ratePerThousand: 1.3 },
  { code: "UNIVERSAL", label: "Universal Life", suggestedInput: "Universal Life", ratePerThousand: 1.0 },
  { code: "WHOLE", label: "Whole Life", suggestedInput: "Whole Life", ratePerThousand: 1.1 },
  { code: "FINAL_EXPENSE", label: "Final Expense", suggestedInput: "Final Expense", ratePerThousand: 1.8 },
  { code: "OTHER", label: "Outros", suggestedInput: "Vida", ratePerThousand: 1.0 },
]

export const MARKET_AGE_BANDS: { code: MarketAgeBand; label: string; rateMultiplier: number }[] = [
  { code: "AGE_18_30", label: "18 a 30", rateMultiplier: 0.92 },
  { code: "AGE_31_45", label: "31 a 45", rateMultiplier: 1.0 },
  { code: "AGE_46_59", label: "46 a 59", rateMultiplier: 1.18 },
  { code: "AGE_60_PLUS", label: "60+", rateMultiplier: 1.45 },
]

export const MARKET_FACE_BANDS: { code: MarketFaceBand; label: string; rateMultiplier: number; min: number; max: number | null }[] = [
  { code: "FACE_UP_TO_100K", label: "Até 100.000", rateMultiplier: 0.95, min: 0, max: 100000 },
  { code: "FACE_100K_250K", label: "100.001 a 250.000", rateMultiplier: 1.0, min: 100000.01, max: 250000 },
  { code: "FACE_250K_500K", label: "250.001 a 500.000", rateMultiplier: 1.12, min: 250000.01, max: 500000 },
  { code: "FACE_500K_PLUS", label: "Acima de 500.000", rateMultiplier: 1.22, min: 500000.01, max: null },
]

function normalizeProduct(product: string): string {
  return product.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function classifyProduct(product: string): MarketProductType {
  const normalized = normalizeProduct(product);

  if (normalized.includes("indexed universal life") || normalized.includes("iul")) {
    return "IUL";
  }

  const termMatch = normalized.match(/term\s*(\d{1,2})?/);
  if (termMatch) {
    const rawYears = termMatch[1];
    if (rawYears === "15") return "TERM_15";
    if (rawYears === "20") return "TERM_20";
    if (rawYears === "30") return "TERM_30";
    return "TERM_GENERIC";
  }

  if (normalized.includes("universal")) {
    return "UNIVERSAL";
  }

  if (normalized.includes("whole")) {
    return "WHOLE";
  }

  if (normalized.includes("final")) {
    return "FINAL_EXPENSE";
  }

  return "OTHER";
}

const MARKET_RATE_PER_THOUSAND: Record<MarketProductType, number> = {
  TERM_15: 0.42,
  TERM_20: 0.55,
  TERM_30: 0.72,
  TERM_GENERIC: 0.6,
  IUL: 1.3,
  UNIVERSAL: 1.0,
  WHOLE: 1.1,
  FINAL_EXPENSE: 1.8,
  OTHER: 1.0,
};

const PRODUCT_LABELS: Record<MarketProductType, string> = {
  TERM_15: "Term 15",
  TERM_20: "Term 20",
  TERM_30: "Term 30",
  TERM_GENERIC: "Term (genérico)",
  IUL: "Indexed Universal Life (IUL)",
  UNIVERSAL: "Universal Life",
  WHOLE: "Whole Life",
  FINAL_EXPENSE: "Final Expense",
  OTHER: "Produto padrão",
};

function normalizeAgeBand(raw: string | undefined | null): MarketAgeBand | null {
  if (!raw) return null
  const normalized = raw.toUpperCase()
  const found = MARKET_AGE_BANDS.find((band) => band.code === normalized)
  return found ? found.code : null
}

function normalizeFaceBand(raw: string | undefined | null): MarketFaceBand | null {
  if (!raw) return null
  const normalized = raw.toUpperCase()
  const found = MARKET_FACE_BANDS.find((band) => band.code === normalized)
  return found ? found.code : null
}

function getFaceBandByAmount(faceAmount: number): MarketFaceBand {
  const band = MARKET_FACE_BANDS.find((candidate) =>
    faceAmount >= candidate.min && (candidate.max === null || faceAmount <= candidate.max),
  )
  return band ? band.code : "FACE_500K_PLUS"
}

function formatRate(rate: number): string {
  return rate.toFixed(2)
}

export function calculateMarketPremium({
  product,
  faceAmount,
  ageBand,
  faceBand,
}: {
  product: string;
  faceAmount: number;
  ageBand?: MarketAgeBand;
  faceBand?: MarketFaceBand;
}): MarketPremiumQuote {
  const productType = classifyProduct(product);
  const ratePerThousand = MARKET_RATE_PER_THOUSAND[productType];
  const selectedAgeBand = ageBand ?? "AGE_31_45";
  const selectedFaceBand = faceBand ?? getFaceBandByAmount(faceAmount);
  const ageFactor = MARKET_AGE_BANDS.find((band) => band.code === selectedAgeBand)?.rateMultiplier ?? 1;
  const faceFactor = MARKET_FACE_BANDS.find((band) => band.code === selectedFaceBand)?.rateMultiplier ?? 1;

  const premiumRaw = (faceAmount * ratePerThousand * ageFactor * faceFactor) / 1000;
  const premium = Math.max(0, Number(premiumRaw.toFixed(2)));
  const ageLabel = MARKET_AGE_BANDS.find((band) => band.code === selectedAgeBand)?.label ?? "31 a 45";
  const faceLabel = MARKET_FACE_BANDS.find((band) => band.code === selectedFaceBand)?.label ?? "100.001 a 250.000";

  return {
    premium,
    productType,
    ratePerThousand,
    ageBand: selectedAgeBand,
    faceBand: selectedFaceBand,
    ageFactor,
    faceFactor,
    formulaLabel: `${PRODUCT_LABELS[productType]} · ${formatRate(ratePerThousand)} por 1.000 de cobertura/mês · idade ${ageLabel} (×${formatRate(ageFactor)}) · face ${faceLabel} (×${formatRate(faceFactor)})`,
  };
}

export function getAvailableQuoteProducts(): MarketQuoteProduct[] {
  return MARKET_QUOTE_PRODUCTS;
}

export function getAvailableAgeBands() {
  return MARKET_AGE_BANDS
}

export function getAvailableFaceBands() {
  return MARKET_FACE_BANDS
}

export function parseAgeBand(raw: string | null | undefined): MarketAgeBand {
  return normalizeAgeBand(raw) ?? "AGE_31_45"
}

export function parseFaceBand(raw: string | null | undefined, faceAmount: number): MarketFaceBand {
  return normalizeFaceBand(raw) ?? getFaceBandByAmount(faceAmount)
}
