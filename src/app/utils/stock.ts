// Stock helpers for the menu. `available_servings` comes from GET /productDetails:
// how many servings the recipe's ingredients can still make. null/undefined = no recipe → unlimited.

export const LOW_STOCK_SERVINGS = 5;

export function availableServings(variant: any): number {
  const v = variant?.available_servings;
  return v === null || v === undefined ? Infinity : Math.max(0, Math.floor(+v || 0));
}

export function isSoldOut(variant: any): boolean {
  return availableServings(variant) <= 0;
}

export function isLowStock(variant: any): boolean {
  const n = availableServings(variant);
  return n > 0 && n <= LOW_STOCK_SERVINGS;
}
