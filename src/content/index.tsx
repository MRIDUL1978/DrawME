import React from 'react';
import { createRoot } from 'react-dom/client';
import browser from 'webextension-polyfill';
import type { RuntimeMessage } from '../shared/types';
import { DrawMeController } from './controller';
import { Toolbar } from './Toolbar';
import { CONTENT_STYLES } from './styles';

declare global {
  interface Window { __DRAWME_CONTROLLER__?: DrawMeController }
}

async function bootstrap(): Promise<void> {
  if (window.__DRAWME_CONTROLLER__) {
    window.__DRAWME_CONTROLLER__.toggle();
    return;
  }
  const host = document.createElement('drawme-extension');
  host.setAttribute('aria-label', 'DrawMe annotation overlay');
  const shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = CONTENT_STYLES;
  const shell = document.createElement('div');
  shell.className = 'dm-shell';
  const stageContainer = document.createElement('div');
  stageContainer.className = 'dm-stage';
  const reactRoot = document.createElement('div');
  shell.append(stageContainer, reactRoot);
  shadow.append(style, shell);
  document.documentElement.append(host);

  const controller = new DrawMeController(host, stageContainer);
  window.__DRAWME_CONTROLLER__ = controller;
  createRoot(reactRoot).render(<React.StrictMode><Toolbar controller={controller} /></React.StrictMode>);
  browser.runtime.onMessage.addListener((raw: unknown) => {
    const message = raw as RuntimeMessage;
    if (message?.version === 1 && message.type === 'toggle') {
      controller.toggle();
      return Promise.resolve({ ok: true, data: null });
    }
    return undefined;
  });
  await controller.initialize();
}

void bootstrap();
