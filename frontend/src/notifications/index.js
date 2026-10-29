// Reminders on this phone: permission, scheduling what planReminders() returns, and taps.
// Scheduled locally (no push server), so they work for guests and offline. An app build without the
// notifications module (testers' APK before the next one) simply has no reminders: nothing breaks.
import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo';
import { planReminders } from './plan';

const CHANNEL = 'reminders';
const TEST_PREFIX = 'test-';
const STORE_KEY = 'lifeora.reminders'; // { lastNudged: { [activity]: iso }, scheduledNudges: { [activity]: iso }, asked: bool }

// Only the parts of expo-notifications we use (local scheduling, permission, Android channel, taps),
// each loaded from its own file. The library's main file also loads push features (push tokens,
// topic subscriptions) whose native parts aren't in every app build (Expo Go lacks some), and that
// one missing piece would fail the whole import. Every native part we need is checked first.
const NATIVE_PARTS = [
  'ExpoNotificationScheduler',
  'ExpoNotificationPermissionsModule',
  'ExpoNotificationsHandlerModule',
  'ExpoNotificationsEmitter',
  ...(Platform.OS === 'android' ? ['ExpoNotificationChannelManager'] : []),
];

let lib; // undefined: not looked up yet; null: not in this app build
function notifications() {
  if (lib !== undefined) return lib;
  lib = null;
  if (Platform.OS === 'web') return lib;
  try {
    if (!NATIVE_PARTS.every((name) => requireOptionalNativeModule(name))) return lib;
    const types = require('expo-notifications/build/Notifications.types');
    const channelTypes = require('expo-notifications/build/NotificationChannelManager.types');
    lib = {
      ...require('expo-notifications/build/NotificationsHandler'),
      ...require('expo-notifications/build/NotificationPermissions'),
      ...require('expo-notifications/build/scheduleNotificationAsync'),
      ...require('expo-notifications/build/getAllScheduledNotificationsAsync'),
      ...require('expo-notifications/build/cancelScheduledNotificationAsync'),
      ...require('expo-notifications/build/cancelAllScheduledNotificationsAsync'),
      ...require('expo-notifications/build/setNotificationChannelAsync'),
      ...require('expo-notifications/build/NotificationsEmitter'),
      SchedulableTriggerInputTypes: types.SchedulableTriggerInputTypes,
      AndroidImportance: channelTypes.AndroidImportance,
    };
  } catch (err) {
    if (__DEV__) console.warn('Reminders are off in this app build:', err.message);
    lib = null;
  }
  return lib;
}

/** Whether this app build can show reminders at all. */
export const remindersAvailable = () => Boolean(notifications());

let setUp = false;
/** Once per app start: how a reminder shows while the app is open, and Android's "Reminders" channel. */
export async function setUpReminders() {
  const N = notifications();
  if (!N || setUp) return;
  setUp = true;
  N.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    await N.setNotificationChannelAsync(CHANNEL, {
      name: 'Reminders',
      description: 'Weekly check-in, start days and gentle nudges',
      importance: N.AndroidImportance.DEFAULT,
    }).catch(() => {});
  }
}

/** 'granted' | 'denied' | 'undetermined' | 'unavailable' (and whether the phone will still ask). */
export async function reminderPermission() {
  const N = notifications();
  if (!N) return { status: 'unavailable', canAsk: false };
  try {
    const p = await N.getPermissionsAsync();
    return { status: p.granted ? 'granted' : p.status, canAsk: p.canAskAgain !== false };
  } catch {
    return { status: 'unavailable', canAsk: false };
  }
}

/** Asks the phone (Android's prompt). Returns the new status. Only call it after the person said yes in the app. */
export async function askForReminders() {
  const N = notifications();
  if (!N) return 'unavailable';
  await setUpReminders();
  await markAsked();
  const p = await N.requestPermissionsAsync().catch(() => null);
  if (p?.granted) resync();
  return p?.granted ? 'granted' : p?.status || 'denied';
}

/** The phone's settings for this app, where notifications can be switched back on. */
export const openPhoneSettings = () => Linking.openSettings().catch(() => {});

