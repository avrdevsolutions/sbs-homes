/**
 * Custom application error class.
 *
 * Single AppError class with ErrorCode parameter — no subclasses.
 * Use ErrorCode to distinguish error types, ErrorHttpStatus for status codes.
 *
 * See docs/adrs/0007-error-handling.md for the full strategy.
 */

import { ErrorCode, ErrorHttpStatus } from '@contracts/common'

import type { ApiError } from '@contracts/common'

/**
 * Single application error class.
 *
 * @example
 * throw new AppError(ErrorCode.NOT_FOUND, 'User not found')
 * throw new AppError(ErrorCode.FORBIDDEN, 'Admin access required')
 * throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid email', [
 *   { path: ['email'], message: 'Invalid email format' },
 * ])
 */
export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly details?: Array<{ path: (string | number)[]; message: string }>

  constructor(
    code: ErrorCode,
    message: string,
    details?: Array<{ path: (string | number)[]; message: string }>,
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = ErrorHttpStatus[code]
    this.details = details
    // Maintains proper stack trace in V8 environments
    Error.captureStackTrace?.(this, this.constructor)
  }

  /**
   * Convert to API error response shape (matches ApiError from contracts).
   */
  toJSON(): ApiError {
    return {
      code: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    }
  }
}

// =============================================================================
// Type guards
// =============================================================================

/**
 * Check if an error is an AppError instance.
 */
export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError
}

/**
 * Check if an error has a specific error code.
 */
export const hasErrorCode = (error: unknown, code: ErrorCode): boolean => {
  return isAppError(error) && error.code === code
}

// =============================================================================
// Helper: Convert AppError to NextResponse
// =============================================================================

/**
 * Handle an error in a Route Handler — converts to proper JSON response.
 *
 * @example
 * export const GET = async (request: NextRequest) => {
 *   try {
 *     // ...
 *   } catch (error) {
 *     return handleApiError(error)
 *   }
 * }
 */
export const handleApiError = (error: unknown) => {
  // Dynamic import to avoid circular dependency at module scope
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextResponse } = require('next/server')

  if (isAppError(error)) {
    return NextResponse.json(error.toJSON(), { status: error.statusCode })
  }

  // Unknown error — log and return generic 500
  console.error('[handleApiError] Unexpected error:', error)
  return NextResponse.json(
    { code: ErrorCode.INTERNAL_ERROR, message: 'An unexpected error occurred' },
    { status: 500 },
  )
}
