# wazobiamail-react

Official React 18/19 hooks, Context Provider, and React Email rendering helpers for the [WazobiaMail](https://wazobiamail.com) API.

## Installation

```bash
npm install wazobiamail-react wazobiamail
# Optional: if using @react-email/components
npm install @react-email/components @react-email/render
```

## Quick Start

### 1. Wrap your app with `<WazobiaMailProvider>`

```tsx
import { WazobiaMailProvider } from 'wazobiamail-react';

export function App({ children }: { children: React.ReactNode }) {
  return (
    <WazobiaMailProvider apiKey={process.env.NEXT_PUBLIC_WAZOBIA_PUBLIC_OR_PROXY_KEY}>
      {children}
    </WazobiaMailProvider>
  );
}
```

### 2. Send emails & React Email JSX with `useSendMail()`

```tsx
import { useSendMail } from 'wazobiamail-react';

function WelcomeEmail({ name }: { name: string }) {
  return (
    <div>
      <h1>Welcome, {name}!</h1>
      <p>Your account is ready.</p>
    </div>
  );
}

export function InviteButton() {
  const { sendReact, isLoading, isSuccess, error } = useSendMail();

  return (
    <button
      disabled={isLoading}
      onClick={() =>
        sendReact(
          {
            from: 'hello@acme.com',
            to: 'ada@example.com',
            subject: 'Welcome to Acme',
            react: <WelcomeEmail name="Ada" />,
          },
          { idempotencyKey: 'welcome-ada-1' }
        )
      }
    >
      {isLoading ? 'Sending...' : isSuccess ? 'Sent!' : 'Send Welcome Email'}
    </button>
  );
}
```

### 3. Render & send React Email templates directly

`renderEmail()` automatically uses `@react-email/render` when installed and falls back cleanly to `react-dom/server` (`renderToStaticMarkup`) + plain-text extraction with zero extra dependencies:

```tsx
import { WazobiaMail } from 'wazobiamail';
import { renderEmail, sendReactEmail } from 'wazobiamail-react';

const client = new WazobiaMail(process.env.WAZOBIA_API_KEY!);

const { html, text } = await renderEmail(<WelcomeEmail name="Ada" />);

await sendReactEmail(client, {
  from: 'hello@acme.com',
  to: 'ada@example.com',
  subject: 'Welcome',
  react: <WelcomeEmail name="Ada" />,
});
```

### 4. Enterprise Mailboxes, Domains & Spam Scoring Hooks

- `useMailbox(mailboxId, { page, limit, unreadOnly, pollInterval })` — paginated mailbox reader with optimistic deletion and automatic unmount polling cleanup
- `useDomains()` — `list`, `create`, `getDnsRecords`, `verify`
- `useSpamCheck()` — pre-send spam and deliverability scoring
- `useWazobiaMail()` — access the context `WazobiaMail` client directly

## License

MIT
