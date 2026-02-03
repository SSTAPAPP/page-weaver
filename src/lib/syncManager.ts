export interface SyncQueueItem {
  id: string;
  operation: 'insert' | 'update' | 'delete';
  table: string;
  data: Record<string, unknown>;
  timestamp: Date;
  retries: number;
}

const SYNC_QUEUE_KEY = 'ffk-sync-queue';

export const syncManager = {
  getQueue(): SyncQueueItem[] {
    try {
      const data = localStorage.getItem(SYNC_QUEUE_KEY);
      if (!data) return [];
      return JSON.parse(data).map((item: SyncQueueItem) => ({
        ...item,
        timestamp: new Date(item.timestamp),
      }));
    } catch {
      return [];
    }
  },

  saveQueue(queue: SyncQueueItem[]): void {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  },

  addToQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>): void {
    const queue = this.getQueue();
    const newItem: SyncQueueItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date(),
      retries: 0,
    };
    queue.push(newItem);
    this.saveQueue(queue);
  },

  removeFromQueue(id: string): void {
    const queue = this.getQueue().filter(item => item.id !== id);
    this.saveQueue(queue);
  },

  incrementRetries(id: string): void {
    const queue = this.getQueue().map(item => 
      item.id === id ? { ...item, retries: item.retries + 1 } : item
    );
    this.saveQueue(queue);
  },

  getPendingCount(): number {
    return this.getQueue().length;
  },

  clearQueue(): void {
    localStorage.removeItem(SYNC_QUEUE_KEY);
  },

  isOnline(): boolean {
    return navigator.onLine;
  },
};
