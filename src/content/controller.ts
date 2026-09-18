import Konva from 'konva';
import browser from 'webextension-polyfill';
import { gsap } from 'gsap';
import {
  DEFAULT_TOOL_STATE,
  normalizeToolState,
  SCHEMA_VERSION,
  type Annotation,
  type AnnotationDocument,
  type InkAnnotation,
  type RuntimeMessage,
  type RuntimeResponse,
  type ShapeAnnotation,
  type TextAnnotation,
  type Tool,
  type ToolStyle,
  type ToolState,
} from '../shared/types';
import { createHistory, commitHistory, redoHistory, undoHistory, type HistoryState } from '../shared/history';
import { digestUrl } from '../shared/url';
import { AnimationFrameGate, appendInkSamples, collectInkSamples, strokeToPath } from './ink';
import { contentScrollOffset } from './scroll';

export interface ControllerView {
  toolState: ToolState;
  canUndo: boolean;
  canRedo: boolean;
  visible: boolean;
  toast: { message: string; error: boolean } | null;
}

type Listener = (view: ControllerView) => void;

async function send<T>(message: RuntimeMessage): Promise<T> {
  const response = await browser.runtime.sendMessage(message) as RuntimeResponse<T>;
  if (!response.ok) throw new Error(response.error.message);
  return response.data;
}

export class DrawMeController {
  private stage: Konva.Stage;
  private documentLayer: Konva.Layer;
  private liveLayer: Konva.Layer;
  private selectionLayer: Konva.Layer;
  private transformer: Konva.Transformer;
  private annotationNodes = new Map<string, Konva.Group>();
  private pathCache = new WeakMap<InkAnnotation, string>();
  private liveNode: Konva.Group | null = null;
  private livePath: Konva.Path | null = null;
  private liveFrames = new AnimationFrameGate();
  private history: HistoryState<Annotation[]> = createHistory([]);
  private listeners = new Set<Listener>();
  private drawing: Annotation | null = null;
  private selectedId: string | null = null;
  private digest = '';
  private createdAt = Date.now();
  private saveTimer: number | null = null;
  private routeTimer: number | null = null;
  private lastUrl = location.href;
  private spaceHeld = false;
  private previousTool: Tool = 'pen';
  private toastTimer: number | null = null;
  private toast: ControllerView['toast'] = null;
  private visible = true;
  private toolState: ToolState = structuredClone(DEFAULT_TOOL_STATE);
  private scrollContainer: HTMLElement | null = null;

  constructor(private readonly host: HTMLElement, stageContainer: HTMLDivElement) {
    this.stage = new Konva.Stage({ container: stageContainer, width: innerWidth, height: innerHeight });
    this.documentLayer = new Konva.Layer();
    this.liveLayer = new Konva.Layer({ listening: false });
    this.selectionLayer = new Konva.Layer({ listening: false });
    this.transformer = this.createTransformer();
    this.stage.add(this.documentLayer, this.liveLayer, this.selectionLayer);
    this.selectionLayer.add(this.transformer);
    this.bindStage();
    this.bindWindow();
  }

  async initialize(): Promise<void> {
    try {
      this.scrollContainer = this.findPrimaryScrollContainer();
      this.updateViewportTransform();
      const preferences = await send<ToolState | null>({ version: 1, type: 'load-preferences' });
      this.toolState = normalizeToolState(preferences);
      await this.loadForUrl(location.href);
      this.applyInteractionMode();
      this.emit();
      void send({ version: 1, type: 'status', enabled: true });
    } catch (error) {
      this.showToast(error instanceof Error ? error.message : 'DrawMe could not load this page.', true);
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.view());
    return () => this.listeners.delete(listener);
  }

  toggle(): void {
    this.visible = !this.visible;
    this.host.style.display = this.visible ? 'block' : 'none';
    if (!this.visible) {
      this.cancelLiveDrawing();
      void this.flushSave();
    }
    void send({ version: 1, type: 'status', enabled: this.visible });
    this.emit();
  }

  setTool(tool: Tool): void {
    this.cancelLiveDrawing();
    this.toolState = { ...this.toolState, activeTool: tool };
    this.selectedId = null;
    this.applyInteractionMode();
    this.render();
    this.savePreferences();
  }

