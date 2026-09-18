import browser from 'webextension-polyfill';
import type { Runtime } from 'webextension-polyfill/namespaces/runtime';
import { database } from './database';
import { SCHEMA_VERSION, type RuntimeMessage, type RuntimeResponse } from '../shared/types';

const success = <T>(data: T): RuntimeResponse<T> => ({ ok: true, data });
const failure = (code: string, error: unknown): RuntimeResponse => ({
  ok: false,
  error: { code, message: error instanceof Error ? error.message : String(error) },
});

browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') void browser.tabs.create({ url: browser.runtime.getURL('onboarding.html') });
});

browser.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  try {
    await browser.tabs.sendMessage(tab.id, { version: 1, type: 'toggle' } satisfies RuntimeMessage);
  } catch {
    try {
      await browser.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      await browser.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#171717' });
      await browser.action.setBadgeText({ tabId: tab.id, text: 'ON' });
    } catch (error) {
      await browser.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#b42318' });
      await browser.action.setBadgeText({ tabId: tab.id, text: '!' });
      console.warn('DrawMe cannot run on this page.', error);
    }
  }
});

browser.runtime.onMessage.addListener(async (raw: unknown, sender: Runtime.MessageSender): Promise<RuntimeResponse> => {
  const message = raw as RuntimeMessage;
  if (!message || message.version !== 1) return failure('INVALID_MESSAGE', 'Unsupported message version.');
  try {
    switch (message.type) {
      case 'status':
        if (sender.tab?.id) {
          await browser.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color: '#171717' });
          await browser.action.setBadgeText({ tabId: sender.tab.id, text: message.enabled ? 'ON' : '' });
        }
        return success(null);
      case 'load-document': {
        const document = await database.getDocument(message.digest);
        if (document && document.schemaVersion !== SCHEMA_VERSION) {
          await database.preserveCorrupt(document);
          return failure('UNSUPPORTED_SCHEMA', 'This page has annotations from a newer DrawMe version.');
        }
        return success(document ?? null);
      }
      case 'save-document':
        if (message.document.schemaVersion !== SCHEMA_VERSION) return failure('INVALID_SCHEMA', 'Cannot save an unsupported document schema.');
        await database.putDocument(message.document);
        return success(null);
      case 'delete-document':
        await database.deleteDocument(message.digest);
        return success(null);
      case 'load-preferences':
        return success((await database.getPreferences()) ?? null);
      case 'save-preferences':
        await database.putPreferences(message.preferences);
        return success(null);
      case 'capture-visible-tab': {
        const image = await browser.tabs.captureVisibleTab(sender.tab?.windowId, { format: 'png' });
        return success(image);
      }
      default:
        return failure('UNSUPPORTED_MESSAGE', 'Unsupported DrawMe request.');
    }
  } catch (error) {
    return failure('RUNTIME_ERROR', error);
  }
});
