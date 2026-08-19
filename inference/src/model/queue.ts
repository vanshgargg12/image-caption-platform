import { ConcurrencyLimitError, InferenceTimeoutError } from "./types.js";

export class InferenceQueue {
  private activeCount = 0;
  private queue: Array<() => void> = [];

  constructor(
    private readonly maxConcurrency: number = 1,
    private readonly maxQueueSize: number = 10
  ) {}

  public get pendingCount(): number {
    return this.queue.length;
  }

  public get runningCount(): number {
    return this.activeCount;
  }

  public async run<T>(task: () => Promise<T>, timeoutMs: number): Promise<T> {
    if (this.activeCount >= this.maxConcurrency && this.queue.length >= this.maxQueueSize) {
      throw new ConcurrencyLimitError(
        "Service is busy processing maximum concurrent inference requests."
      );
    }

    if (this.activeCount >= this.maxConcurrency) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          const index = this.queue.indexOf(nextFn);
          if (index !== -1) {
            this.queue.splice(index, 1);
          }
          reject(new InferenceTimeoutError(`Inference request queued but timed out after ${timeoutMs}ms.`));
        }, timeoutMs);

        const nextFn = () => {
          clearTimeout(timer);
          resolve();
        };

        this.queue.push(nextFn);
      });
    }

    this.activeCount++;
    let timeoutTimer: NodeJS.Timeout | null = null;

    try {
      const taskPromise = task();
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutTimer = setTimeout(() => {
          reject(new InferenceTimeoutError(`Inference execution timed out after ${timeoutMs}ms.`));
        }, timeoutMs);
      });

      return await Promise.race([taskPromise, timeoutPromise]);
    } finally {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }
      this.activeCount--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        if (next) next();
      }
    }
  }
}

export const globalInferenceQueue = new InferenceQueue(1, 10);
