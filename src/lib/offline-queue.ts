export type QueuedMutation = { id: string; createdAt: string; type: string; payload: unknown };
export function orderedQueue(items: QueuedMutation[]): QueuedMutation[] { return [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt)); }
export function deduplicateQueue(items: QueuedMutation[]): QueuedMutation[] { const ids = new Set<string>(); return orderedQueue(items).filter((item) => ids.has(item.id) ? false : (ids.add(item.id), true)); }
