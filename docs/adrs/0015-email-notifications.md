# ADR-0015: Email & Notifications

**Status**: Accepted (opt-in — implement when needed)
**Date**: 2026-02-27
**Supersedes**: N/A

---

## Context

Most applications need to send emails — transactional (password resets, order confirmations, welcome emails), marketing (newsletters, announcements), and system notifications (error alerts, admin notifications). The email strategy must address: which provider, how to build email templates (HTML email is notoriously difficult), how to handle delivery failures, and how to test emails in development without sending real messages.

Additionally, in-app notifications (toasts, banners, push notifications) are a separate concern that often accompanies email. This ADR covers both.

## Decision

**Resend for transactional email delivery. React Email for building templates. Sonner for in-app toast notifications. All opt-in — install when the project needs email or notifications.**

---

## When to Add Email

```
Does the project have authentication (password reset, magic link, email verification)?
  → YES: Add Resend + React Email
Does the project have user-facing actions that need confirmation (orders, bookings, contact forms)?
  → YES: Add Resend + React Email
Does the project only have a contact form that goes to the business owner?
  → Consider: Resend (free tier: 100 emails/day) OR a simple webhook to Slack/Discord
Is this a static marketing site with no backend?
  → NO email needed — use a third-party form service (Formspree, Netlify Forms)
```

---

## Rules

| Rule | Level |
|------|-------|
| Use Resend SDK for sending — never raw SMTP | **MUST** |
| Build email templates with React Email — never raw HTML strings | **MUST** |
| Send emails from Server Actions or Route Handlers — never from Client Components | **MUST** |
| Validate recipient email with Zod before sending | **MUST** |
| Handle send failures gracefully — return `Result<T>`, never throw | **MUST** |
| Log email sends at `info` level with recipient and template name (ADR-0014) | **MUST** |
| Never log email content/body (may contain PII) | **MUST NOT** |
| Never send real emails in development — use Resend's test mode or log-only | **MUST NOT** |
| Use environment variables for API keys and sender addresses (ADR-0006) | **MUST** |
| Keep email templates in `src/lib/email/templates/` | **SHOULD** |
| Use a queue for bulk sends (>10 recipients) — don't block the request | **SHOULD** |

---

## Provider Comparison

| Provider | Free Tier | DX | Next.js Support | Best For |
|----------|-----------|----|-----------------|---------| 
| **Resend** | 100 emails/day, 3,000/month | ⭐⭐⭐⭐⭐ | ✅ Official SDK | Transactional email |
| SendGrid | 100 emails/day | ⭐⭐⭐ | ⚠️ REST API | High-volume transactional |
| Postmark | 100 emails/month | ⭐⭐⭐⭐ | ⚠️ REST API | Transactional (deliverability focus) |
| AWS SES | 62,000 emails/month (from EC2) | ⭐⭐ | ⚠️ AWS SDK | High-volume, cost-sensitive |
| Mailgun | 100 emails/day (trial) | ⭐⭐⭐ | ⚠️ REST API | Transactional + marketing |
| Nodemailer (SMTP) | Free (your SMTP) | ⭐⭐ | ⚠️ Node.js only | Self-hosted, full control |

**Resend wins because**: best DX (type-safe SDK, React Email integration), generous free tier (3,000/month), modern API, and it's built by the same team as React Email. Zero config for Next.js.

---

## Installation

```bash
# Email sending
pnpm add resend

# Email templates (React components → HTML)
pnpm add @react-email/components react-email

# In-app toast notifications
pnpm add sonner
```

---

## File Structure

```
src/lib/email/
  index.ts                     # Resend client singleton
  send.ts                      # Type-safe send wrapper
  templates/
    WelcomeEmail.tsx           # React Email template
    PasswordResetEmail.tsx
    ContactNotificationEmail.tsx
    OrderConfirmationEmail.tsx
    components/                # Shared email components
      EmailLayout.tsx          # Brand header + footer
      EmailButton.tsx
```

---

## Implementation

### Step 1: Environment Variables

```dotenv
# .env.local
RESEND_API_KEY=re_123456789          # Get from resend.com/api-keys
EMAIL_FROM=onboarding@resend.dev     # Free tier uses resend.dev domain
# EMAIL_FROM=hello@yourdomain.com    # After domain verification
```

Add to `src/lib/env.ts`:

