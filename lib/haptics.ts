import { Platform, Vibration } from 'react-native';

// Best-effort dynamic import so the app works even if expo-haptics
// is not installed in the environment (e.g., web or dev without the pkg).
let Haptics: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Haptics = require('expo-haptics');
} catch {}

const vibrate = (duration = 10) => {
  // Keep it subtle; skip on web where vibration may be undesirable
  if (Platform.OS !== 'web') {
    try {
      Vibration.vibrate(duration);
    } catch {}
  }
};

export const impactLight = async () => {
  if (Haptics?.impactAsync && Haptics?.ImpactFeedbackStyle) {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    } catch {}
  }
  vibrate(12);
};

export const selection = async () => {
  if (Haptics?.selectionAsync) {
    try {
      await Haptics.selectionAsync();
      return;
    } catch {}
  }
  vibrate(8);
};

export const success = async () => {
  if (Haptics?.notificationAsync && Haptics?.NotificationFeedbackType) {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    } catch {}
  }
  vibrate(16);
};

export const warning = async () => {
  if (Haptics?.notificationAsync && Haptics?.NotificationFeedbackType) {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    } catch {}
  }
  vibrate(20);
};

export const error = async () => {
  if (Haptics?.notificationAsync && Haptics?.NotificationFeedbackType) {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    } catch {}
  }
  vibrate(24);
};

export default { impactLight, selection, success, warning, error };

