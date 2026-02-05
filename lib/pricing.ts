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
};

export function roundToIncrement(value: number, increment: number) {
  return Math.ceil(value / increment) * increment;
}

export function computeBillableDimensions(
  widthIn: number,
  heightIn: number,
  settings: PricingSettings
): BillableDimensions {
  const width = Math.max(widthIn, settings.minWidthIn);
  const height = Math.max(heightIn, settings.minHeightIn);
  const billableWidthIn = roundToIncrement(width, settings.roundingIncrementIn);
  const billableHeightIn = roundToIncrement(height, settings.roundingIncrementIn);
  const billableSqIn = Math.max(
    billableWidthIn * billableHeightIn,
    settings.minBillableSqIn
  );

  return { billableWidthIn, billableHeightIn, billableSqIn };
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