```typescript
RESEND_API_KEY: z.string().optional(),
EMAIL_FROM: z.string().email().default('onboarding@resend.dev'),
```

### Step 2: Resend Client

```typescript
// src/lib/email/index.ts
import { Resend } from 'resend'

import { env } from '@/lib/env'

export const resend = env.RESEND_API_KEY
  ? new Resend(env.RESEND_API_KEY)
  : null

/**
 * Check if email sending is configured.
 * Returns false in development without API key — emails are logged instead.
 */
export const isEmailConfigured = (): boolean => resend !== null
```

### Step 3: Type-Safe Send Wrapper

```typescript
// src/lib/email/send.ts
import type { ReactElement } from 'react'

import { logger } from '@/lib/logger'
import { env } from '@/lib/env'
import type { Result } from '@contracts/common'

import { resend, isEmailConfigured } from './index'

type SendEmailParams = {
  to: string | string[]
  subject: string
  template: ReactElement
  /** Override sender (defaults to EMAIL_FROM env) */
  from?: string
  /** Reply-to address */
  replyTo?: string
}

type SendEmailResult = { messageId: string }

/**
 * Send an email using Resend.
 * In development without API key, logs the email instead of sending.
 * Always returns Result<T> — never throws.
 */
export const sendEmail = async (params: SendEmailParams): Promise<Result<SendEmailResult>> => {
  const { to, subject, template, from, replyTo } = params
  const sender = from ?? env.EMAIL_FROM

  // Development fallback — log instead of sending
  if (!isEmailConfigured()) {
    logger.info('[Email] Development mode — email not sent', {
      to,
      subject,
      from: sender,
    })
    return { ok: true, value: { messageId: 'dev-no-send' } }
  }

  try {
    const { data, error } = await resend!.emails.send({
      from: sender,
      to: Array.isArray(to) ? to : [to],
      subject,
      react: template,
      ...(replyTo && { replyTo }),
    })

    if (error) {
      logger.error('[Email] Send failed', { to, subject, error: error.message })
      return {
        ok: false,
        error: { code: 'INTERNAL_ERROR', message: `Email send failed: ${error.message}` },
      }
    }

    logger.info('[Email] Sent successfully', { to, subject, messageId: data?.id })
    return { ok: true, value: { messageId: data?.id ?? 'unknown' } }
  } catch (error) {
    logger.error('[Email] Unexpected error', { to, subject }, error)
    return {
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to send email' },
    }
  }
}
```

### Step 4: Email Templates (React Email)

```tsx
// src/lib/email/templates/components/EmailLayout.tsx
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

type EmailLayoutProps = {
  preview: string
  children: React.ReactNode
}

export const EmailLayout = ({ preview, children }: EmailLayoutProps) => (
  <Html>
    <Head />
    <Preview>{preview}</Preview>
    <Body style={{ backgroundColor: '#f6f9fc', fontFamily: 'system-ui, sans-serif' }}>
      <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 0' }}>
        {/* Brand header */}
        <Section style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '8px 8px 0 0' }}>
          <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a1a1a', margin: 0 }}>
            {/* TODO: Replace with project brand name */}
            My Brand
          </Text>
        </Section>

        {/* Content */}
        <Section style={{ padding: '24px', backgroundColor: '#ffffff' }}>
          {children}
        </Section>

        {/* Footer */}
        <Section style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '0 0 8px 8px' }}>
          <Hr style={{ borderColor: '#e6e6e6' }} />
          <Text style={{ fontSize: '12px', color: '#666666', textAlign: 'center' as const }}>
            {/* TODO: Replace with project info */}
            © {new Date().getFullYear()} My Brand. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)
```

```tsx
// src/lib/email/templates/WelcomeEmail.tsx
import { Text, Button } from '@react-email/components'

import { EmailLayout } from './components/EmailLayout'

type WelcomeEmailProps = {
  name: string
  loginUrl: string
}

export const WelcomeEmail = ({ name, loginUrl }: WelcomeEmailProps) => (
  <EmailLayout preview={`Welcome to My Brand, ${name}!`}>
    <Text style={{ fontSize: '16px', color: '#1a1a1a' }}>
      Hi {name},
    </Text>
    <Text style={{ fontSize: '16px', color: '#4a4a4a', lineHeight: '24px' }}>
      Welcome! Your account has been created. Click below to get started.
    </Text>
    <Button
      href={loginUrl}
      style={{
        backgroundColor: '#0ea5e9',
        color: '#ffffff',
        padding: '12px 24px',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: 'bold',
        textDecoration: 'none',
      }}
    >
      Get Started
    </Button>
  </EmailLayout>
)
```