  updateTools(patch: Partial<ToolState>): void {
    this.toolState = { ...this.toolState, ...patch };
    this.emit();
    this.savePreferences();
  }

  updateActiveStyle(patch: Partial<ToolStyle>): void {
    if (this.toolState.activeTool === 'pen') {
      this.toolState = { ...this.toolState, penStyle: { ...this.toolState.penStyle, ...patch } };
    } else if (this.toolState.activeTool === 'highlighter') {
      this.toolState = { ...this.toolState, highlighterStyle: { ...this.toolState.highlighterStyle, ...patch } };
    } else {
      this.toolState = {
        ...this.toolState,
        color: patch.color ?? this.toolState.color,
        width: patch.width ?? this.toolState.width,
        opacity: patch.opacity ?? this.toolState.opacity,
      };
    }
    this.emit();
    this.savePreferences();
  }

  setToolbar(position: ToolState['toolbar']): void {
    this.toolState = { ...this.toolState, toolbar: position };
    this.emit();
    this.savePreferences();
  }

  undo(): void {
    this.history = undoHistory(this.history);
    this.selectedId = null;
    this.render();
    this.queueSave();
  }

  redo(): void {
    this.history = redoHistory(this.history);
    this.selectedId = null;
    this.render();
    this.queueSave();
  }

  clear(): void {
    if (!this.history.present.length || !confirm('Clear every DrawMe annotation on this page? This can be undone until the page closes.')) return;
    this.commit([]);
    this.showToast('Page annotations cleared.');
  }

  deleteSelection(): void {
    if (!this.selectedId) return;
    this.commit(this.history.present.filter((item) => item.id !== this.selectedId));
    this.selectedId = null;
  }

