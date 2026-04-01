/**
 * contracts/common.ts
 *
 * Generic API contract types shared across all apps.
 * Extend these in feature-specific contract files; do not modify this file
 * for feature-specific concerns.
 *
 * See docs/adrs/0005-data-fetching.md for the full strategy.
 */

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

/**
 * Machine-readable error codes.
 * The const object provides both a runtime value and a TypeScript type.
 *
 * Usage as VALUE:  ErrorCode.NOT_FOUND        → 'NOT_FOUND'
 * Usage as TYPE:   code: ErrorCode            → 'NOT_FOUND' | 'UNAUTHORIZED' | ...
 * Runtime check:   Object.values(ErrorCode)   → ['VALIDATION_ERROR', 'NOT_FOUND', ...]
 *
 * See docs/adrs/0007-error-handling.md for rationale (const object over enum).
 */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',       // 400 — Zod parse failed
  BAD_REQUEST: 'BAD_REQUEST',                 // 400 — Malformed request (not validation)
  UNAUTHORIZED: 'UNAUTHORIZED',               // 401 — No valid session/token
  FORBIDDEN: 'FORBIDDEN',                     // 403 — Authenticated but insufficient permissions
  NOT_FOUND: 'NOT_FOUND',                     // 404 — Resource does not exist
  CONFLICT: 'CONFLICT',                       // 409 — Duplicate resource (e.g., email taken)
  RATE_LIMITED: 'RATE_LIMITED',               // 429 — Too many requests
  INTERNAL_ERROR: 'INTERNAL_ERROR',           // 500 — Unexpected server error
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE', // 503 — Downstream service unreachable
} as const

/** Type derived from the const object — use this in type positions. */
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

/**
 * Maps each ErrorCode to its HTTP status code.
 * Single source of truth — used by AppError class and handleApiError().
 */
export const ErrorHttpStatus: Record<ErrorCode, number> = {
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
}

// ---------------------------------------------------------------------------
// Success wrapper
// ---------------------------------------------------------------------------

/**
 * Standard envelope for a successful API response.
 *
 * @example
 * const res: ApiResponse<User> = { data: { id: '1', name: 'Alice' } }
 */
export type ApiResponse<T> = {
  data: T
  /** Optional human-readable message (e.g. "Created successfully"). */
  message?: string
}

// ---------------------------------------------------------------------------
// Error wrapper
// ---------------------------------------------------------------------------

/**
 * Standard envelope for an API error response.
 * Route Handlers MUST return this shape for all non-2xx responses.
 *
 * @example
 * return NextResponse.json(
 *   { code: 'NOT_FOUND', message: 'User not found' } satisfies ApiError,
 *   { status: 404 }
 * )
 */
export type ApiError = {
  /** Machine-readable error code — MUST be one of ErrorCode. */
  code: ErrorCode
  /** Human-readable error message suitable for logging. */
  message: string
  /**
   * Optional field-level validation details.
   * Populated when code === 'VALIDATION_ERROR'.
   * Shape matches Zod's `error.errors` array.
   */
  details?: Array<{ path: (string | number)[]; message: string }>
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

/**
 * Request query parameters for paginated list endpoints.
 * Default strategy: offset-based (page + limit).
 * See ADR-0005 for cursor-based migration path.
 */
export type PaginationParams = {
  /** Page number (1-indexed). Default: 1 */
  page?: number
  /** Items per page. Default: 20. Max: 100. */
  limit?: number
}

/**
 * Pagination metadata returned with every list response.
 */
export type PaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
}

/**
 * Standard envelope for a paginated list response.
 *
 * @example
 * const res: PaginatedResponse<User> = {
 *   data: [...],
 *   pagination: { page: 1, limit: 20, total: 100, totalPages: 5 },
 * }
 */
export type PaginatedResponse<T> = {
  data: T[]
  pagination: PaginationMeta
}

// ---------------------------------------------------------------------------
// Result type (Server Actions + functional error handling)
// ---------------------------------------------------------------------------

/**
 * Discriminated union for operations that can succeed or fail without throwing.
 * MUST be used as the return type of all Server Actions.
 *
 * @example
 * async function createUser(input: unknown): Promise<Result<User>> {
 *   const parsed = UserSchema.safeParse(input)
 *   if (!parsed.success) return { ok: false, error: { code: 'VALIDATION_ERROR', message: '...' } }
 *   const user = await db.user.create(...)
 *   return { ok: true, value: user }
 * }
 */
export type Result<T, E extends ApiError = ApiError> =
  | { ok: true; value: T }
  | { ok: false; error: E }

/**
 * Convenience alias — use this as the return type of Server Actions.
 *
 * @example
 * export async function submitForm(data: FormData): ServerActionResult<User> { ... }
 */
export type ServerActionResult<T> = Promise<Result<T>>

// ---------------------------------------------------------------------------
// Utility types
// ---------------------------------------------------------------------------

/**
 * ISO 8601 timestamp string.
 * Use for all date/time fields in API contracts.
 */
export type Timestamp = string

/**
 * HTTP method for Route Handlers.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

/**
 * Sort direction for paginated list endpoints.
 */
export type SortDirection = 'asc' | 'desc'

/**
 * Extended pagination params with sorting.
 */
export type SortablePaginationParams = PaginationParams & {
  sortBy?: string
  sortDirection?: SortDirection
}

// ---------------------------------------------------------------------------
// Zod schema re-exports (define schemas in feature-specific contract files)
// ---------------------------------------------------------------------------
// Example usage in feature contracts:
//
// import { z } from 'zod'
// export const UserSchema = z.object({ ... })
// export type User = z.infer<typeof UserSchema>