```tsx
// src/lib/email/templates/ContactNotificationEmail.tsx
import { Text } from '@react-email/components'

import { EmailLayout } from './components/EmailLayout'

type ContactNotificationProps = {
  name: string
  email: string
  message: string
}

/** Sent to the business owner when someone submits a contact form. */
export const ContactNotificationEmail = ({ name, email, message }: ContactNotificationProps) => (
  <EmailLayout preview={`New contact from ${name}`}>
    <Text style={{ fontSize: '18px', fontWeight: 'bold', color: '#1a1a1a' }}>
      New Contact Form Submission
    </Text>
    <Text style={{ fontSize: '14px', color: '#4a4a4a' }}>
      <strong>From:</strong> {name} ({email})
    </Text>
    <Text style={{ fontSize: '14px', color: '#4a4a4a', lineHeight: '22px', whiteSpace: 'pre-wrap' as const }}>
      <strong>Message:</strong><br />
      {message}
    </Text>
  </EmailLayout>
)
```

### Step 5: Using in Server Actions

```typescript
// src/app/(marketing)/contact/_actions/submitContact.ts
'use server'

import { ContactSchema } from '@contracts/contact'
import { sendEmail } from '@/lib/email/send'
import { ContactNotificationEmail } from '@/lib/email/templates/ContactNotificationEmail'
import { env } from '@/lib/env'
import type { ServerActionResult } from '@contracts/common'

export const submitContact = async (
  _prevState: unknown,
  formData: FormData,
): ServerActionResult<{ sent: boolean }> => {
  const parsed = ContactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    message: formData.get('message'),
  })

  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please fix the errors below.',
        details: parsed.error.errors.map((e) => ({ path: e.path, message: e.message })),
      },
    }
  }

  // Send notification to business owner
  const result = await sendEmail({
    to: env.EMAIL_FROM,  // Or a dedicated inbox
    subject: `Contact: ${parsed.data.name}`,
    template: ContactNotificationEmail(parsed.data),
    replyTo: parsed.data.email,  // Reply goes to the person who submitted
  })

  if (!result.ok) {
    return {
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to send your message. Please try again.' },
    }
  }

  return { ok: true, value: { sent: true } }
}
```

### Step 6: Preview Emails in Development

React Email includes a dev server for previewing templates:

```json
// package.json
{
  "scripts": {
    "email:dev": "email dev --dir src/lib/email/templates"
  }
}
```

```bash
pnpm email:dev
# Opens http://localhost:3001 — browse and preview all templates
```

---

## In-App Notifications (Sonner)

For toast notifications (success messages, error alerts, loading states):

### Setup

```tsx
// src/app/layout.tsx
import { Toaster } from 'sonner'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lang-depends-on-project"en">
      <body>
        {children}
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{
            className: 'font-sans',  // Uses project font
          }}
        />
      </body>
    </html>
  )
}
```

### Usage

```tsx
'use client'

import { toast } from 'sonner'

export const ContactForm = () => {
  const onSubmit = async (data: ContactInput) => {
    const result = await submitContact(data)

    if (result.ok) {
      toast.success('Message sent! We\'ll be in touch.')
    } else {
      toast.error(result.error.message)
    }
  }
  // ...
}

// Other toast types
toast.info('Your session will expire in 5 minutes.')
toast.warning('Some fields are incomplete.')
toast.loading('Saving changes...')
toast.promise(saveSettings(data), {
  loading: 'Saving...',
  success: 'Settings saved!',
  error: 'Failed to save settings.',
})
```

### Why Sonner Over react-hot-toast / react-toastify

| Factor | Sonner | react-hot-toast | react-toastify |
|--------|--------|----------------|---------------|
| Bundle size | ~5kB | ~5kB | ~35kB |
| Tailwind compatible | ✅ Native | ⚠️ Custom CSS | ⚠️ Custom CSS |
| Promise toasts | ✅ Built-in | ✅ Built-in | ✅ Built-in |
| Accessibility | ✅ ARIA live regions | ⚠️ Basic | ⚠️ Basic |
| Rich colors | ✅ Built-in | ❌ Manual | ✅ Built-in |
| shadcn/ui integration | ✅ Recommended by shadcn | ❌ No | ❌ No |

