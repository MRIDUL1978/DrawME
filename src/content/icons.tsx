import type { ReactNode } from 'react';

const paths: Record<string, ReactNode> = {
  hand: <><path d="M8.5 11V5.4a1.4 1.4 0 0 1 2.8 0v4.1-6a1.4 1.4 0 1 1 2.8 0v6-4.8a1.4 1.4 0 1 1 2.8 0v5.1-3.4a1.4 1.4 0 1 1 2.8 0v6.5c0 4-2.8 7.1-6.8 7.1h-1.2c-2.1 0-3.9-1-5.2-2.6L3 15.3a1.6 1.6 0 0 1 2.4-2.1Z"/></>,
  select: <path d="m5 3 14 8-6 2.1L10.8 19Z"/>,
  pen: <><path d="m4 20 4.2-1 10.9-11a2.1 2.1 0 0 0-3-3L5.1 16Z"/><path d="m14.8 6.4 3 3"/></>,
  highlighter: <><path d="m5 15 8.6-8.6 4 4L9 19H5Z"/><path d="M3 21h18"/></>,
  eraser: <><path d="m7 18-3-3 9-10a2 2 0 0 1 3 0l3 3a2 2 0 0 1 0 3l-7 7Z"/><path d="M10 18h9"/></>,
  shape: <><rect x="4" y="5" width="11" height="11" rx="1"/><circle cx="16.5" cy="15.5" r="4.5"/></>,
  text: <><path d="M5 5h14M12 5v14M8 19h8"/></>,
  undo: <><path d="m9 8-5 4 5 4"/><path d="M5 12h8a6 6 0 0 1 6 6"/></>,
  redo: <><path d="m15 8 5 4-5 4"/><path d="M19 12h-8a6 6 0 0 0-6 6"/></>,
  export: <><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 18v3h14v-3"/></>,
  trash: <><path d="M4 7h16M9 7V4h6v3m-9 0 1 14h10l1-14"/></>,
  collapse: <path d="m8 10 4 4 4-4"/>,
};

export function Icon({ name }: { name: keyof typeof paths }) {
  return <svg className="dm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
