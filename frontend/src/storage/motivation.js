import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';

// The user's motivational photo ("Your why") lives only on this phone: the image is copied into
// the app's document folder (the picker's own copy can be cleared by the system) and its
// location and caption are kept in AsyncStorage.
const KEY = 'reclaim.motivation';

const empty = { uri: null, caption: '' };

async function write(value) {
  await AsyncStorage.setItem(KEY, JSON.stringify(value));
  return value;
}

function deleteQuietly(uri) {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Already gone; nothing to clean up.
  }
}

export async function loadMotivation() {
  try {
    const saved = JSON.parse((await AsyncStorage.getItem(KEY)) || 'null');
    if (!saved?.uri) return { ...empty, caption: saved?.caption || '' };
    return new File(saved.uri).exists ? saved : { ...empty, caption: saved.caption || '' };
  } catch {
    return empty;
  }
}

/** Copies a picked image into permanent storage and replaces any previous photo. */
export async function saveMotivationPhoto(pickedUri, current) {
  const dest = new File(Paths.document, `motivation-${Date.now()}.jpg`);
  new File(pickedUri).copySync(dest);
  deleteQuietly(current?.uri);
  return write({ uri: dest.uri, caption: current?.caption || '' });
}

export function saveMotivationCaption(caption, current) {
  return write({ uri: current?.uri || null, caption: caption.trim().slice(0, 80) });
}

export async function removeMotivation(current) {
  deleteQuietly(current?.uri);
  await AsyncStorage.removeItem(KEY);
  return empty;
}