---

## Domain Verification (Production)

The free tier sends from `@resend.dev`. For production, verify your domain:

1. Go to [resend.com/domains](https://resend.com/domains)
2. Add your domain (e.g., `yourdomain.com`)
3. Add the DNS records Resend provides (SPF, DKIM, DMARC)
4. Update `EMAIL_FROM` to `hello@yourdomain.com`

**Without domain verification**: emails may land in spam. Always verify before production.

---

## Anti-Patterns

```tsx
// ❌ Sending email from Client Component
'use client'
const onSubmit = async () => {
  await resend.emails.send({ ... })  // API key exposed to browser!
}

// ✅ Send from Server Action or Route Handler
'use server'
const submitContact = async () => {
  await sendEmail({ ... })
}

// ❌ Raw HTML string template
const html = `<h1>Welcome ${name}</h1><p>Click <a href="${url}">here</a></p>`

// ✅ React Email component — type-safe, composable, previewable
const template = <WelcomeEmail name={name} loginUrl={url} />

// ❌ Sending real emails in development
// (Accidentally emailing real users from localhost)

// ✅ Dev mode logs instead of sending (when RESEND_API_KEY is not set)

// ❌ Ignoring send failures
await sendEmail({ ... })  // Fire and forget — no error handling

// ✅ Always check the result
const result = await sendEmail({ ... })
if (!result.ok) {
  logger.error('Email send failed', { to, subject }, result.error)
}
```

---

## Rationale

### Why Resend Over SendGrid / AWS SES

Resend has the best DX of any email provider — type-safe SDK, React Email integration (build templates as React components), and a generous free tier. SendGrid's API is older and less type-safe. AWS SES requires AWS account setup and IAM configuration. For a template that prioritizes DX and zero-config, Resend is the clear winner.

### Why React Email Over MJML / Handlebars

HTML email is broken by design — every email client renders differently (Outlook uses Word's HTML engine). React Email abstracts this away — you write React components, and they compile to cross-client HTML with inline styles. MJML is good but requires learning a new markup language. Handlebars templates are raw HTML strings with no type safety.

### Key Factors
1. **Free tier** — 3,000 emails/month covers most small-to-medium projects.
2. **React Email** — type-safe templates, previewable in dev, cross-client compatible.
3. **Dev mode safety** — no API key = no sending = no accidental emails.
4. **Sonner for toasts** — lightest, most Tailwind-compatible option, recommended by shadcn/ui.

## Options Considered

| Option | Description | Why Chosen / Why Not |
|--------|------------|---------------------|
| Resend | Modern email API + React Email | ✅ Chosen: best DX, free tier, React integration |
| SendGrid | Established email service | ❌ Older API, less type-safe, no React Email |
| AWS SES | High-volume cloud email | ❌ Complex setup, requires AWS account |
| Nodemailer | SMTP library | ❌ Requires SMTP server, no template system |
| Sonner | Toast notifications | ✅ Chosen: lightest, Tailwind-native, shadcn-recommended |
| react-hot-toast | Toast notifications | ❌ No rich colors, no Tailwind integration |
| react-toastify | Toast notifications | ❌ 35kB bundle, requires custom CSS |

---

## Consequences

**Positive:**
- Opt-in — zero overhead for projects without email.
- Free tier covers most projects (3,000 emails/month).
- React Email templates are type-safe, previewable, and cross-client.
- Development mode safely logs instead of sending.
- Sonner integrates with Tailwind and shadcn/ui seamlessly.
- `sendEmail()` wrapper returns `Result<T>` — consistent with project error handling.

**Negative:**
- Resend is a relatively new service — mitigated by being backed by the React Email team and having proven reliability.
- React Email adds dev dependency — mitigated by being opt-in.
- Domain verification required for production — mitigated by documenting the process.
- Email HTML is still fundamentally limited — mitigated by React Email handling cross-client quirks.

## Related ADRs

- [ADR-0006](./0006-environment.md) — Environment (RESEND_API_KEY, EMAIL_FROM)
- [ADR-0007](./0007-error-handling.md) — Error handling (Result<T> from sendEmail)
- [ADR-0012](./0012-forms.md) — Forms (contact form triggers email send)
- [ADR-0014](./0014-logging-observability.md) — Logging (email sends logged at info level)

