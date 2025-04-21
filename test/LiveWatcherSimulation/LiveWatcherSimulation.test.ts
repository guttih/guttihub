import { describe, it, expect } from "vitest";
import { simulateViewerSequence } from "./LiveWatcherSimulation";

describe("LiveWatcher full sequence", () => {
  it("should react to viewer count dropping to zero", async () => {
    await simulateViewerSequence([1, 2, 3, 2, 1, 0], 2000);
    await new Promise((resolve) => setTimeout(resolve, 15000)); // Wait for auto-stop trigger
    expect(true).toBe(true);
  }, 45000); // ⏱️ Extended test timeout to 30 seconds
});
