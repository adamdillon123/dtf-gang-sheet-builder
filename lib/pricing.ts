export type PricingSettings = {
  roundingIncrementIn: number;
  minWidthIn: number;
  minHeightIn: number;
  minBillableSqIn: number;
};

export type PricingTier = {
  minSqIn: number;
  maxSqIn: number | null;
  ratePerSqIn: number;
};

export type BillableDimensions = {
  billableWidthIn: number;
  billableHeightIn: number;
  billableSqIn: number;
  areaUnits: number;
};

export function roundToIncrement(value: number, increment: number) {
  return Math.ceil(value / increment) * increment;
}

export function toIncrementUnits(value: number, increment: number) {
  return Math.ceil(value / increment);
}

export function incrementDenominator(increment: number) {
  return Math.round(1 / increment);
}

export function computeBillableDimensions(
  widthIn: number,
  heightIn: number,
  settings: PricingSettings
): BillableDimensions {
  const width = Math.max(widthIn, settings.minWidthIn);
  const height = Math.max(heightIn, settings.minHeightIn);
  const unitDenom = incrementDenominator(settings.roundingIncrementIn);
  const widthUnits = toIncrementUnits(width, settings.roundingIncrementIn);
  const heightUnits = toIncrementUnits(height, settings.roundingIncrementIn);
  const areaUnits = widthUnits * heightUnits;
  const minAreaUnits = Math.ceil(settings.minBillableSqIn * unitDenom * unitDenom);
  const billableAreaUnits = Math.max(areaUnits, minAreaUnits);
  const billableWidthIn = widthUnits * settings.roundingIncrementIn;
  const billableHeightIn = heightUnits * settings.roundingIncrementIn;
  const billableSqIn = billableAreaUnits / (unitDenom * unitDenom);

  return { billableWidthIn, billableHeightIn, billableSqIn, areaUnits: billableAreaUnits };
}

export function selectTier(totalSqIn: number, tiers: PricingTier[]) {
  const sorted = [...tiers].sort((a, b) => a.minSqIn - b.minSqIn);
  return (
    sorted.find(
      (tier) =>
        totalSqIn >= tier.minSqIn &&
        (tier.maxSqIn === null || totalSqIn <= tier.maxSqIn)
    ) ?? sorted[sorted.length - 1]
  );
}

export function subtotalCentsFromAreaUnits(
  totalAreaUnits: number,
  increment: number,
  ratePerSqIn: number
) {
  const unitDenom = incrementDenominator(increment);
  const rateCents = Math.round(ratePerSqIn * 100);
  return Math.round((totalAreaUnits * rateCents) / (unitDenom * unitDenom));
}
