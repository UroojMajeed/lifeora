import AsyncStorage from '@react-native-async-storage/async-storage';
import { LEGACY_MILESTONES_KEY, loadProgress, updateProgress } from './progress';

// Milestones already celebrated, kept with your account: { [key]: date reached }.

export async function loadMilestones() {
  return (await loadProgress()).milestones || {};
}

/**
 * Marks these milestones as reached. Returns the ones that are new (not celebrated before), so the
 * caller can celebrate the newest.
 */
export async function markMilestones(list) {
  if (!list.length) return [];
  try {
    const { fresh = [] } = await updateProgress({ milestones: list.map((m) => m.key) });
    return list.filter((m) => fresh.includes(m.key));
  } catch {
    return []; // offline: celebrate next time
  }
}

/** Forgets what this phone kept from before milestones lived on the account (sign out, start over). */
export function clearMilestones() {
  return AsyncStorage.removeItem(LEGACY_MILESTONES_KEY).catch(() => {});
}
