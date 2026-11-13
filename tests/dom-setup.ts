import { Window } from 'happy-dom';
import { afterEach } from 'bun:test';
import { cleanup } from '@testing-library/react';

if (typeof (globalThis as any).document === 'undefined') {
  const win = new Window({ url: 'http://localhost/' });
  const keys = [
    'window',
    'document',
    'navigator',
    'HTMLElement',
    'SVGElement',
    'Element',
    'Node',
    'Text',
    'DocumentFragment',
    'Event',
    'CustomEvent',
    'MutationObserver',
    'getComputedStyle',
    'requestAnimationFrame',
    'cancelAnimationFrame',
  ] as const;

  (globalThis as any).window = win;
  for (const key of keys) {
    if (key in win && !(key in globalThis)) {
      (globalThis as any)[key] = (win as any)[key];
    }
  }
}

afterEach(() => {
  cleanup();
});
