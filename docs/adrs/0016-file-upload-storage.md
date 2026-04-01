# ADR-0016: File Upload & Storage

**Status**: Accepted (opt-in — implement when needed)
**Date**: 2026-02-27
**Supersedes**: N/A

---

## Context

Many applications need file uploads — profile avatars, product images, document attachments, CMS media. The strategy must address: where files are stored (not the application server), how uploads are validated (type, size, malicious content), how files are served (CDN, optimized images), and how to handle the upload UX (progress, drag-and-drop, preview).

Next.js Server Actions have a 1MB body limit by default. Large file uploads require either increasing this limit or using presigned URLs (upload directly to storage, bypassing the server). This ADR covers both approaches.

## Decision

**UploadThing for managed uploads (recommended — zero infra). Presigned URLs to S3/R2 for self-managed storage. Server-side validation on all uploads. `next/image` for serving optimized images from storage.**

---

## When to Add File Upload

```
Does the project need user-uploaded images (avatars, covers, galleries)?
  → YES: Add UploadThing (simplest) or S3/R2 (most control)
Does the project need document uploads (PDFs, spreadsheets)?
  → YES: Add UploadThing or S3/R2
Does the project only need static images (logos, icons, marketing)?
  → NO upload needed — put them in public/ and use next/image
Is the project a CMS that needs a media library?
  → YES: Add S3/R2 with presigned URLs (more control over organization)
```

---

## Rules

| Rule | Level |
|------|-------|
| Validate file type on the server — never trust client-side type checks | **MUST** |
| Validate file size on the server — enforce maximum per file and per request | **MUST** |
| Store files in object storage (S3, R2, UploadThing) — never in the app's filesystem | **MUST** |
| Never store files in the database (blobs) — store URLs/keys only | **MUST** |
| Serve images through `next/image` for automatic optimization (resize, WebP, CDN) | **MUST** |
| Generate unique file names (UUID) — never use user-provided filenames (path traversal risk) | **MUST** |
| Set `Content-Disposition` headers on downloads to prevent XSS from uploaded HTML/SVG | **MUST** |
| Log upload events at `info` level (ADR-0014) — file name, size, type, user ID | **MUST** |
| Never log file contents | **MUST NOT** |
| Show upload progress for files >1MB | **SHOULD** |
| Provide drag-and-drop upload UX | **SHOULD** |
| Preview images before upload | **SHOULD** |
| Clean up orphaned files (uploaded but never referenced) | **SHOULD** |

---

## Provider Comparison

| Provider | Free Tier | Setup | CDN | Best For |
|----------|-----------|-------|-----|----------|
| **UploadThing** | 2GB storage, 2GB transfer/month | ⭐⭐⭐⭐⭐ Zero config | ✅ Built-in | Most projects — zero infra |
| **Cloudflare R2** | 10GB storage, free egress | ⭐⭐⭐ S3-compatible | ✅ Cloudflare CDN | Cost-sensitive, high traffic |
| **AWS S3** | 5GB storage (12 months) | ⭐⭐ AWS console | ⚠️ CloudFront needed | Enterprise, AWS ecosystem |
| **Vercel Blob** | 256MB (Hobby) | ⭐⭐⭐⭐ | ✅ Vercel Edge | Small files, Vercel-native |
| **Supabase Storage** | 1GB storage | ⭐⭐⭐⭐ | ✅ Built-in CDN | Projects using Supabase |

---

## Option A: UploadThing (Recommended — Zero Infra)

### Installation

```bash
pnpm add uploadthing @uploadthing/react
```

### File Structure

```
src/
  lib/upload/
    index.ts                    # UploadThing client
  app/api/uploadthing/
    core.ts                     # File router (validation rules)
    route.ts                    # Route Handler
```

### Server Configuration

