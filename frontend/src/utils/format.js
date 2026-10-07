/** Formats an amount in the user's currency, e.g. $25.00, PKR 1,250, €30.50. */
export function formatMoney(value, currency = 'USD', { decimals } = {}) {
  const n = Number(value) || 0;
  const digits = decimals ?? (n >= 1000 ? 0 : 2);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(n);
  } catch {
    // Older JS engines without full Intl support.
    return `${currency} ${n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
  }
}

export function formatHours(value) {
  const n = Math.round((Number(value) || 0) * 100) / 100;
  return `${n}h`;
}

// Keep digits only (and one decimal point, 2 decimals) for currency inputs.
export function sanitizeAmount(text) {
  const cleaned = text.replace(/[^0-9.]/g, '');
  const [digits, ...rest] = cleaned.split('.');
  // 13 digits is plenty for any yearly pay in any currency (the server allows up to 10 trillion).
  const whole = digits.slice(0, 13);
  return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
}

/** Font size that fits `text` on one line in `width` points, between `min` and `max`. */
export function fitFontSize(text, width, max, min) {
  const chars = Math.max(1, String(text || '').length);
  return Math.floor(Math.max(min, Math.min(max, width / (chars * 0.62))));
}

/** Thousands separators for an amount being typed: "120000.5" → "120,000.5". */
export function groupDigits(text) {
  if (!text) return '';
  const [whole, ...rest] = String(text).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return rest.length ? `${grouped}.${rest.join('')}` : grouped;
}
