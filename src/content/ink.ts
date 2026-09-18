import { getStroke } from 'perfect-freehand';
import type { Point2D } from './scroll';

export type InkSample = [x: number, y: number, pressure: number];

export interface StrokeRenderOptions {
  kind: 'pen' | 'highlighter';
  complete: boolean;
}

export class AnimationFrameGate {
  private frame: number | null = null;

  constructor(
    private readonly requestFrame: (callback: FrameRequestCallback) => number = (callback) => requestAnimationFrame(callback),
    private readonly cancelFrame: (handle: number) => void = (handle) => cancelAnimationFrame(handle),
  ) {}

  schedule(callback: FrameRequestCallback): boolean {
    if (this.frame !== null) return false;
    this.frame = this.requestFrame((time) => {
      this.frame = null;
      callback(time);
    });
    return true;
  }

  cancel(): void {
    if (this.frame === null) return;
    this.cancelFrame(this.frame);
    this.frame = null;
  }
}

type PointerSampleEvent = Pick<PointerEvent, 'clientX' | 'clientY' | 'pressure'>;

interface CoalescedPointerEvent extends PointerSampleEvent {
  getCoalescedEvents?: () => PointerSampleEvent[];
}

const MIN_SAMPLE_DISTANCE = 0.2;
const MIN_PRESSURE_DELTA = 0.02;

function pressureOf(event: PointerSampleEvent): number {
  return event.pressure > 0 ? event.pressure : 0.5;
}

/** Collect every hardware sample while retaining the current event as the endpoint. */
export function collectInkSamples(
  event: CoalescedPointerEvent,
  scroll: Point2D,
  stageRect: Pick<DOMRect, 'left' | 'top'> = { left: 0, top: 0 },
): InkSample[] {
  const coalesced = event.getCoalescedEvents?.() ?? [];
  const events = coalesced.length ? [...coalesced] : [event];
  const endpoint = events[events.length - 1];
  if (endpoint.clientX !== event.clientX || endpoint.clientY !== event.clientY || endpoint.pressure !== event.pressure) {
    events.push(event);
  }
  return events.map((sample) => [
    sample.clientX - stageRect.left + scroll.x,
    sample.clientY - stageRect.top + scroll.y,
    pressureOf(sample),
  ]);
}

/** Keep tight turns and loops; fold only samples that are effectively identical. */
export function appendInkSamples(points: InkSample[], samples: InkSample[]): number {
  let appended = 0;
  for (const sample of samples) {
    const previous = points[points.length - 1];
    if (previous) {
      const distance = Math.hypot(sample[0] - previous[0], sample[1] - previous[1]);
      if (distance < MIN_SAMPLE_DISTANCE && Math.abs(sample[2] - previous[2]) < MIN_PRESSURE_DELTA) {
        if (points.length > 1) points[points.length - 1] = sample;
        continue;
      }
    }
    points.push(sample);
    appended += 1;
  }
  return appended;
}

export function strokeToPath(
  points: InkSample[],
  size: number,
  options: StrokeRenderOptions = { kind: 'pen', complete: true },
): string {
  if (!points.length) return '';
  const simulatedPressure = points.every((point) => point[2] === 0.5);
  const highlighter = options.kind === 'highlighter';
  const outline = getStroke(points, {
    size,
    thinning: highlighter ? 0 : simulatedPressure ? 0.35 : 0.55,
    smoothing: highlighter ? 0.76 : simulatedPressure ? 0.72 : 0.68,
    streamline: highlighter ? 0.58 : simulatedPressure ? 0.58 : 0.5,
    simulatePressure: !highlighter && simulatedPressure,
    easing: (value) => value,
    // Keep the live endpoint exact so the ink never intentionally trails the pointer.
    // Completion remains explicit so preview geometry is not cached as final.
    last: true,
    start: { taper: 0, cap: true },
    end: { taper: 0, cap: true },
  });
  if (!outline.length) return '';
  const average = (a: number[], b: number[]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let path = `M ${outline[0][0]} ${outline[0][1]} Q`;
  for (let index = 1; index < outline.length; index += 1) {
    const midpoint = average(outline[index], outline[(index + 1) % outline.length]);
    path += ` ${outline[index][0]} ${outline[index][1]} ${midpoint[0]} ${midpoint[1]}`;
  }
  return `${path} Z`;
}