```typescript
// src/app/api/uploadthing/core.ts
import { createUploadthing, type FileRouter } from 'uploadthing/next'
import { UploadThingError } from 'uploadthing/server'

import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'

const f = createUploadthing()

export const uploadRouter = {
  /** Avatar upload — authenticated users, max 2MB, images only */
  avatar: f({ image: { maxFileSize: '2MB', maxFileCount: 1 } })
    .middleware(async () => {
      const session = await auth()
      if (!session?.user) throw new UploadThingError('Unauthorized')
      return { userId: session.user.id }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      logger.info('Avatar uploaded', {
        userId: metadata.userId,
        fileName: file.name,
        fileSize: file.size,
        fileUrl: file.url,
      })
      // Optionally update user record with new avatar URL
      // await db.user.update({ where: { id: metadata.userId }, data: { avatarUrl: file.url } })
      return { url: file.url }
    }),

  /** Document upload — authenticated users, max 10MB, PDFs only */
  document: f({ pdf: { maxFileSize: '10MB', maxFileCount: 5 } })
    .middleware(async () => {
      const session = await auth()
      if (!session?.user) throw new UploadThingError('Unauthorized')
      return { userId: session.user.id }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      logger.info('Document uploaded', {
        userId: metadata.userId,
        fileName: file.name,
        fileSize: file.size,
      })
      return { url: file.url }
    }),

  /** CMS media — admin only, max 8MB images */
  cmsMedia: f({ image: { maxFileSize: '8MB', maxFileCount: 10 } })
    .middleware(async () => {
      const session = await auth()
      if (!session?.user || session.user.role !== 'ADMIN') {
        throw new UploadThingError('Admin access required')
      }
      return { userId: session.user.id }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      logger.info('CMS media uploaded', {
        userId: metadata.userId,
        fileName: file.name,
        fileSize: file.size,
      })
      return { url: file.url }
    }),
} satisfies FileRouter

export type UploadRouter = typeof uploadRouter
```

```typescript
// src/app/api/uploadthing/route.ts
import { createRouteHandler } from 'uploadthing/next'

import { uploadRouter } from './core'

export const { GET, POST } = createRouteHandler({ router: uploadRouter })
```

### Client Upload Component

```tsx
// src/lib/upload/index.ts
import { generateReactHelpers } from '@uploadthing/react'

import type { UploadRouter } from '@/app/api/uploadthing/core'

export const { useUploadThing, uploadFiles } = generateReactHelpers<UploadRouter>()
```

```tsx
// src/components/features/avatar-upload/AvatarUpload.tsx
'use client'

import { useState, useCallback } from 'react'

import Image from 'next/image'

import { useUploadThing } from '@/lib/upload'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type AvatarUploadProps = {
  currentUrl?: string
  onUploadComplete: (url: string) => void
}

export const AvatarUpload = ({ currentUrl, onUploadComplete }: AvatarUploadProps) => {
  const [preview, setPreview] = useState<string | null>(null)

  const { startUpload, isUploading } = useUploadThing('avatar', {
    onClientUploadComplete: (files) => {
      const url = files[0]?.url
      if (url) {
        onUploadComplete(url)
        toast.success('Avatar updated!')
      }
    },
    onUploadError: (error) => {
      toast.error(error.message)
    },
  })

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      // Client-side preview (instant feedback)
      const objectUrl = URL.createObjectURL(file)
      setPreview(objectUrl)

      await startUpload([file])
    },
    [startUpload],
  )

  const displayUrl = preview || currentUrl

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-16 w-16 overflow-hidden rounded-full bg-primary-100">
        {displayUrl && (
          <Image src={displayUrl} alt="Avatar" fill className="object-cover" />
        )}
      </div>
      <label className={cn(
        'cursor-pointer rounded-md border border-primary-300 px-3 py-1.5 text-sm font-medium',
        'hover:bg-primary-50 transition-colors',
        isUploading && 'opacity-50 cursor-not-allowed',
      )}>
        {isUploading ? 'Uploading...' : 'Change Avatar'}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </label>
    </div>
  )
}
```

---

## Option B: Presigned URLs (S3 / Cloudflare R2)

For full control over storage, use presigned URLs. The flow:

```
1. Client requests upload URL from your API
2. Server generates presigned URL (valid for ~5 min)
3. Client uploads directly to S3/R2 (bypasses your server — no body size limit)
4. Server confirms upload and stores the file reference
```

