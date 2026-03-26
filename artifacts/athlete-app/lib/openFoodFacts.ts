export interface OFFProduct {
  barcode: string;
  name: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  imageUrl?: string;
}

function safeNum(v: unknown): number {
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : Math.round(n * 10) / 10;
}

export async function fetchProductByBarcode(barcode: string): Promise<OFFProduct | null> {
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,nutriments,image_front_small_url`;
    const res = await fetch(url, { headers: { "User-Agent": "ADAPT-by-LMJ/1.0" } });
    if (!res.ok) return null;
    const json: {
      status: number;
      product?: {
        product_name?: string;
        nutriments?: Record<string, unknown>;
        image_front_small_url?: string;
      };
    } = await res.json();
    if (json.status !== 1 || !json.product) return null;
    const p = json.product;
    const n = p.nutriments ?? {};
    const name = p.product_name ?? "";
    if (!name) return null;
    return {
      barcode,
      name,
      kcalPer100g: safeNum(n["energy-kcal_100g"]),
      proteinPer100g: safeNum(n["proteins_100g"]),
      carbsPer100g: safeNum(n["carbohydrates_100g"]),
      fatPer100g: safeNum(n["fat_100g"]),
      imageUrl: p.image_front_small_url ?? undefined,
    };
  } catch {
    return null;
  }
}