const readStore = async () => {
  try {
    return JSON.parse((await AsyncStorage.getItem(STORE_KEY)) || 'null') || {};
  } catch {
    return {};
  }
};
const writeStore = (s) => AsyncStorage.setItem(STORE_KEY, JSON.stringify(s)).catch(() => {});

/** Whether this phone already offered reminders (the in-app ask shows once). */
export const remindersAsked = async () => Boolean((await readStore()).asked);
async function markAsked() {
  const s = await readStore();
  await writeStore({ ...s, asked: true });
}
/** "Not now" to the in-app ask: it isn't offered again (Me → Notifications still can). */
export const dismissRemindersAsk = () => markAsked();

let running = Promise.resolve();
/**
 * Re-plans every reminder from scratch: cancels what's scheduled and schedules planReminders(...).
 * Safe to call often (calls run one after another). Does nothing without permission.
 */
export function syncReminders(state) {
  running = running.then(() => doSync(state)).catch(() => {});
  return running;
}

async function doSync({ handoffs, checkIns, reminders }) {
  const N = notifications();
  if (!N) return;
  const { status } = await reminderPermission();
  if (status !== 'granted') return;
  await setUpReminders();

  // Nudges that were due before now went out: remember when, so the next comes a week later.
  const store = await readStore();
  const now = new Date();
  const lastNudged = { ...(store.lastNudged || {}) };
  Object.entries(store.scheduledNudges || {}).forEach(([activity, iso]) => {
    if (new Date(iso) <= now) lastNudged[activity] = iso;
  });

  const plan = planReminders({ handoffs, checkIns, reminders, nudgedAt: lastNudged, now });
  // Cancel what the planner scheduled before (a test reminder on its way is left alone).
  const scheduled = await N.getAllScheduledNotificationsAsync().catch(() => []);
  for (const s of scheduled) {
    if (!s.identifier.startsWith(TEST_PREFIX)) await N.cancelScheduledNotificationAsync(s.identifier).catch(() => {});
  }
  for (const n of plan) {
    await N.scheduleNotificationAsync({
      identifier: n.id,
      content: { title: n.title, body: n.body, data: n.data },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: n.date, channelId: CHANNEL },
    }).catch(() => {});
  }
  const scheduledNudges = Object.fromEntries(plan.filter((n) => n.kind === 'nudge').map((n) => [n.data.params.activity, n.date.toISOString()]));
  await writeStore({ ...store, lastNudged, scheduledNudges });
}

/** Testing: a sample check-in reminder in 10 seconds (switch away from the app to see it; tap it to open the check-in). */
export async function sendTestReminder() {
  const N = notifications();
  if (!N) return false;
  await setUpReminders();
  await N.scheduleNotificationAsync({
    identifier: `${TEST_PREFIX}${Date.now()}`,
    content: { title: 'Your weekly check-in is ready', body: 'Did your handoffs stick? About 2 minutes. (Test)', data: { screen: 'CheckIn' } },
    trigger: { type: N.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10, channelId: CHANNEL },
  });
  return true;
}

// Something outside the sync component (e.g. permission just granted) asks for a re-plan.
let onResync = null;
export const setResyncHandler = (fn) => {
  onResync = fn;
};
export const resync = () => onResync?.();

/** Signing out or starting over: no reminders about someone else's data. */
export async function clearReminders() {
  const N = notifications();
  if (N) await N.cancelAllScheduledNotificationsAsync().catch(() => {});
  await AsyncStorage.removeItem(STORE_KEY).catch(() => {});
}

/**
 * Calls `open(data)` when a reminder is tapped, including the one that opened the app. Returns an
 * unsubscribe function.
 */
export function onReminderTap(open) {
  const N = notifications();
  if (!N) return () => {};
  const handle = (response) => {
    const data = response?.notification?.request?.content?.data;
    if (data?.screen) open(data);
  };
  N.getLastNotificationResponseAsync?.()
    .then((response) => {
      handle(response);
      N.clearLastNotificationResponseAsync?.().catch(() => {});
    })
    .catch(() => {});
  const sub = N.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
