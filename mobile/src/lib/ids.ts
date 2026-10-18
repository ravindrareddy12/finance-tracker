// Record ids in the same style as the web app, which created most existing records.

/** Timestamp id, like the web's `Date.now().toString()`; `offset` keeps bulk ids unique. */
export const timestampId = (offset = 0) => String(Date.now() + offset);

/** RFC 4122 v4-style id (the web uses crypto.randomUUID for expenses; Hermes has no crypto). */
export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
