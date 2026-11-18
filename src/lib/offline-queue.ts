export type QueuePayload = {
  id: string;
  foodId: string;
  quantity: number;
  unit: string;
  mealType: string;
  consumedAt: string;
};
export type QueuedLog = {
  userId: string;
  name: string;
  queuedAt: string;
  payload: QueuePayload;
};
export type FailedLog = { name: string; reason: string };
export type Outcome = "done" | "retry" | "drop";
export const QUEUE_KEY = "ahara.queue.v1";
export const FAILED_KEY = "ahara.failed.v1";
const MAX_ENTRIES = 200;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
function valid(item: unknown, now: number): item is QueuedLog {
  const entry = item as QueuedLog | null;
  const payload = entry?.payload;
  if (
    !entry ||
    typeof entry.userId !== "string" ||
    typeof entry.name !== "string" ||
    typeof entry.queuedAt !== "string" ||
    !payload
  )
    return false;
  const age = now - Date.parse(entry.queuedAt);
  return (
    typeof payload.id === "string" &&
    typeof payload.foodId === "string" &&
    typeof payload.quantity === "number" &&
    typeof payload.unit === "string" &&
    typeof payload.mealType === "string" &&
    typeof payload.consumedAt === "string" &&
    Number.isFinite(age) &&
    age < MAX_AGE_MS
  );
}
export function parseQueue(raw: string | null, now = Date.now()): QueuedLog[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data.filter((item) => valid(item, now)) : [];
  } catch {
    return [];
  }
}
/** What to do with a queued entry after the server's answer. */ export function classifyFailure(
  status: number | undefined,
  message = "",
): Outcome {
  if (status === undefined) return "retry";
  if (status === 409 || /already|duplicate/i.test(message)) return "done";
  if (
    status === 401 ||
    status === 403 ||
    status === 408 ||
    status === 425 ||
    status === 429 ||
    status >= 500
  )
    return "retry";
  return "drop";
}
const notify = () => {
  try {
    window.dispatchEvent(new Event("ahara:queue"));
  } catch {
    /* not in a browser */
  }
};
export function readQueue(): QueuedLog[] {
  try {
    return parseQueue(localStorage.getItem(QUEUE_KEY));
  } catch {
    return [];
  }
}
function writeQueue(items: QueuedLog[]): boolean {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
    notify();
    return true;
  } catch {
    return false;
  }
}
/** Returns false when the entry could not be kept on the phone, so the caller can say so. */ export function enqueue(
  item: QueuedLog,
): boolean {
  const items = readQueue().filter(
    (existing) => existing.payload.id !== item.payload.id,
  );
  if (items.length >= MAX_ENTRIES) return false;
  return writeQueue([...items, item]);
}
export const removeQueued = (id: string) =>
  writeQueue(readQueue().filter((item) => item.payload.id !== id));
export function readFailed(): FailedLog[] {
  try {
    const data = JSON.parse(localStorage.getItem(FAILED_KEY) ?? "[]");
    return Array.isArray(data)
      ? data.filter(
          (item) =>
            typeof item?.name === "string" && typeof item?.reason === "string",
        )
      : [];
  } catch {
    return [];
  }
}
export function addFailed(item: FailedLog) {
  try {
    localStorage.setItem(
      FAILED_KEY,
      JSON.stringify([...readFailed(), item].slice(-20)),
    );
    notify();
  } catch {
    /* best effort */
  }
}
export function clearFailed() {
  try {
    localStorage.removeItem(FAILED_KEY);
    notify();
  } catch {
    /* best effort */
  }
}