  async exportViewport(): Promise<void> {
    try {
      const selected = this.selectedId;
      this.selectedId = null;
      this.render();
      const overlayUrl = this.stage.toDataURL({ pixelRatio: devicePixelRatio });
      this.selectedId = selected;
      this.render();
      const pageUrl = await send<string>({ version: 1, type: 'capture-visible-tab' });
      const [page, overlay] = await Promise.all([this.loadImage(pageUrl), this.loadImage(overlayUrl)]);
      const canvas = document.createElement('canvas');
      canvas.width = page.naturalWidth;
      canvas.height = page.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas export is unavailable.');
      context.drawImage(page, 0, 0);
      context.drawImage(overlay, 0, 0, canvas.width, canvas.height);
      const link = document.createElement('a');
      link.download = `drawme-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      this.showToast('Annotated view exported.');
    } catch (error) {
      this.showToast(error instanceof Error ? error.message : 'Export failed.', true);
    }
  }

  private createTransformer(): Konva.Transformer {
    const transformer = new Konva.Transformer({
      rotateEnabled: true,
      keepRatio: false,
      anchorFill: '#f8f7f3',
      anchorStroke: '#171717',
      borderStroke: '#171717',
      anchorSize: 9,
      padding: 4,
    });
    transformer.on('transformend', () => this.syncSelectedNode());
    return transformer;
  }

  private bindStage(): void {
    this.stage.on('pointerdown', (event) => this.onPointerDown(event.evt as PointerEvent));
    this.stage.on('pointermove', (event) => this.onPointerMove(event.evt as PointerEvent));
    this.stage.on('pointerup', (event) => this.onPointerUp(event.evt as PointerEvent));
    this.stage.on('pointercancel', () => this.cancelLiveDrawing());
  }

  private bindWindow(): void {
    const onWindowScroll = () => this.updateViewportTransform();
    const onDocumentScroll = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLElement && this.isScrollable(target)) {
        if (target === this.scrollContainer || this.isLargeScrollContainer(target)) this.scrollContainer = target;
      }
      this.updateViewportTransform();
    };
    const onResize = () => {
      if (!this.scrollContainer?.isConnected) this.scrollContainer = this.findPrimaryScrollContainer();
      this.updateViewportTransform();
    };
    addEventListener('scroll', onWindowScroll, { passive: true });
    document.addEventListener('scroll', onDocumentScroll, { passive: true, capture: true });
    addEventListener('resize', onResize, { passive: true });
    this.updateViewportTransform();
    addEventListener('keydown', (event) => this.onKeyDown(event), true);
    addEventListener('keyup', (event) => this.onKeyUp(event), true);
    addEventListener('pagehide', () => {
      this.cancelLiveDrawing();
      void this.flushSave();
    });
    this.routeTimer = window.setInterval(() => void this.checkRoute(), 900);
  }

  private onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
    if (event.code === 'Space' && !event.repeat) {
      this.spaceHeld = true;
      this.previousTool = this.toolState.activeTool;
      this.setTool('hand');
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      event.shiftKey ? this.redo() : this.undo();
      return;
    }
    const tools: Record<string, Tool> = { v: 'hand', p: 'pen', h: 'highlighter', e: 'eraser', s: 'select', t: 'text', r: 'shape' };
    const tool = tools[event.key.toLowerCase()];
    if (tool) this.setTool(tool);
    if ((event.key === 'Delete' || event.key === 'Backspace') && this.selectedId) {
      event.preventDefault();
      this.deleteSelection();
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    if (event.code === 'Space' && this.spaceHeld) {
      this.spaceHeld = false;
      this.setTool(this.previousTool);
    }
  }

  private docPointer(event?: PointerEvent): { x: number; y: number; pressure: number } | null {
    if (!event) return null;
    const samples = collectInkSamples(event, this.scrollPosition(), this.stage.container().getBoundingClientRect());
    const point = samples[samples.length - 1];
    return point ? { x: point[0], y: point[1], pressure: point[2] } : null;
  }

  private onPointerDown(event: PointerEvent): void {
    this.selectScrollContainerAt(event.clientX, event.clientY);
    const point = this.docPointer(event);
    if (!point) return;
    const tool = this.toolState.activeTool;
    const scroll = this.scrollPosition();
    const target = this.stage.getIntersection({ x: point.x - scroll.x, y: point.y - scroll.y });
    const targetId = target?.getAttr('annotationId') as string | undefined;
    if (tool === 'select') {
      this.selectedId = targetId ?? null;
      this.render();
      return;
    }
    if (tool === 'eraser') {
      if (targetId) this.commit(this.history.present.filter((item) => item.id !== targetId));
      return;
    }
    if (tool === 'text') {
      const value = prompt('Enter annotation text');
      if (value?.trim()) {
        const text: TextAnnotation = {
          id: crypto.randomUUID(), type: 'text', text: value.trim(), fontSize: Math.max(16, this.toolState.width * 5), width: 260,
          color: this.toolState.color, opacity: this.toolState.opacity,
          transform: { x: point.x, y: point.y, scaleX: 1, scaleY: 1, rotation: 0 },
        };
        this.commit([...this.history.present, text]);
      }
      return;
    }
    if (tool === 'pen' || tool === 'highlighter') {
      const style = tool === 'pen' ? this.toolState.penStyle : this.toolState.highlighterStyle;
      const samples = collectInkSamples(event, this.scrollPosition(), this.stage.container().getBoundingClientRect());
      this.drawing = {
        id: crypto.randomUUID(), type: tool === 'pen' ? 'ink' : 'highlighter', points: samples,
        width: style.width,
        color: style.color, opacity: style.opacity,
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
      };
      this.mountLiveNode();
      return;
    }
    if (tool === 'shape') {
      this.drawing = {
        id: crypto.randomUUID(), type: 'shape', shape: this.toolState.shape, width: 1, height: 1,
        strokeWidth: this.toolState.width, color: this.toolState.color, opacity: this.toolState.opacity,
        transform: { x: point.x, y: point.y, scaleX: 1, scaleY: 1, rotation: 0 },
      };
      this.mountLiveNode();
    }
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.drawing) return;
    if (this.drawing.type === 'ink' || this.drawing.type === 'highlighter') {
      const samples = collectInkSamples(event, this.scrollPosition(), this.stage.container().getBoundingClientRect());
      const previousPressure = this.drawing.points[this.drawing.points.length - 1]?.[2] ?? 0.5;
      if (event.pressure === 0 && event.pointerType !== 'mouse') {
        for (const sample of samples) sample[2] = previousPressure;
      }
      appendInkSamples(this.drawing.points, samples);
    } else if (this.drawing.type === 'shape') {
      const point = this.docPointer(event);
      if (!point) return;
      this.drawing.width = point.x - this.drawing.transform.x;
      this.drawing.height = point.y - this.drawing.transform.y;
    }
    this.scheduleLiveRender();
  }

  private onPointerUp(event: PointerEvent): void {
    if (!this.drawing) return;
    if (this.drawing.type === 'ink' || this.drawing.type === 'highlighter') {
      const samples = collectInkSamples(event, this.scrollPosition(), this.stage.container().getBoundingClientRect());
      const previousPressure = this.drawing.points[this.drawing.points.length - 1]?.[2] ?? 0.5;
      if (event.pressure === 0 && event.pointerType !== 'mouse') {
        for (const sample of samples) sample[2] = previousPressure;
      }
      appendInkSamples(this.drawing.points, samples);
    } else if (this.drawing.type === 'shape') {
      const point = this.docPointer(event);
      if (point) {
        this.drawing.width = point.x - this.drawing.transform.x;
        this.drawing.height = point.y - this.drawing.transform.y;
      }
    }
    this.flushLiveRender(true);
    const next = [...this.history.present, this.drawing];
    this.drawing = null;
    this.clearLiveNode();
    this.commit(next);
  }

  private mountLiveNode(): void {
    if (!this.drawing) return;
    this.clearLiveNode();
    this.liveNode = this.makeNode(this.drawing, true);
    this.livePath = this.drawing.type === 'ink' || this.drawing.type === 'highlighter'
      ? this.liveNode.findOne('Path') as Konva.Path
      : null;
    this.liveLayer.add(this.liveNode);
    this.liveLayer.batchDraw();
  }

  private scheduleLiveRender(): void {
    this.liveFrames.schedule(() => this.drawLive(false));
  }

  private flushLiveRender(complete: boolean): void {
    this.liveFrames.cancel();
    this.drawLive(complete);
  }

  private drawLive(complete: boolean): void {
    if (!this.drawing) return;
    if ((this.drawing.type === 'ink' || this.drawing.type === 'highlighter') && this.livePath) {
      this.livePath.data(strokeToPath(this.drawing.points, this.drawing.width, {
        kind: this.drawing.type === 'ink' ? 'pen' : 'highlighter',
        complete,
      }));
    } else {
      this.mountLiveNode();
    }
    this.liveLayer.batchDraw();
  }

  private clearLiveNode(): void {
    this.liveNode?.destroy();
    this.liveNode = null;
    this.livePath = null;
    this.liveLayer.batchDraw();
  }

  private cancelLiveDrawing(): void {
    this.liveFrames.cancel();
    this.drawing = null;
    this.clearLiveNode();
  }

  private makeNode(annotation: Annotation, live = false): Konva.Group {
    const interactive = !live && (this.toolState.activeTool === 'select' || this.toolState.activeTool === 'eraser');
    const common = {
      id: annotation.id,
      annotationId: annotation.id,
      annotationRef: annotation,
      opacity: annotation.opacity,
      x: annotation.transform.x,
      y: annotation.transform.y,
      scaleX: annotation.transform.scaleX,
      scaleY: annotation.transform.scaleY,
      rotation: annotation.transform.rotation,
      draggable: !live && this.toolState.activeTool === 'select',
      listening: interactive,
    };
    const node = new Konva.Group(common);
    let shapeNode: Konva.Shape;
    if (annotation.type === 'ink' || annotation.type === 'highlighter') {
      let path = live ? undefined : this.pathCache.get(annotation);
      if (!path) {
        path = strokeToPath(annotation.points, annotation.width, {
          kind: annotation.type === 'ink' ? 'pen' : 'highlighter',
          complete: !live,
        });
        if (!live) this.pathCache.set(annotation, path);
      }
      shapeNode = new Konva.Path({ data: path, fill: annotation.color });
    } else if (annotation.type === 'text') {
      shapeNode = new Konva.Text({ text: annotation.text, width: annotation.width, fontSize: annotation.fontSize, fontFamily: 'Geist, system-ui, sans-serif', fill: annotation.color, lineHeight: 1.25 });
    } else {
      const shape = annotation as ShapeAnnotation;
      const x = Math.min(0, shape.width);
      const y = Math.min(0, shape.height);
      const width = Math.abs(shape.width);
      const height = Math.abs(shape.height);
      if (shape.shape === 'ellipse') shapeNode = new Konva.Ellipse({ x: shape.width / 2, y: shape.height / 2, radiusX: width / 2, radiusY: height / 2, stroke: shape.color, strokeWidth: shape.strokeWidth });
      else if (shape.shape === 'line') shapeNode = new Konva.Line({ points: [0, 0, shape.width, shape.height], stroke: shape.color, strokeWidth: shape.strokeWidth, lineCap: 'round' });
      else if (shape.shape === 'arrow') shapeNode = new Konva.Arrow({ points: [0, 0, shape.width, shape.height], stroke: shape.color, fill: shape.color, strokeWidth: shape.strokeWidth, pointerLength: 12, pointerWidth: 10 });
      else shapeNode = new Konva.Rect({ x, y, width, height, stroke: shape.color, strokeWidth: shape.strokeWidth, cornerRadius: 3 });
    }
    shapeNode.perfectDrawEnabled(false);
    shapeNode.shadowForStrokeEnabled(false);
    shapeNode.setAttr('annotationId', annotation.id);
    node.add(shapeNode);
    if (!live) node.on('dragend', () => this.syncNode(node, annotation.id));
    return node;
  }

  private render(): void {
    const desiredIds = new Set(this.history.present.map((annotation) => annotation.id));
    for (const [id, node] of this.annotationNodes) {
      if (!desiredIds.has(id)) {
        node.destroy();
        this.annotationNodes.delete(id);
      }
    }

    const interactive = this.toolState.activeTool === 'select' || this.toolState.activeTool === 'eraser';
    this.documentLayer.listening(interactive);
    this.selectionLayer.listening(this.toolState.activeTool === 'select');
    this.history.present.forEach((annotation, index) => {
      let node = this.annotationNodes.get(annotation.id);
      if (!node || node.getAttr('annotationRef') !== annotation) {
        node?.destroy();
        node = this.makeNode(annotation);
        this.annotationNodes.set(annotation.id, node);
        this.documentLayer.add(node);
      }
      node.draggable(this.toolState.activeTool === 'select');
      node.listening(interactive);
      node.zIndex(index);
    });

    if (this.selectedId) {
      const node = this.annotationNodes.get(this.selectedId);
      this.transformer.nodes(node ? [node] : []);
    } else this.transformer.nodes([]);
    this.documentLayer.batchDraw();
    this.selectionLayer.batchDraw();
    this.emit();
  }

  private syncSelectedNode(): void {
    const node = this.transformer.nodes()[0];
    if (node && this.selectedId) this.syncNode(node, this.selectedId);
  }

  private syncNode(node: Konva.Node, id: string): void {
    const index = this.history.present.findIndex((item) => item.id === id);
    if (index < 0) return;
    const annotation = this.history.present[index];
    const next = [...this.history.present];
    next[index] = {
      ...annotation,
      transform: { x: node.x(), y: node.y(), scaleX: node.scaleX(), scaleY: node.scaleY(), rotation: node.rotation() },
    };
    this.commit(next);
  }

  private commit(next: Annotation[]): void {
    this.history = commitHistory(this.history, next);
    this.render();
    this.queueSave();
  }

  private async loadForUrl(url: string): Promise<void> {
    this.cancelLiveDrawing();
    this.digest = await digestUrl(url);
    const document = await send<AnnotationDocument | null>({ version: 1, type: 'load-document', digest: this.digest });
    this.createdAt = document?.createdAt ?? Date.now();
    this.history = createHistory(document?.annotations ? structuredClone(document.annotations) : []);
    this.selectedId = null;
    this.render();
  }

  private queueSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => void this.flushSave(), 500);
  }

  private async flushSave(): Promise<void> {
    if (!this.digest) return;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = null;
    const annotationDocument: AnnotationDocument = {
      schemaVersion: SCHEMA_VERSION,
      urlDigest: this.digest,
      createdAt: this.createdAt,
      updatedAt: Date.now(),
      documentSize: { width: globalThis.document.documentElement.scrollWidth, height: globalThis.document.documentElement.scrollHeight },
      annotations: this.history.present,
    };
    try {
      await send({ version: 1, type: 'save-document', document: annotationDocument });
    } catch (error) {
      this.showToast(error instanceof Error ? error.message : 'Annotations could not be saved.', true);
    }
  }

  private async checkRoute(): Promise<void> {
    if (location.href === this.lastUrl) return;
    await this.flushSave();
    this.lastUrl = location.href;
    await this.loadForUrl(location.href);
    this.showToast('Annotations switched to this page.');
  }

  private savePreferences(): void {
    void send({ version: 1, type: 'save-preferences', preferences: this.toolState }).catch(() => undefined);
    this.emit();
  }

  private applyInteractionMode(): void {
    const stageElement = this.stage.container();
    stageElement.classList.toggle('pass-through', this.toolState.activeTool === 'hand');
  }

  private scrollPosition(): { x: number; y: number } {
    return contentScrollOffset(window.scrollX, window.scrollY, this.scrollContainer);
  }

  private updateViewportTransform(): void {
    const scroll = this.scrollPosition();
    this.stage.size({ width: innerWidth, height: innerHeight });
    for (const layer of [this.documentLayer, this.liveLayer, this.selectionLayer]) {
      layer.offset({ x: scroll.x, y: scroll.y });
      layer.batchDraw();
    }
  }

  private isScrollable(element: HTMLElement): boolean {
    if (element === document.body || element === document.documentElement || element === this.host) return false;
    const style = getComputedStyle(element);
    const vertical = /(auto|scroll|overlay)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 2;
    const horizontal = /(auto|scroll|overlay)/.test(style.overflowX) && element.scrollWidth > element.clientWidth + 2;
    return vertical || horizontal;
  }

  private isLargeScrollContainer(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.width * rect.height >= innerWidth * innerHeight * 0.28;
  }

  private findPrimaryScrollContainer(): HTMLElement | null {
    const candidates = document.querySelectorAll<HTMLElement>('main, [role="main"], [class*="scroll"], [class*="overflow"], [data-scroll]');
    let best: HTMLElement | null = null;
    let bestArea = 0;
    for (const candidate of candidates) {
      if (!this.isScrollable(candidate)) continue;
      const rect = candidate.getBoundingClientRect();
      const visibleWidth = Math.max(0, Math.min(innerWidth, rect.right) - Math.max(0, rect.left));
      const visibleHeight = Math.max(0, Math.min(innerHeight, rect.bottom) - Math.max(0, rect.top));
      const area = visibleWidth * visibleHeight;
      if (area > bestArea) {
        best = candidate;
        bestArea = area;
      }
    }
    return best;
  }

  private selectScrollContainerAt(clientX: number, clientY: number): void {
    const elements = document.elementsFromPoint(clientX, clientY);
    for (const element of elements) {
      let candidate = element instanceof HTMLElement ? element : element.parentElement;
      while (candidate && candidate !== document.body && candidate !== document.documentElement) {
        if (candidate !== this.host && this.isScrollable(candidate)) {
          if (candidate !== this.scrollContainer) {
            this.scrollContainer = candidate;
            this.updateViewportTransform();
          }
          return;
        }
        candidate = candidate.parentElement;
      }
    }
  }

  private showToast(message: string, error = false): void {
    this.toast = { message, error };
    this.emit();
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => { this.toast = null; this.emit(); }, 2800);
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('The captured image could not be decoded.'));
      image.src = src;
    });
  }

  private view(): ControllerView {
    return { toolState: this.toolState, canUndo: !!this.history.past.length, canRedo: !!this.history.future.length, visible: this.visible, toast: this.toast };
  }

  private emit(): void {
    const view = this.view();
    for (const listener of this.listeners) listener(view);
  }

  animateToolbar(element: HTMLElement): void {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo(element, { y: 30, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.55, ease: 'power3.out' });
  }
}
