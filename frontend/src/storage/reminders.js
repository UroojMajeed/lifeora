import AsyncStorage from '@react-native-async-storage/async-storage';

// "Remind me later" for a handoff, kept on this phone (in-app for now: no phone notifications yet).
// Until its time, a task steps aside on Home; at its time it comes back to the top, highlighted.
const KEY = 'lifeora.handoffReminders'; // { [activity]: ISO time }

export async function loadReminders() {
  try {
    const map = JSON.parse((await AsyncStorage.getItem(KEY)) || '{}');
    return map && typeof map === 'object' ? map : {};
  } catch {
    return {};
  }
}

async function save(map) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // Not saved: the reminder just won't survive a restart.
  }
  return map;
}

/** Sets (or, with `when` null, clears) the reminder for one task. Returns the new map. */
export async function setReminder(activity, when) {
  const map = await loadReminders();
  if (when) map[activity] = new Date(when).toISOString();
  else delete map[activity];
  return save(map);
}

/** The times on offer: tonight 8pm (while it's still ahead), tomorrow 9am, next Monday 9am. */
export function reminderOptions(now = new Date()) {
  const at = (days, hour) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, hour, 0, 0);
    return d;
  };
  const toMonday = ((8 - now.getDay()) % 7) || 7;
  const options = [];
  if (now.getHours() < 19) options.push({ key: 'tonight', label: 'Tonight 8pm', date: at(0, 20) });
  options.push({ key: 'tomorrow', label: 'Tomorrow 9am', date: at(1, 9) });
  options.push({ key: 'monday', label: 'Next Monday 9am', date: at(toMonday, 9) });
  return options;
}

/** "Tomorrow 9am", "Mon 9am", "Tonight 8pm": short words for when a reminder is due. */
export function reminderLabel(iso, now = new Date()) {
  const d = new Date(iso);
  const days = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
  const h = d.getHours();
  const time = `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`;
  if (days === 0) return h >= 17 ? `Tonight ${time}` : `Today ${time}`;
  if (days === 1) return `Tomorrow ${time}`;
  return `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${time}`;
}
