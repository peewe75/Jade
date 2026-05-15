import { useTranslation } from 'react-i18next';

export interface ProductVariant {
  id: string;
  size?: string;
  color?: string;
  stock: number;
  reserved: number;
  priceOverride?: number;
}

interface Props {
  variants: ProductVariant[];
  selectedId: string | null;
  onChange: (variantId: string) => void;
  isOneOfAKind?: boolean;
}

function stockLabel(
  v: ProductVariant,
  t: (k: string, options?: Record<string, unknown>) => string,
  options: { isOneOfAKind?: boolean; isSingleDefault?: boolean } = {}
): { text: string; cls: string } {
  const qty = v.stock - (v.reserved ?? 0);
  if (qty <= 0) return { text: t('product.soldOut'), cls: 'text-red-500' };
  if (options.isOneOfAKind) return { text: t('product.oneOfAKind'), cls: 'text-emerald-600' };
  if (options.isSingleDefault) return { text: t('product.singleVariant'), cls: 'text-emerald-600' };
  if (qty === 1) return { text: t('product.oneAvailable'), cls: 'text-emerald-600' };
  if (v.reserved > 0) return { text: t('product.reserved'), cls: 'text-orange-500' };
  return { text: t('product.availableCount', { count: qty }), cls: 'text-gray-500' };
}

export default function VariantSelector({ variants, selectedId, onChange, isOneOfAKind }: Props) {
  const { t } = useTranslation();

  const selected = variants.find(v => v.id === selectedId);
  const isSoldOut = (v: ProductVariant) => v.stock - (v.reserved ?? 0) <= 0;

  const hasSizes = variants.some(v => v.size && v.size !== 'One Size');
  const hasColors = variants.some(v => v.color);
  const isSingleDefault = variants.length === 1 && variants[0].size === 'One Size' && !variants[0].color;

  if (isSingleDefault) {
    const v = variants[0];
    const { text, cls } = stockLabel(v, t, { isOneOfAKind, isSingleDefault });
    return (
      <div className="mb-8">
        <p className={`text-xs uppercase tracking-widest ${cls}`}>{text}</p>
      </div>
    );
  }

  return (
    <div className="mb-8 space-y-5">
      {hasSizes && (
        <div>
          <span className="block text-sm font-medium uppercase tracking-wider mb-3">{t('product.selectSize')}</span>
          <div className="flex flex-wrap gap-2">
            {variants.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => onChange(v.id)}
                disabled={isSoldOut(v)}
                className={`py-3 px-5 text-sm transition-colors border ${
                  selectedId === v.id
                    ? 'border-brand-black bg-brand-black text-white'
                    : isSoldOut(v)
                    ? 'border-gray-100 text-gray-300 cursor-not-allowed line-through'
                    : 'border-gray-200 hover:border-brand-black text-brand-black'
                }`}
              >
                {v.size}{v.color ? ` · ${v.color}` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasColors && !hasSizes && (
        <div>
          <span className="block text-sm font-medium uppercase tracking-wider mb-3">{t('product.selectColor')}</span>
          <div className="flex flex-wrap gap-2">
            {variants.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => onChange(v.id)}
                disabled={isSoldOut(v)}
                className={`py-3 px-5 text-sm transition-colors border ${
                  selectedId === v.id
                    ? 'border-brand-black bg-brand-black text-white'
                    : isSoldOut(v)
                    ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                    : 'border-gray-200 hover:border-brand-black text-brand-black'
                }`}
              >
                {v.color}
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <p className={`text-xs uppercase tracking-widest ${stockLabel(selected, t, { isOneOfAKind }).cls}`}>
          {stockLabel(selected, t, { isOneOfAKind }).text}
        </p>
      )}
    </div>
  );
}