### Installation (Cloudflare R2 — recommended for free egress)

```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

R2 uses the S3-compatible API — same SDK, different endpoint.

### Environment Variables

```dotenv
# Cloudflare R2
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_BUCKET=my-app-uploads
S3_ACCESS_KEY_ID=xxx
S3_SECRET_ACCESS_KEY=xxx
S3_PUBLIC_URL=https://pub-xxx.r2.dev  # or your custom domain
```

### Server: Generate Presigned URL

```typescript
// src/app/api/upload/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { z } from 'zod'

import { auth } from '@/lib/auth'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

const s3 = new S3Client({
  region: 'auto',
  endpoint: env.S3_ENDPOINT,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
})

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

const UploadRequestSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().refine((t) => ALLOWED_TYPES.includes(t), 'File type not allowed'),
  fileSize: z.number().max(MAX_SIZE, 'File too large (max 10MB)'),
})

export const POST = async (request: NextRequest) => {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Sign in required' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = UploadRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid upload request', details: parsed.error.errors },
      { status: 400 },
    )
  }

  // Generate unique key (never use user-provided filenames)
  const ext = parsed.data.fileName.split('.').pop() || 'bin'
  const key = `uploads/${session.user.id}/${crypto.randomUUID()}.${ext}`

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: parsed.data.fileType,
    ContentLength: parsed.data.fileSize,
  })

  const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 300 }) // 5 minutes

  logger.info('Presigned URL generated', {
    userId: session.user.id,
    key,
    fileType: parsed.data.fileType,
    fileSize: parsed.data.fileSize,
  })

  return NextResponse.json({
    data: {
      uploadUrl: presignedUrl,
      fileUrl: `${env.S3_PUBLIC_URL}/${key}`,
      key,
    },
  })
}
```

### Client: Upload with Progress

```typescript
// src/lib/upload/s3-upload.ts

type UploadParams = {
  file: File
  onProgress?: (percent: number) => void
}

type UploadResult = {
  url: string
  key: string
}

export const uploadFile = async ({ file, onProgress }: UploadParams): Promise<UploadResult> => {
  // 1. Get presigned URL from our API
  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to get upload URL')
  }

  const { data } = await response.json()

  // 2. Upload directly to S3/R2 with progress tracking
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', data.uploadUrl)
    xhr.setRequestHeader('Content-Type', file.type)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload failed: ${xhr.status}`))
    }

    xhr.onerror = () => reject(new Error('Upload failed'))
    xhr.send(file)
  })

  return { url: data.fileUrl, key: data.key }
}
```

---

## Serving Images with `next/image`

All user-uploaded images MUST be served through `next/image` for automatic optimization:

```javascript
// next.config.js — add remote patterns for your storage
const nextConfig = {
  images: {
    remotePatterns: [
      // UploadThing
      { protocol: 'https', hostname: 'utfs.io' },
      // Cloudflare R2
      { protocol: 'https', hostname: 'pub-xxx.r2.dev' },
      // AWS S3
      { protocol: 'https', hostname: 'my-bucket.s3.amazonaws.com' },
    ],
  },
}
```

```tsx
// ✅ Optimized — next/image handles resize, format (WebP), CDN caching
import Image from 'next/image'

<Image
  src={user.avatarUrl}
  alt={`${user.name}'s avatar`}
  width={64}
  height={64}
  className="rounded-full object-cover"
/>

// ❌ Unoptimized — raw <img> tag, no resize, no WebP, no CDN
<img src={user.avatarUrl} alt="avatar" />
```

---

## Security Checklist

- [ ] File type validated on the server (not just file extension — check magic bytes for critical apps)
- [ ] File size enforced on the server
- [ ] File names are UUID-generated (never user-provided)
- [ ] Uploaded files are stored in object storage (not filesystem)
- [ ] Presigned URLs expire (≤5 minutes)
- [ ] Upload endpoints require authentication
- [ ] Admin-only uploads require role check
- [ ] `Content-Disposition: attachment` set on non-image downloads (prevents XSS from SVG/HTML uploads)
- [ ] `next/image` remote patterns whitelist only your storage domains

---

## Anti-Patterns

```typescript
// ❌ Storing files in the database
await db.file.create({ data: { content: fileBuffer } })  // DB is not a file system!

