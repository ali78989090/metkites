import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Product, Variant } from "./types";

const STORAGE_KEY = "mlk_cart_v1";

export interface CartLine {
  /** `${productId}:${variantId}` — merging happens automatically on this key. */
  key: string;
  productId: string;
  variantId: string;
  productName: string;
  productSlug: string;
  variantName: string;
  categoryName: string;
  brandName: string;
  unit: string;
  unitLabel: string;
  pricePkr: number | null;
  priceStatus: "configured" | "tbc";
  imagePath: string | null;
  quantity: number;
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  add: (product: Product, variant: Variant, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  lineFor: (product: Product, variant: Variant) => CartLine | undefined;
}

const CartContext = createContext<CartContextValue | null>(null);

function readStored(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (line) =>
        line &&
        typeof line.key === "string" &&
        typeof line.productId === "string" &&
        typeof line.variantId === "string" &&
        Number.isFinite(line.quantity) &&
        line.quantity > 0,
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => readStored());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* storage unavailable (private mode) — cart stays in memory */
    }
  }, [lines]);

  const add = useCallback((product: Product, variant: Variant, quantity = 1) => {
    setLines((current) => {
      const key = `${product.id}:${variant.id}`;
      const existing = current.find((line) => line.key === key);
      if (existing) {
        return current.map((line) =>
          line.key === key ? { ...line, quantity: Math.min(500, line.quantity + quantity) } : line,
        );
      }
      const pricePkr = variant.pricePkr ?? product.pricePkr;
      return [
        ...current,
        {
          key,
          productId: product.id,
          variantId: variant.id,
          productName: product.name,
          productSlug: product.slug,
          variantName: variant.name,
          categoryName: product.categoryName,
          brandName: product.brandName,
          unit: product.unit,
          unitLabel: product.unitLabel,
          pricePkr,
          priceStatus: pricePkr === null ? "tbc" : "configured",
          imagePath: product.image,
          quantity,
        },
      ];
    });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setLines((current) =>
      quantity <= 0
        ? current.filter((line) => line.key !== key)
        : current.map((line) => (line.key === key ? { ...line, quantity: Math.min(500, quantity) } : line)),
    );
  }, []);

  const remove = useCallback((key: string) => {
    setLines((current) => current.filter((line) => line.key !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const lineFor = useCallback(
    (product: Product, variant: Variant) => lines.find((line) => line.key === `${product.id}:${variant.id}`),
    [lines],
  );

  const count = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);

  const value = useMemo(
    () => ({ lines, count, add, setQuantity, remove, clear, lineFor }),
    [lines, count, add, setQuantity, remove, clear, lineFor],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
