let unlocked = false;

export function setAppUnlocked(value: boolean) {
  unlocked = value;
}

export function isAppUnlocked() {
  return unlocked;
}
