export const SCHEMA_VERSION = 1 as const;
export const MESSAGE_VERSION = 1 as const;

export type Tool = 'hand' | 'select' | 'pen' | 'highlighter' | 'eraser' | 'shape' | 'text';
export type ShapeKind = 'rectangle' | 'ellipse' | 'line' | 'arrow';

export interface Transform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}

interface AnnotationBase {
  id: string;
  color: string;
  opacity: number;
  transform: Transform;
}

export interface InkAnnotation extends AnnotationBase {
  type: 'ink' | 'highlighter';
  points: Array<[number, number, number]>;
  width: number;
}

export interface ShapeAnnotation extends AnnotationBase {
  type: 'shape';
  shape: ShapeKind;
  width: number;
  height: number;
  strokeWidth: number;
}

export interface TextAnnotation extends AnnotationBase {
  type: 'text';
  text: string;
  fontSize: number;
  width: number;
}

export type Annotation = InkAnnotation | ShapeAnnotation | TextAnnotation;

export interface AnnotationDocument {
  schemaVersion: typeof SCHEMA_VERSION;
  urlDigest: string;
  createdAt: number;
  updatedAt: number;
  documentSize: { width: number; height: number };
  annotations: Annotation[];
}

export interface ToolStyle {
  color: string;
  width: number;
  opacity: number;
}

export interface ToolState {
  activeTool: Tool;
  shape: ShapeKind;
  color: string;
  width: number;
  opacity: number;
  penStyle: ToolStyle;
  highlighterStyle: ToolStyle;
  toolbar: { x: number | null; y: number | null; collapsed: boolean };
}

export type RuntimeMessage =
  | { version: 1; type: 'toggle' }
  | { version: 1; type: 'status'; enabled: boolean }
  | { version: 1; type: 'load-document'; digest: string }
  | { version: 1; type: 'save-document'; document: AnnotationDocument }
  | { version: 1; type: 'delete-document'; digest: string }
  | { version: 1; type: 'load-preferences' }
  | { version: 1; type: 'save-preferences'; preferences: ToolState }
  | { version: 1; type: 'capture-visible-tab' };

export type RuntimeResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export const DEFAULT_TOOL_STATE: ToolState = {
  activeTool: 'pen',
  shape: 'rectangle',
  color: '#18181b',
  width: 4,
  opacity: 1,
  penStyle: { color: '#18181b', width: 4, opacity: 1 },
  highlighterStyle: { color: '#f4c84a', width: 18, opacity: 0.3 },
  toolbar: { x: null, y: null, collapsed: false },
};

export function normalizeToolState(value: unknown): ToolState {
  if (!value || typeof value !== 'object') return structuredClone(DEFAULT_TOOL_STATE);
  const stored = value as Partial<ToolState>;
  const legacyStyle: ToolStyle = {
    color: typeof stored.color === 'string' ? stored.color : DEFAULT_TOOL_STATE.color,
    width: typeof stored.width === 'number' ? stored.width : DEFAULT_TOOL_STATE.width,
    opacity: typeof stored.opacity === 'number' ? stored.opacity : DEFAULT_TOOL_STATE.opacity,
  };
  return {
    ...DEFAULT_TOOL_STATE,
    ...stored,
    penStyle: { ...legacyStyle, ...(stored.penStyle ?? {}) },
    highlighterStyle: { ...legacyStyle, ...(stored.highlighterStyle ?? {}) },
    toolbar: { ...DEFAULT_TOOL_STATE.toolbar, ...(stored.toolbar ?? {}) },
  };
}
