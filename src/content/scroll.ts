export interface ScrollOffsetSource {
  scrollLeft: number;
  scrollTop: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export function contentScrollOffset(windowX: number, windowY: number, container: ScrollOffsetSource | null): Point2D {
  return {
    x: windowX + (container?.scrollLeft ?? 0),
    y: windowY + (container?.scrollTop ?? 0),
  };
}

export function contentPoint(viewportPoint: Point2D, scroll: Point2D): Point2D {
  return { x: viewportPoint.x + scroll.x, y: viewportPoint.y + scroll.y };
}

export function viewportPoint(point: Point2D, scroll: Point2D): Point2D {
  return { x: point.x - scroll.x, y: point.y - scroll.y };
}

