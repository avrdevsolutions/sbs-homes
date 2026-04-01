---
name: sanity-cms-caching-revalidation
description: >-
  Sanity CMS two-layer cache architecture and revalidation — Next.js Data Cache
  plus Sanity CDN interaction diagram, tag-based vs time-based revalidation
  decision tree, revalidation cheat sheet by Sanity content type (post, project,
  settings, FAQ, legal), complete webhook POST handler with parseBody HMAC
  signature validation and waitForContentLakeEvent, webhook security requirements
  table, Sanity dashboard webhook config field-by-field. Use when implementing
  Sanity cache invalidation, wiring the Next.js revalidation webhook handler for
  Sanity, choosing between tag-based and time-based caching for Sanity content
  types, setting revalidate intervals by content change frequency, or debugging
  stale content after an editor publishes in Sanity.
---

# Sanity CMS — Caching & Revalidation

**Compiled from**: ADR-0032 Parts 5–6 (Caching & Revalidation, Webhook Handler Route)
**Last synced**: 2026-03-31

---

## Two Cache Layers

```
Browser ──► Next.js Data Cache ──► Sanity CDN ──► Content Lake
             (tags / revalidate)     (useCdn: true)
```

| Layer             | Controlled By                   | Invalidated By                                              |
| ----------------- | ------------------------------- | ----------------------------------------------------------- |
| **Sanity CDN**    | `useCdn: true` (default)        | Automatic — propagates within seconds of mutation           |
| **Next.js Cache** | `next.tags` / `next.revalidate` | `revalidateTag()` / `revalidatePath()` from webhook handler |

**Critical**: In Next.js 15, `fetch` is **not cached by default**. Every `sanityFetch` call must set explicit `next.revalidate` or `next.tags`. `tags` and `revalidate` are mutually exclusive — when `tags` are set, `revalidate` must be `false`.

---

## Cache Strategy Decision Tree

```
Is the content user-specific or session-dependent?
├── Yes → cache: 'no-store' — rare for CMS content
│
└── No → Is webhook-based revalidation set up?
    ├── Yes → Tag-based revalidation (PREFERRED)
    │         • Tags: use document _type as tag (e.g., 'post', 'project')
    │         • Set revalidate: false (tags handle invalidation)
    │         • Webhook calls revalidateTag(body._type)
    │
    └── No → Time-based revalidation (FALLBACK)
              ├── Content changes frequently (blog drafts)  → revalidate: 30–60
              ├── Content changes daily (portfolio)         → revalidate: 3600
              ├── Content rarely changes (legal, about)     → revalidate: 86400
              └── Changes only on editor publish            → revalidate: false (manual)
```

---

## Tag-Based Revalidation Pattern

With `defineLive`, caching and tagging is automatic. With the manual helper:

```typescript
// Tags = document types that the query touches
const { data } = await sanityFetch({
  query: POSTS_QUERY,
  tags: ['post', 'author'], // Invalidate when any post or author changes
  // revalidate: false is implicit when tags are set (mutually exclusive in Next.js)
})
```

When a webhook fires with `{ _type: 'post' }`, calling `revalidateTag('post')` invalidates all queries tagged `'post'`.

---

## Revalidation Cheat Sheet

| Sanity Content Type     | Strategy            | Tags                      | `revalidate`  |
| ----------------------- | ------------------- | ------------------------- | ------------- |
| Blog posts list         | Tag-based           | `['post']`                | `false`       |
| Single blog post        | Tag-based           | `['post', 'author']`      | `false`       |
| Site settings singleton | Tag-based           | `['siteSettings']`        | `false`       |
| Project portfolio       | Tag-based           | `['project', 'category']` | `false`       |
| FAQ page                | Tag-based           | `['faq']`                 | `false`       |
| Rarely updated legal    | Time-based fallback | —                         | `86400` (24h) |

---

## Webhook Handler Route

The webhook handler is the server-side endpoint Sanity calls when content changes. It validates the request HMAC signature and triggers cache invalidation.

### Complete Handler (`src/app/api/revalidate/route.ts`)

```typescript
import { revalidateTag } from 'next/cache'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { parseBody } from 'next-sanity/webhook'

type WebhookPayload = {
  _type: string
}

export const POST = async (req: NextRequest) => {
  try {
    const secret = process.env.SANITY_REVALIDATE_SECRET
    if (!secret) {
      return new Response('Missing SANITY_REVALIDATE_SECRET', { status: 500 })
    }

    const { isValidSignature, body } = await parseBody<WebhookPayload>(
      req,
      secret,
      true, // waitForContentLakeEvent — prevents stale CDN reads when useCdn: true
    )

    if (!isValidSignature) {
      return new Response(JSON.stringify({ message: 'Invalid signature', isValidSignature }), {
        status: 401,
      })
    }

    if (!body?._type) {
      return new Response(JSON.stringify({ message: 'Bad request — missing _type', body }), {
        status: 400,
      })
    }

    revalidateTag(body._type)

    return NextResponse.json({
      revalidated: true,
      tag: body._type,
      now: Date.now(),
    })
  } catch (err: unknown) {
    console.error('Webhook handler error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(message, { status: 500 })
  }
}
```

### Security Requirements

| Requirement                   | Implementation                                         |
| ----------------------------- | ------------------------------------------------------ |
| Signature validation          | `parseBody` verifies HMAC — **never skip**             |
| Strong secret                 | `openssl rand -base64 32` — minimum 32 characters      |
| Secret out of version control | `.env.local` locally, hosting provider secrets in prod |
| `waitForContentLakeEvent`     | Always `true` when `useCdn: true` — avoids stale reads |
| Rate limiting                 | Infrastructure-level (Vercel/Cloudflare) recommended   |

### Webhook Dashboard Config (Sanity Side)

| Field       | Value                                      |
| ----------- | ------------------------------------------ |
| URL         | `https://your-domain.com/api/revalidate`   |
| Events      | Create, Update, Delete                     |
| Filter      | `_type in ["post", "project", "faq", ...]` |
| Projection  | `{_type}`                                  |
| Secret      | Same value as `SANITY_REVALIDATE_SECRET`   |
| HTTP method | POST                                       |

---

## Anti-Patterns

| Anti-Pattern                                   | Why It's Wrong                                              | Correct Pattern                                            |
| ---------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------- |
| No cache option on CMS fetches                 | Next.js 15 doesn't cache by default — hits API every render | Always set `tags` or `revalidate` explicitly               |
| `tags` AND `revalidate` on same fetch          | Mutually exclusive — tag wins, `revalidate` is ignored      | Use `tags` with `revalidate: false`, or `revalidate` alone |
| `revalidate: 1` as "always fresh"              | Creates thundering herd — use `cache: 'no-store'` instead   | `no-store` for truly dynamic, or reasonable intervals      |
| Revalidating without `waitForContentLakeEvent` | Webhook fires before CDN propagates → fetches stale data    | Always pass `true` as third arg to `parseBody`             |
| Skipping webhook signature validation          | Anyone can trigger revalidation                             | Always validate with `parseBody`                           |
