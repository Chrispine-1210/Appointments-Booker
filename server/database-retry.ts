import { setTimeout as delay } from "node:timers/promises";
import { BookingError } from "./scheduling";

// PostgreSQL guarantees these transaction failures roll back the write. Network
// timeouts are deliberately excluded because their commit outcome may be unknown.
export async function retryBookingWrite<T>(write: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await write(); }
    catch (error) {
      let cause = error as { code?: string; cause?: unknown };
      for (let depth = 0; depth < 4 && cause?.cause; depth++) cause = cause.cause as typeof cause;
      if (cause?.code !== "40P01" && cause?.code !== "40001") throw error;
      if (attempt >= 2) throw new BookingError("Scheduling is temporarily busy. Please retry shortly.", 503);
      await delay(15 * 2 ** attempt + Math.floor(Math.random() * 20));
    }
  }
}
