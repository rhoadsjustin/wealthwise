import * as Notifications from 'expo-notifications';
import type { ReminderSettings } from '@/context/DataContext';

const TRACKING_REMINDER_ID = 'wealthwise-tracking-reminder';
const MONTHLY_SNAPSHOT_ID = 'wealthwise-monthly-snapshot';

export async function ensureNotificationPermission() {
  const current = await Notifications.getPermissionsAsync();
  if (isPermissionGranted(current)) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return isPermissionGranted(requested);
}

export async function scheduleBudgetReminders(settings: ReminderSettings) {
  await cancelBudgetReminders();

  if (!settings.enabled) {
    return;
  }

  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) {
    throw new Error('NOTIFICATION_PERMISSION_DENIED');
  }

  await Notifications.scheduleNotificationAsync({
    identifier: TRACKING_REMINDER_ID,
    content: {
      title: 'Budget check-in',
      body: 'Review new transactions and keep this month on track.',
      sound: true,
    },
    trigger: buildTrackingTrigger(settings),
  });

  if (settings.monthlySnapshotEnabled) {
    await Notifications.scheduleNotificationAsync({
      identifier: MONTHLY_SNAPSHOT_ID,
      content: {
        title: 'Monthly budget snapshot',
        body: 'Your month is ready to review. Check spending, income, and savings progress.',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: 1,
        hour: settings.hour,
        minute: settings.minute,
      },
    });
  }
}

export async function cancelBudgetReminders() {
  await Promise.all([
    Notifications.cancelScheduledNotificationAsync(TRACKING_REMINDER_ID).catch(() => undefined),
    Notifications.cancelScheduledNotificationAsync(MONTHLY_SNAPSHOT_ID).catch(() => undefined),
  ]);
}

function buildTrackingTrigger(settings: ReminderSettings): Notifications.NotificationTriggerInput {
  if (settings.cadence === 'daily') {
    return {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: settings.hour,
      minute: settings.minute,
    };
  }

  if (settings.cadence === 'monthly') {
    return {
      type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
      day: 15,
      hour: settings.hour,
      minute: settings.minute,
    };
  }

  return {
    type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
    weekday: 2,
    hour: settings.hour,
    minute: settings.minute,
  };
}

function isPermissionGranted(status: Notifications.NotificationPermissionsStatus) {
  const value = status as { granted?: boolean; status?: string };
  return value.granted === true || value.status === 'granted';
}
