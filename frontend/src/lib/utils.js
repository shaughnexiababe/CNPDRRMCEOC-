import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}


export const isIframe = window.self !== window.top;

export function createPageUrl(pageName) {
    return '/' + pageName.replace(/ /g, '-');
}

/**
 * Safely converts any Firestore-ish timestamp value to a JS Date.
 * Firestore returns Timestamp objects ({ seconds, nanoseconds, toDate() }),
 * while some forms historically stored ISO strings. moment()/new Date()
 * produce "Invalid Date" for Timestamp objects, breaking every date label.
 */
export function fsDate(value) {
    if (value == null) return null;
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') return value.toDate();
    if (typeof value === 'object' && typeof value.seconds === 'number') {
        return new Date(value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6));
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
}
