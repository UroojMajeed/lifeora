import { Platform } from 'react-native';

// The backend address comes from EXPO_PUBLIC_API_URL: frontend/.env for local testing,
// `npm run start:online` and EAS builds/updates use the online backend (see package.json, eas.json).
const fallback = Platform.OS === 'android' ? 'http://10.0.2.2:5001/api' : 'http://localhost:5001/api';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || fallback;
