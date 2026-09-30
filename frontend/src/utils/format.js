export function formatMoney(value, { decimals = 2 } = {}) {
  const n = Number(value) || 0;
  return `$${n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

// Keep digits only (and one decimal point) for currency inputs.
export function sanitizeAmount(text) {
  const cleaned = text.replace(/[^0-9.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
}
