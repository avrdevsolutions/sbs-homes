# Contracts

> API-only types — the contract between frontend and backend.
> Page content and content types live in `src/content/`.

---

## Philosophy

- **API types only.** Request/response shapes, error codes, pagination wrappers, server action results.
- **No runtime code.** Only type declarations — no functions, no classes, no side effects.
- **No page content.** Static page copy, section content objects, and their types belong in `src/content/`.
- **Single source of truth.** If a type exists here, import from `@contracts/` instead of duplicating.

---

## Files

| File        | Purpose                                                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `common.ts` | Generic wrappers: `ErrorCode`, `ApiResponse<T>`, `ApiError`, `PaginatedResponse<T>`, `PaginationParams`, `PaginationMeta`, `Result<T, E>`, `ServerActionResult<T>` |

<!-- TODO: Add feature-specific API contract files as backend endpoints are defined. Example: -->
<!-- | `user.ts` | User domain types: `User`, `CreateUserRequest`, `UpdateUserRequest` | -->

---

## Usage

```typescript
import type {
  ApiResponse,
  ApiError,
  ErrorCode,
  PaginatedResponse,
  Result,
  ServerActionResult,
} from '@contracts/common'

// Route Handler — success
const response: ApiResponse<User> = { data: user }

// Route Handler — error (all known codes are typed via ErrorCode)
const error: ApiError = { code: 'NOT_FOUND', message: 'User not found' }

// Paginated list
const list: PaginatedResponse<User> = {
  data: users,
  pagination: { page: 1, limit: 20, total: 100, totalPages: 5 },
}

// Server Action — return Result, never throw
async function createUser(input: unknown): ServerActionResult<User> {
  const parsed = UserSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: { code: 'VALIDATION_ERROR', message: '...' } }
  const user = await db.user.create({ data: parsed.data })
  return { ok: true, value: user }
}
```

---

## Adding a New Contract

1. Create a new file: `contracts/<feature>.ts`
2. Import from `contracts/common.ts` if you need shared wrappers.
3. Export all types from the new file.
4. Document the new file in the table above.
5. Open a PR with **only** the contract change.

---

## Versioning & Breaking Changes

- A **breaking change** is any change that removes or renames an exported type, or changes a required field.
- Breaking changes must be labeled `breaking-change` in the PR and require CODEOWNER sign-off.
- Additive changes (new optional fields, new types) are non-breaking.
