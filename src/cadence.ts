/** Estimates steps/minute from acceleration magnitude; not speed or distance. */
export class CadenceDetector {
  private baseline = 1;
  private armed = true;
  private lastStep = 0;
  private intervals: number[] = [];
  sample(x: number, y: number, z: number, now: number): number | null {
    if (![x, y, z, now].every(Number.isFinite)) return null;
    const magnitude = Math.hypot(x, y, z);
    this.baseline += 0.08 * (magnitude - this.baseline);
    const signal = magnitude - this.baseline;
    if (signal < 0.06) this.armed = true;
    if (!this.armed || signal < 0.22 || now - this.lastStep < 260) return null;
    this.armed = false;
    const interval = now - this.lastStep;
    this.lastStep = now;
    if (interval > 750) { this.intervals = []; return null; }
    this.intervals.push(interval);
    this.intervals = this.intervals.slice(-8);
    if (this.intervals.length < 4) return null;
    const sorted = [...this.intervals].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const consistent = this.intervals.filter(i => Math.abs(i - median) < median * 0.22);
    if (consistent.length < this.intervals.length * 0.75) return null;
    return Math.round(60000 / (consistent.reduce((a, b) => a + b, 0) / consistent.length));
  }
}
