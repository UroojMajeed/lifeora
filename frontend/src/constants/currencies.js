import { getLocales } from 'expo-localization';

export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'PKR', name: 'Pakistani Rupee', flag: '🇵🇰' },
  { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'QAR', name: 'Qatari Riyal', flag: '🇶🇦' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'NZD', name: 'New Zealand Dollar', flag: '🇳🇿' },
  { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'MYR', name: 'Malaysian Ringgit', flag: '🇲🇾' },
  { code: 'BDT', name: 'Bangladeshi Taka', flag: '🇧🇩' },
  { code: 'TRY', name: 'Turkish Lira', flag: '🇹🇷' },
  { code: 'EGP', name: 'Egyptian Pound', flag: '🇪🇬' },
  { code: 'NGN', name: 'Nigerian Naira', flag: '🇳🇬' },
  { code: 'ZAR', name: 'South African Rand', flag: '🇿🇦' },
  { code: 'KES', name: 'Kenyan Shilling', flag: '🇰🇪' },
  { code: 'BRL', name: 'Brazilian Real', flag: '🇧🇷' },
  { code: 'MXN', name: 'Mexican Peso', flag: '🇲🇽' },
  { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
];

/** The phone's regional currency if we know it, otherwise USD. */
export function defaultCurrency() {
  try {
    const code = getLocales()[0]?.currencyCode;
    if (code && CURRENCIES.some((c) => c.code === code)) return code;
  } catch {
    // Locale lookup can fail on some devices; fall back below.
  }
  return 'USD';
}
