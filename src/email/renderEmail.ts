import type { ReactElement } from 'react';
import type { SendMessageRequest, SendMessageResponse, WazobiaMail } from 'wazobiamail';
import type { RenderEmailOptions, RenderedEmail, SendReactEmailOptions, SendReactEmailPayload } from '../types';

type ReactEmailRenderFn = (
  element: ReactElement,
  options?: { plainText?: boolean; pretty?: boolean }
) => Promise<string> | string;

const HTML_DOCTYPE =
  '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&([a-zA-Z]+);/g, (full, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? full);
}

/**
 * Deterministic, zero-dependency HTML-to-plain-text fallback used when
 * `@react-email/render` is not installed in the host project.
 */
export function htmlToPlainText(html: string): string {
  const withoutInvisible = html
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');

  const withBreaks = withoutInvisible
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|header|footer|h[1-6]|tr|blockquote)>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<a\b[^>]*href=(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi, (_, hrefD, hrefS, label: string) => {
      const href = (hrefD ?? hrefS ?? '').trim();
      const text = label.replace(/<[^>]+>/g, '').trim();
      if (!href || !text || text === href) {
        return text || href;
      }
      return `${text} (${href})`;
    })
    .replace(/<[^>]+>/g, '');

  return decodeHtmlEntities(withBreaks)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function tryLoadReactEmailRenderer(): Promise<ReactEmailRenderFn | null> {
  try {
    const pkgName = '@react-email/render';
    const mod = (await import(/* @vite-ignore */ pkgName)) as {
      render?: ReactEmailRenderFn;
    };
    return typeof mod?.render === 'function' ? mod.render : null;
  } catch {
    return null;
  }
}

/**
 * Renders a React Email or plain React JSX element into HTML and optional plain text.
 * Uses `@react-email/render` automatically when installed, otherwise falls back to
 * `react-dom/server` (`renderToStaticMarkup`).
 */
export async function renderEmail(
  element: ReactElement,
  options: RenderEmailOptions = {}
): Promise<RenderedEmail> {
  const includePlainText = options.plainText ?? true;
  const externalRender = await tryLoadReactEmailRenderer();

  if (externalRender) {
    const html = await Promise.resolve(externalRender(element, { pretty: options.pretty }));
    if (!includePlainText) {
      return { html };
    }
    const text = await Promise.resolve(externalRender(element, { plainText: true }));
    return { html, text };
  }

  const reactDomServer = await import('react-dom/server');
  const rawMarkup = reactDomServer.renderToStaticMarkup(element);
  const html = rawMarkup.trimStart().toLowerCase().startsWith('<!doctype')
    ? rawMarkup
    : `${HTML_DOCTYPE}${rawMarkup}`;

  if (!includePlainText) {
    return { html };
  }

  return {
    html,
    text: htmlToPlainText(rawMarkup),
  };
}

/**
 * Renders a React Email template (or JSX element) and sends it through `client.messages.send`.
 */
export async function sendReactEmail(
  client: WazobiaMail,
  payload: SendReactEmailPayload,
  options: SendReactEmailOptions = {}
): Promise<SendMessageResponse> {
  const { react, html: explicitHtml, text: explicitText, ...rest } = payload;

  const needsHtml = explicitHtml === undefined && rest.htmlBody === undefined;
  const wantsPlainText =
    explicitText === undefined &&
    rest.textBody === undefined &&
    options.renderOptions?.plainText !== false;

  const rendered =
    needsHtml || wantsPlainText
      ? await renderEmail(react, {
          ...options.renderOptions,
          plainText: wantsPlainText,
        })
      : null;

  const request: SendMessageRequest = {
    ...rest,
    ...(explicitHtml !== undefined
      ? { html: explicitHtml }
      : rendered?.html !== undefined && rest.htmlBody === undefined
        ? { html: rendered.html }
        : {}),
    ...(explicitText !== undefined
      ? { text: explicitText }
      : rendered?.text !== undefined && rest.textBody === undefined
        ? { text: rendered.text }
        : {}),
  };

  return client.messages.send(
    request,
    options.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : undefined
  );
}
