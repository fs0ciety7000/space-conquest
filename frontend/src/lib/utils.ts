import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a duration in seconds as a human-readable string.
 * Examples: 310756 → "3j 14h 19m 16s", 3725 → "1h 02m 05s", 90 → "1m 30s", 5 → "5s"
 */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0s";
  const s = Math.floor(totalSeconds);
  const days    = Math.floor(s / 86400);
  const hours   = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (days > 0)    return `${days}j ${hours}h ${String(minutes).padStart(2, '0')}m`;
  if (hours > 0)   return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  return `${seconds}s`;
}

/**
 * Formats the time remaining until an ISO date string as a human-readable string.
 * Returns "Terminé" if the time has passed.
 */
export function formatTimeUntil(endTimeStr: string): string {
  const endTime = new Date(endTimeStr).getTime();
  const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
  if (remaining <= 0) return "Terminé";
  return formatDuration(remaining);
}

/**
 * Formats the time remaining until a timestamp in milliseconds as a human-readable string.
 * Returns "Terminé" if the time has passed.
 */
export function formatTimeUntilMs(endTimeMs: number): string {
  const remaining = Math.max(0, Math.floor((endTimeMs - Date.now()) / 1000));
  if (remaining <= 0) return "Terminé";
  return formatDuration(remaining);
}
