import AsyncStorage from '@react-native-async-storage/async-storage';

// Milestones already celebrated (kept on this phone): { [key]: ISO date reached }.
const KEY = 'lifeora.milestones';

export async function loadMilestones() {
  try {
    const map = JSON.parse((await AsyncStorage.getItem(KEY)) || '{}');
    return map && typeof map === 'object' ? map : {};
  } catch {
    return {};
  }
}

/**
 * Marks these milestones as reached. Returns the ones that are new (not celebrated before), so the
 * caller can celebrate the newest.
 */
export async function markMilestones(list) {
  const map = await loadMilestones();
  const fresh = list.filter((m) => !map[m.key]);
  if (!fresh.length) return [];
  const now = new Date().toISOString();
  fresh.forEach((m) => {
    map[m.key] = now;
  });
  await AsyncStorage.setItem(KEY, JSON.stringify(map)).catch(() => {});
  return fresh;
}

/** Forget them (used by "Start over"). */
export function clearMilestones() {
  return AsyncStorage.removeItem(KEY).catch(() => {});
}
