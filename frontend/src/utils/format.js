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