// ✅ Store URL/key only
await db.file.create({ data: { url: 'https://...', key: 'uploads/...' } })

// ❌ Using user-provided filenames (path traversal risk)
const key = `uploads/${file.name}`  // Could be '../../../etc/passwd'

// ✅ Generate unique names
const key = `uploads/${userId}/${crypto.randomUUID()}.${ext}`

// ❌ Trusting client-side file type checks
if (file.type === 'image/jpeg') { ... }  // User can spoof Content-Type

// ✅ Validate on the server
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
if (!ALLOWED.includes(parsed.data.fileType)) return error

// ❌ No auth on upload endpoint
export const POST = async (request: NextRequest) => {
  // Anyone can upload!
}

// ✅ Always verify authentication
export const POST = async (request: NextRequest) => {
  const session = await auth()
  if (!session?.user) return unauthorized()
}
```

---

## Rationale

### Why UploadThing as Default Recommendation

UploadThing provides zero-infrastructure file uploads — no S3 bucket setup, no IAM policies, no CDN configuration. The file router pattern (type-safe, validated, authenticated) matches our project conventions. The 2GB free tier is sufficient for most projects. For projects that need more control or lower costs at scale, S3/R2 with presigned URLs is the documented alternative.

### Why Presigned URLs Over Server Proxy

Uploading through the server (multipart form → server → S3) has a fundamental limitation: the server must buffer the entire file in memory, and Next.js Server Actions have a 1MB default body limit. Presigned URLs let the client upload directly to storage, bypassing the server entirely. The server only validates and generates the URL.

### Key Factors
1. **Free tier** — UploadThing (2GB) and R2 (10GB + free egress) cover most projects.
2. **Security** — server-side validation, UUID filenames, auth required, presigned URL expiry.
3. **Performance** — presigned URLs bypass server for large files; `next/image` optimizes delivery.
4. **DX** — UploadThing's file router is type-safe and co-located with auth middleware.

## Options Considered

| Option | Description | Why Chosen / Why Not |
|--------|------------|---------------------|
| UploadThing | Managed upload service | ✅ Chosen: zero infra, type-safe, free tier |
| Cloudflare R2 | S3-compatible storage (free egress) | ✅ Chosen as alternative: cheapest at scale |
| AWS S3 | Industry-standard object storage | ⚠️ Documented: complex setup, egress costs |
| Vercel Blob | Vercel-native storage | ❌ Very small free tier (256MB), vendor lock-in |
| Server filesystem | `fs.writeFile()` | ❌ Forbidden: lost on deploy, no CDN, no scaling |
| Database BLOB | Store file in DB | ❌ Forbidden: databases are not file systems |

---

## Consequences

**Positive:**
- Opt-in — zero overhead for projects without uploads.
- UploadThing requires zero infrastructure setup.
- Presigned URLs bypass server for large files — no memory pressure.
- `next/image` automatically optimizes and CDN-caches uploaded images.
- Type-safe file router enforces validation at the framework level.
- UUID filenames prevent path traversal attacks.

**Negative:**
- UploadThing is a third-party dependency — mitigated by documenting S3/R2 as alternative.
- Presigned URL approach requires two requests (get URL + upload) — mitigated by being transparent to the user.
- Orphaned files (uploaded but never saved to DB) accumulate — mitigated by periodic cleanup jobs.
- `next/image` requires `remotePatterns` config — mitigated by documenting the pattern.

## Related ADRs

- [ADR-0001](./0001-architecture.md) — Architecture (next.config.js `images.remotePatterns`)
- [ADR-0010](./0010-authentication.md) — Authentication (upload endpoints require auth)
- [ADR-0014](./0014-logging-observability.md) — Logging (upload events logged at info level)

