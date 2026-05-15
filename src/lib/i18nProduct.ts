type TranslatableField = 'name' | 'description' | 'detailsAndCare' | 'shippingAndReturns';

export function getProductText(product: any, lang: string, field: TranslatableField): string {
  const translation = product?.translations?.[lang as 'it' | 'en'];
  if (translation?.[field]) return translation[field];
  return product?.[field] ?? '';
}
