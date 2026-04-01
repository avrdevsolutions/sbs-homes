# ADR-0022: TypeScript & JavaScript Runtime Patterns

**Status**: Accepted
**Date**: 2026-03-03
**Supersedes**: N/A

---

## Context

ADR-0001 establishes TypeScript `strict: true`, the `const` object pattern, type imports, and naming conventions. ADR-0007 defines `Result<T>` and the `satisfies` operator for API contracts. ADR-0021 covers React hooks and memoization patterns. But no ADR consolidates the **TypeScript type patterns** and **JavaScript runtime patterns** that every file in the project uses. TypeScript adds types but the runtime is still JavaScript — and agents frequently produce code with stale closures, mutated arrays, swallowed promises, imprecise type narrowing, and other JS/TS footguns that type checking alone cannot catch.

This ADR is the "how we write TypeScript and handle JavaScript runtime behaviors" reference. It does not duplicate patterns already covered in other ADRs — it cross-references them and fills the gaps.

## Decision

**Mandatory TypeScript type patterns (discriminated unions, `satisfies`, `unknown`, exhaustive switches, utility types, branded types, generics). Mandatory JavaScript runtime patterns (immutability, async/await, equality, closures, error narrowing, iteration, destructuring, date handling). All enforced by convention and documented with correct/incorrect examples.**

---

## Part 1: TypeScript Type Patterns

### 1.1 `type` vs `interface`

**Use `type` by default. Use `interface` only for public API contracts that consumers may extend.**

| Use Case | Choice | Why |
|----------|--------|-----|
| Component props | `type` | Props are consumed, not extended |
| Function parameters | `type` | Parameters are consumed, not extended |
| API response shapes | `type` | Defined once in `contracts/`, not extended |
| Union types | `type` | Interfaces can't express unions |
| Mapped/conditional types | `type` | Interfaces can't express these |
| Library plugin interfaces (rare) | `interface` | Consumers need declaration merging |
| Class contracts | `interface` | `implements` reads naturally |

```typescript
// ✅ Correct — type for props, unions, intersections
type ButtonProps = {
  variant: 'primary' | 'secondary' | 'ghost'
  size: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

type ApiResult = Success | Failure   // Union — interface can't do this

// ✅ Correct — interface for a contract that may be extended
interface Logger {
  info(message: string, context?: Record<string, unknown>): void
  error(message: string, error?: unknown): void
}

// ❌ Avoid — interface for props (no extension needed)
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost'
}
```

**Rationale**: `type` is more versatile (unions, intersections, mapped types, conditional types). `interface` adds declaration merging, which is a footgun in app code (accidentally re-opening a type) but useful for libraries. In this project, we're writing app code — `type` is the default.

### 1.2 `unknown` vs `any`

**Use `unknown` for values of uncertain type. `any` is forbidden unless explicitly annotated.**

`unknown` is the type-safe counterpart of `any`. Both accept any value, but `unknown` forces you to narrow before use — `any` silently disables all type checking.

```typescript
// ✅ Correct — unknown forces narrowing
const parseInput = (input: unknown): string => {
  if (typeof input === 'string') return input        // Narrowed to string
  if (typeof input === 'number') return String(input) // Narrowed to number
  throw new Error('Expected string or number')
}

// ✅ Correct — unknown in catch blocks (TypeScript default since 4.4 with useUnknownInCatchVariables)
try {
  await fetchData()
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error(error.message)   // Narrowed — safe access
  } else {
    console.error('Unknown error', error)
  }
}

// ❌ Forbidden — any disables type safety silently
const parseInput = (input: any): string => {
  return input.toString()  // No error if input is null/undefined — runtime crash
}

// ❌ Forbidden — any in catch
try {
  await fetchData()
} catch (error: any) {
  console.error(error.message)  // Crashes if error isn't an Error object
}
```

| Rule | Level |
|------|-------|
| Use `unknown` for values of uncertain type | **MUST** |
| Narrow `unknown` before accessing properties (type guards, `instanceof`, `typeof`) | **MUST** |
| `any` forbidden unless annotated with `// TODO: type — [reason]` | **MUST NOT** |

### 1.3 Discriminated Unions

A discriminated union uses a literal field (the "discriminant") to let TypeScript narrow the type in each branch. `Result<T>` in `contracts/common.ts` is an example — `ok: true` narrows to the success branch, `ok: false` narrows to the error branch.

**Use discriminated unions for any value that can be in one of several distinct states.**

```typescript
// ✅ Correct — discriminated union for component state
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string }

const renderState = <T,>(state: AsyncState<T>) => {
  switch (state.status) {
    case 'idle':
      return null
    case 'loading':
      return <Spinner />
    case 'success':
      return <DataView data={state.data} />   // TS knows data exists here
    case 'error':
      return <ErrorView message={state.error} /> // TS knows error exists here
  }
}

// ✅ Correct — event/action types for reducers (see ADR-0020 for useReducer examples)
type Action =
  | { type: 'INCREMENT'; amount: number }
  | { type: 'DECREMENT'; amount: number }
  | { type: 'RESET' }

// ❌ Avoid — optional fields instead of discriminant
type AsyncState<T> = {
  isLoading: boolean
  data?: T          // When is this available? No type-level guarantee
  error?: string    // Can data and error both be set? Yes — that's a bug
}
```

**Cross-reference**: `Result<T>` in [contracts/common.ts](../../contracts/common.ts) — the canonical discriminated union in this project.

### 1.4 Exhaustive `switch` with `never`

When switching on a discriminated union, add a `default` case that assigns to `never`. If a new variant is added to the union but not handled, TypeScript will error at compile time.

```typescript
// ✅ Correct — exhaustive switch, compile error if variant is missed
const getStatusColor = (status: 'active' | 'inactive' | 'pending'): string => {
  switch (status) {
    case 'active':
      return 'text-success-600'
    case 'inactive':
      return 'text-foreground/50'
    case 'pending':
      return 'text-warning-600'
    default: {
      const _exhaustive: never = status
      // If someone adds 'archived' to the union, this line errors:
      // Type 'archived' is not assignable to type 'never'
      return _exhaustive
    }
  }
}

// ❌ Avoid — non-exhaustive switch, new variants silently fall through
const getStatusColor = (status: 'active' | 'inactive' | 'pending'): string => {
  switch (status) {
    case 'active':
      return 'text-success-600'
    case 'inactive':
      return 'text-foreground/50'
    default:
      return 'text-foreground'  // 'pending' silently gets default treatment
  }
}
```

| Rule | Level |
|------|-------|
| Use exhaustive switches with `never` for discriminated unions | **MUST** |
| Use exhaustive switches for `ErrorCode` handling, action types, status enums | **MUST** |

### 1.5 The `satisfies` Operator

`satisfies` validates that a value conforms to a type **without widening it**. The value retains its literal types while being checked against the constraint.

```typescript
import type { ApiError } from '@contracts/common'
import { ErrorCode, ErrorHttpStatus } from '@contracts/common'

// ✅ Correct — satisfies checks the shape, preserves literal types
const error = {
  code: ErrorCode.NOT_FOUND,
  message: 'User not found',
} satisfies ApiError
// error.code is typed as 'NOT_FOUND', not ErrorCode (the union)

// ❌ Avoid — type annotation widens to the full union
const error: ApiError = {
  code: ErrorCode.NOT_FOUND,
  message: 'User not found',
}
// error.code is typed as ErrorCode (the full union), not 'NOT_FOUND'

// ✅ Correct — config objects with satisfies
const routes = {
  home: '/',
  dashboard: '/dashboard',
  settings: '/settings',
} satisfies Record<string, string>
// routes.home is typed as '/' (literal), not string
// Autocomplete works: routes.home, routes.dashboard, routes.settings

// ❌ Avoid — type annotation loses literal types
const routes: Record<string, string> = {
  home: '/',
  dashboard: '/dashboard',
  settings: '/settings',
}
// routes.home is typed as string — no autocomplete for specific routes
```

**Cross-reference**: ADR-0007 uses `satisfies ApiError` in Route Handlers. Use the same pattern for all typed object literals.

| Rule | Level |
|------|-------|
| Use `satisfies` when validating object shape while preserving literal types | **SHOULD** |
| Use type annotation (`: Type`) when you intentionally want widening | **MAY** |

### 1.6 Utility Types

TypeScript's built-in utility types eliminate boilerplate. Use them instead of manually rewriting types.

```typescript
// ✅ Pick — select specific fields from a type
type UserSummary = Pick<User, 'id' | 'name' | 'avatarUrl'>

// ✅ Omit — exclude fields from a type
type CreateUserInput = Omit<User, 'id' | 'createdAt' | 'updatedAt'>

// ✅ Partial — make all fields optional (for patch/update operations)
type UpdateUserInput = Partial<Omit<User, 'id'>>

// ✅ Required — make all fields required
type CompleteProfile = Required<UserProfile>

// ✅ Record — typed key-value map
type PermissionMap = Record<Role, Permission[]>

// ✅ Extract / Exclude — narrow union types
type WritableErrorCode = Exclude<ErrorCode, 'INTERNAL_ERROR' | 'SERVICE_UNAVAILABLE'>
type ClientErrorCode = Extract<ErrorCode, 'VALIDATION_ERROR' | 'BAD_REQUEST' | 'NOT_FOUND'>

// ✅ ReturnType — infer the return type of a function
type ServerActionReturn = ReturnType<typeof createUser>

// ✅ Awaited — unwrap a Promise type
type UserData = Awaited<ReturnType<typeof fetchUser>>  // Promise<User> → User

// ✅ NonNullable — remove null and undefined from a type
type DefiniteUser = NonNullable<User | null | undefined>  // User

// ❌ Avoid — manually rewriting what a utility type does
type UserSummary = {
  id: string       // Duplicated from User
  name: string     // Duplicated from User
  avatarUrl: string // Duplicated from User — drifts if User changes
}
```

| Rule | Level |
|------|-------|
| Use utility types (`Pick`, `Omit`, `Partial`, etc.) over manual type duplication | **MUST** |
| Use `Awaited<ReturnType<typeof fn>>` to derive types from async functions | **SHOULD** |

### 1.7 `z.infer` as the Single Source of Truth

Zod schemas produce both runtime validation and TypeScript types. **Never hand-write a type that duplicates a Zod schema.**

```typescript
import { z } from 'zod'

// ✅ Correct — schema is the source, type is derived
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'viewer']),
})

type User = z.infer<typeof UserSchema>
// {
//   id: string
//   name: string
//   email: string
//   role: 'admin' | 'user' | 'viewer'
// }

// ✅ Correct — derive input types from schema too
const CreateUserSchema = UserSchema.omit({ id: true })
type CreateUserInput = z.infer<typeof CreateUserSchema>

// ❌ Forbidden — hand-written type that duplicates the schema
type User = {
  id: string
  name: string
  email: string
  role: 'admin' | 'user' | 'viewer'  // If schema changes, this drifts
}
```

**Cross-reference**: ADR-0005 mandates Zod at every API boundary. ADR-0012 mandates Zod for form schemas.

| Rule | Level |
|------|-------|
| Derive types from Zod schemas using `z.infer<typeof Schema>` | **MUST** |
| Never hand-write a type that duplicates a Zod schema definition | **MUST NOT** |
| Use Zod `.pick()`, `.omit()`, `.extend()`, `.partial()` to derive variant schemas | **SHOULD** |

### 1.8 Generic Component Props

Use generics when a component works with arbitrary data types but needs type safety for callbacks, rendering, or data manipulation.

```tsx
// ✅ Correct — generic list component preserves item type through callbacks
type ListProps<T> = {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T) => string
  onItemClick?: (item: T) => void
  emptyMessage?: string
}

export const List = <T,>({
  items,
  renderItem,
  keyExtractor,
  onItemClick,
  emptyMessage = 'No items found',
}: ListProps<T>) => {
  if (items.length === 0) {
    return <p className="text-foreground/60">{emptyMessage}</p>
  }

  return (
    <ul>
      {items.map((item, index) => (
        <li key={keyExtractor(item)} onClick={() => onItemClick?.(item)}>
          {renderItem(item, index)}
        </li>
      ))}
    </ul>
  )
}

// Usage — TypeScript infers T from the items array
<List
  items={users}                              // T is inferred as User
  keyExtractor={(user) => user.id}           // user is typed as User
  renderItem={(user) => <span>{user.name}</span>}
  onItemClick={(user) => router.push(`/users/${user.id}`)}
/>

// ❌ Avoid — using `any` or `unknown` instead of generics
type ListProps = {
  items: unknown[]
  renderItem: (item: unknown, index: number) => React.ReactNode  // Caller must cast
}
```

**Note the trailing comma in `<T,>`**: This is required in `.tsx` files to disambiguate from JSX tags. `<T>` is parsed as a JSX element; `<T,>` or `<T extends unknown>` forces TypeScript to parse it as a generic.

| Rule | Level |
|------|-------|
| Use generics for components that work with arbitrary data types | **SHOULD** |
| Use trailing comma `<T,>` in `.tsx` files for generic arrow functions | **MUST** |
| Prefer generics over `unknown` with manual casting | **SHOULD** |

### 1.9 Branded (Nominal) Types

TypeScript uses structural typing — `string` is `string` regardless of intent. Branded types add a phantom property that makes semantically different strings/numbers incompatible at the type level.

```typescript
// ✅ Correct — branded types prevent mixing IDs
type UserId = string & { readonly __brand: 'UserId' }
type PostId = string & { readonly __brand: 'PostId' }

// Constructor functions
const UserId = (id: string) => id as UserId
const PostId = (id: string) => id as PostId

// Usage
const fetchUser = async (id: UserId) => { /* ... */ }
const fetchPost = async (id: PostId) => { /* ... */ }

const userId = UserId('abc-123')
const postId = PostId('def-456')

fetchUser(userId)   // ✅ Correct
fetchUser(postId)   // ❌ TypeScript error: PostId is not assignable to UserId
fetchUser('abc')    // ❌ TypeScript error: string is not assignable to UserId

// ✅ Utility: branded type factory
type Brand<T, B extends string> = T & { readonly __brand: B }

type UserId = Brand<string, 'UserId'>
type PostId = Brand<string, 'PostId'>
type Cents = Brand<number, 'Cents'>
type Pixels = Brand<number, 'Pixels'>
```

| Rule | Level |
|------|-------|
| Use branded types for entity IDs that must not be mixed (`UserId`, `PostId`, `TeamId`) | **SHOULD** |
| Use branded types for units that must not be mixed (`Cents` vs `Dollars`, `Pixels` vs `Rem`) | **SHOULD** |
| Keep the `Brand<T, B>` utility in `contracts/common.ts` if adopted | **SHOULD** |

### 1.10 Event Handler Typing

React provides specific event types. Use them instead of generic `Event` or inline typing.

```tsx
// ✅ Correct — specific React event types
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault()
}

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setQuery(e.target.value)
}

const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()
  const formData = new FormData(e.currentTarget)
}

const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') handleSearch()
}

// ✅ Correct — component event handler props
type SearchProps = {
  onSearch: (query: string) => void
  onChange?: (value: string) => void
}

// ❌ Avoid — generic DOM Event or any
const handleClick = (e: Event) => { /* ... */ }         // Use React.MouseEvent
const handleChange = (e: any) => { /* ... */ }          // Use React.ChangeEvent
const handleSubmit = (e: React.SyntheticEvent) => { }   // Too broad — use FormEvent
```

| Rule | Level |
|------|-------|
| Use specific React event types (`MouseEvent`, `ChangeEvent`, `FormEvent`, `KeyboardEvent`) | **MUST** |
| Specify the HTML element generic (`<HTMLButtonElement>`, `<HTMLInputElement>`) | **SHOULD** |

---

## Part 2: JavaScript Runtime Patterns

TypeScript compiles to JavaScript. Types are erased at runtime. Every footgun below produces code that compiles cleanly but fails at runtime.

### 2.1 Equality and Truthiness

#### Strict Equality (`===`) Is Mandatory

```typescript
// ✅ Correct — strict equality
if (status === 'active') { /* ... */ }
if (count === 0) { /* ... */ }
if (user === null) { /* ... */ }

// ❌ Forbidden — loose equality (coercion rules are insane)
if (status == 'active') { /* ... */ }  // '' == false is true
if (count == 0) { /* ... */ }          // null == 0 is false, but '' == 0 is true
if (user == null) { /* ... */ }        // Only acceptable use: checks both null AND undefined
```

**The one exception**: `value == null` checks for both `null` and `undefined` in one expression. This is the only `==` usage that is acceptable — but prefer `value === null || value === undefined` or `value == null` consistently.

#### Truthiness Pitfalls

JavaScript has exactly 8 falsy values: `false`, `0`, `-0`, `0n`, `""`, `null`, `undefined`, `NaN`. Every other value is truthy — including `[]`, `{}`, and `"0"`.

```tsx
// ❌ Bug — `0` is falsy, so "no items" shows when count is 0
const count = items.length
if (count) {
  return <p>{count} items</p>
}
return <p>No items</p>  // Shows when count is 0 — technically correct but fragile

// ✅ Correct — explicit comparison
if (count > 0) {
  return <p>{count} items</p>
}

// ❌ Bug — renders `0` in the DOM (React renders numbers)
{count && <ItemList items={items} />}  // When count is 0, renders "0" as text

// ✅ Correct — boolean condition
{count > 0 && <ItemList items={items} />}
// or
{items.length > 0 && <ItemList items={items} />}

// ❌ Bug — empty string is falsy
const name = user.displayName || 'Anonymous'  // If displayName is '', falls back to 'Anonymous'

// ✅ Correct — nullish coalescing only falls back for null/undefined
const name = user.displayName ?? 'Anonymous'  // '' stays as '' (empty string preserved)

// ❌ Bug — 0 is falsy
const page = params.page || 1  // If page is 0, defaults to 1

// ✅ Correct — nullish coalescing
const page = params.page ?? 1  // 0 is preserved as 0
```

| Rule | Level |
|------|-------|
| Use `===` and `!==` — never `==` or `!=` (except `== null` for null/undefined check) | **MUST** |
| Use `??` (nullish coalescing) for defaults — not `\|\|` (logical OR) | **MUST** |
| Use `?.` (optional chaining) for safe property access on potentially null/undefined values | **SHOULD** |
| Never use a number directly as a JSX condition — use `> 0` or `Boolean()` | **MUST** |
| Use explicit comparisons (`> 0`, `!== ''`, `!== null`) over relying on truthiness | **SHOULD** |

### 2.2 Nullish Coalescing (`??`) vs Logical OR (`||`)

This is important enough to call out separately because it's the single most common runtime bug agents produce.

```typescript
// || returns the right side for ANY falsy value: false, 0, -0, 0n, "", null, undefined, NaN
// ?? returns the right side ONLY for null and undefined

const port = config.port || 3000       // ❌ If port is 0, uses 3000
const port = config.port ?? 3000       // ✅ If port is 0, preserves 0

const label = item.label || 'Untitled' // ❌ If label is '', uses 'Untitled'
const label = item.label ?? 'Untitled' // ✅ If label is '', preserves ''

const show = options.show || true      // ❌ ALWAYS true — even if show was explicitly false
const show = options.show ?? true      // ✅ If show is false, preserves false

// The only time || is correct for defaults: when you intentionally want to treat
// ALL falsy values as "missing" (rare)
const displayName = user.firstName || user.email || 'Anonymous'
// Here, we WANT empty string '' to fall through — use || intentionally
```

| Rule | Level |
|------|-------|
| Default to `??` for fallback values | **MUST** |
| Use `\|\|` only when you intentionally want ALL falsy values to trigger the fallback | **MAY** |

### 2.3 Immutability — Arrays and Objects

JavaScript arrays and objects are reference types. Many array methods **mutate the original array**. In React, mutating state directly causes bugs because React detects changes by reference identity.

#### Mutating vs Non-Mutating Array Methods

```typescript
// ❌ Mutating methods — NEVER use on state or props
const arr = [3, 1, 2]
arr.sort()           // Mutates arr in place → [1, 2, 3]
arr.reverse()        // Mutates arr in place → [3, 2, 1]
arr.splice(1, 1)     // Mutates arr in place → removes element
arr.push(4)          // Mutates arr in place → adds element
arr.pop()            // Mutates arr in place → removes last
arr.shift()          // Mutates arr in place → removes first
arr.unshift(0)       // Mutates arr in place → adds to beginning
arr.fill(0)          // Mutates arr in place → fills with value

// ✅ Non-mutating equivalents (ES2023+ — supported in all modern runtimes)
const sorted = arr.toSorted((a, b) => a - b)    // Returns NEW sorted array
const reversed = arr.toReversed()                 // Returns NEW reversed array
const without = arr.toSpliced(1, 1)               // Returns NEW array with element removed
const withNew = [...arr, 4]                        // Spread to add
const withoutLast = arr.slice(0, -1)              // Slice to remove last
const withInsert = arr.with(1, 99)                // Returns NEW array with element replaced

// ✅ Always safe — these never mutate
arr.map(fn)          // Returns new array
arr.filter(fn)       // Returns new array
arr.reduce(fn, init) // Returns accumulated value
arr.find(fn)         // Returns element or undefined
arr.findIndex(fn)    // Returns index or -1
arr.some(fn)         // Returns boolean
arr.every(fn)        // Returns boolean
arr.includes(val)    // Returns boolean
arr.indexOf(val)     // Returns index or -1
arr.flat()           // Returns new array
arr.flatMap(fn)      // Returns new array
arr.slice()          // Returns new array (shallow copy)
arr.concat(other)    // Returns new array
```

#### Deep Copy vs Shallow Copy

```typescript
// Spread (...) creates a SHALLOW copy — nested objects are still shared references
const user = { name: 'Alice', address: { city: 'NYC' } }
const copy = { ...user }
copy.address.city = 'LA'
console.log(user.address.city) // 'LA' — MUTATED the original!

// ✅ Correct — structuredClone for deep copies
const deepCopy = structuredClone(user)
deepCopy.address.city = 'LA'
console.log(user.address.city) // 'NYC' — original preserved

// ✅ Correct — for simple nested updates, spread at each level
const updated = {
  ...user,
  address: { ...user.address, city: 'LA' },
}

// ⚠️ structuredClone doesn't clone: functions, DOM nodes, Symbols, Error objects, WeakMaps
// For objects with methods, use spread or a custom clone function
```

#### React State Immutability

```tsx
// ❌ Bug — mutating state directly, React won't detect the change
const [items, setItems] = useState(['a', 'b', 'c'])

const handleRemove = (index: number) => {
  items.splice(index, 1)    // Mutates the existing array
  setItems(items)            // Same reference — React skips re-render!
}

// ✅ Correct — create a new array
const handleRemove = (index: number) => {
  setItems((prev) => prev.toSpliced(index, 1))
  // or: setItems((prev) => prev.filter((_, i) => i !== index))
}

// ❌ Bug — sort mutates the original
const handleSort = () => {
  setItems(items.sort())    // Mutates in place, same reference
}

// ✅ Correct — toSorted returns a new array
const handleSort = () => {
  setItems((prev) => prev.toSorted())
}
```

| Rule | Level |
|------|-------|
| Never mutate arrays or objects in React state — always create new references | **MUST** |
| Use `toSorted()`, `toReversed()`, `toSpliced()`, `.with()` over mutating methods | **MUST** |
| Use `structuredClone()` for deep copies of plain data objects | **SHOULD** |
| Use spread (`{...obj}`) for shallow copies — be aware nested objects share references | **MUST** |
| Use functional updater (`setState(prev => ...)`) when new state depends on previous state | **MUST** |

### 2.4 Async/Await and Promises

#### `Promise.all` vs `Promise.allSettled`

```typescript
// Promise.all — fails fast. If ANY promise rejects, the entire call rejects.
// Use when ALL results are required and one failure means the whole operation fails.

// ✅ Correct — fetching data that all depends on each other
const [user, permissions] = await Promise.all([
  fetchUser(userId),
  fetchPermissions(userId),
])
// If either fails, both are needed so failing fast is correct

// Promise.allSettled — waits for ALL promises to complete, never rejects.
// Use when partial success is acceptable and you want to handle each result individually.

// ✅ Correct — sending notifications where partial failure is OK
const results = await Promise.allSettled([
  sendEmail(user.email),
  sendSMS(user.phone),
  sendPush(user.deviceToken),
])

results.forEach((result, index) => {
  if (result.status === 'fulfilled') {
    console.info(`Notification ${index} sent`)
  } else {
    console.error(`Notification ${index} failed:`, result.reason)
  }
})

// ❌ Wrong — using Promise.all for independent operations where partial failure is OK
const results = await Promise.all([
  sendEmail(user.email),     // If this fails...
  sendSMS(user.phone),       // ...these are abandoned
  sendPush(user.deviceToken),
])
```

**Cross-reference**: ADR-0007 mandates `Promise.allSettled` for Server Components with multiple fetches.

#### Sequential vs Parallel Execution

```typescript
// ❌ Accidental sequential — each await blocks the next
const users = await fetchUsers()          // 200ms
const posts = await fetchPosts()          // 300ms
const comments = await fetchComments()    // 150ms
// Total: 650ms (sequential)

// ✅ Correct — parallel when ops are independent
const [users, posts, comments] = await Promise.all([
  fetchUsers(),       // 200ms ─┐
  fetchPosts(),       // 300ms ─┤ All start at the same time
  fetchComments(),    // 150ms ─┘
])
// Total: 300ms (longest single operation)

// ✅ Correct — sequential when ops depend on each other
const user = await fetchUser(userId)
const posts = await fetchPostsByAuthor(user.id)  // Needs user.id from previous call
```

| Rule | Level |
|------|-------|
| Use `Promise.all` when all results are required and one failure should abort all | **MUST** |
| Use `Promise.allSettled` when partial success is acceptable | **MUST** |
| Run independent async operations in parallel (`Promise.all`), not sequentially | **MUST** |
| Never use `.then()` / `.catch()` chains — use `async`/`await` | **MUST** |

#### Fire-and-Forget (Intentional Detached Promises)

```typescript
// ❌ Bug — unhandled promise rejection (ESLint: @typescript-eslint/no-floating-promises)
logAnalyticsEvent('page_view')  // Promise returned but not awaited or caught

// ✅ Correct — void operator explicitly marks fire-and-forget
void logAnalyticsEvent('page_view')

// ✅ Correct — catch errors if the operation might fail
logAnalyticsEvent('page_view').catch((err) =>
  console.error('[analytics] Failed to log event', err),
)

// ✅ Correct — await when the result matters
await logAnalyticsEvent('page_view')
```

| Rule | Level |
|------|-------|
| Never leave a promise floating — await it, void it, or .catch() it | **MUST** |
| Use `void` keyword for intentional fire-and-forget promises | **SHOULD** |

#### Error Handling in Async Code

```typescript
// ✅ Correct — try/catch wraps the entire async block
const fetchUserSafe = async (id: string): Promise<Result<User>> => {
  try {
    const response = await fetch(`/api/users/${id}`)
    if (!response.ok) {
      return { ok: false, error: { code: ErrorCode.NOT_FOUND, message: 'User not found' } }
    }
    const data = await response.json()
    return { ok: true, value: UserSchema.parse(data) }
  } catch (error: unknown) {
    console.error('[fetchUser]', error)
    return { ok: false, error: { code: ErrorCode.INTERNAL_ERROR, message: 'Failed to fetch user' } }
  }
}

// ❌ Bug — try/catch only covers fetch, not json() or parse()
const fetchUserBroken = async (id: string) => {
  try {
    const response = await fetch(`/api/users/${id}`)
  } catch (error) {
    return null
  }
  const data = await response.json()  // ❌ If this throws, unhandled!
  return UserSchema.parse(data)        // ❌ If this throws, unhandled!
}
```

### 2.5 Error Narrowing

In JavaScript, `catch` receives `unknown` (anything can be thrown — not just `Error` objects). You must narrow before accessing properties.

```typescript
// ✅ Correct — narrow the error type before using it
try {
  await riskyOperation()
} catch (error: unknown) {
  // Check for Error instance
  if (error instanceof Error) {
    console.error(error.message)
    console.error(error.stack)
  }

  // Check for specific error types
  if (error instanceof TypeError) {
    console.error('Type error:', error.message)
  }

  // Check for API error shape
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as Record<string, unknown>).code === 'string'
  ) {
    // error has a code property
  }

  // Fallback — convert anything to a string for logging
  console.error('Unknown error:', String(error))
}

// ❌ Bug — assumes error is always an Error object
try {
  JSON.parse(userInput)
} catch (error) {
  console.error(error.message)   // Runtime crash if error isn't an Error
}

// ⚠️ JavaScript can throw non-Error values (unfortunately)
throw 'something broke'      // string
throw 42                     // number
throw { code: 'FAIL' }      // plain object
throw null                   // null
// All of these are caught by catch — none have .message
```

**Helper pattern for error message extraction:**

```typescript
// src/lib/utils.ts — add this utility
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'An unknown error occurred'
}

// Usage
try {
  await riskyOperation()
} catch (error: unknown) {
  console.error('[operation]', getErrorMessage(error))
}
```

| Rule | Level |
|------|-------|
| Always type catch variables as `unknown` | **MUST** |
| Narrow error type with `instanceof Error` before accessing `.message` or `.stack` | **MUST** |
| Use `getErrorMessage()` utility for logging unknown errors | **SHOULD** |

### 2.6 Closures and Stale Closures in React

A closure captures variables from its enclosing scope. In React, this means event handlers and effects "close over" the state/props from the render when they were created. If state changes, old closures still reference old values.

```tsx
// ❌ Bug — stale closure in setInterval
'use client'
const Counter = () => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setCount(count + 1)  // ❌ count is captured as 0 and never changes
    }, 1000)
    return () => clearInterval(id)
  }, [])  // Empty deps — effect runs once, count is always 0

  return <p>{count}</p>   // Shows 1 forever
}

// ✅ Correct — functional updater avoids the closure problem
'use client'
const Counter = () => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setCount((prev) => prev + 1)  // ✅ prev is always the latest value
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return <p>{count}</p>   // Increments correctly
}

// ✅ Correct — include the dependency if you need to read it
'use client'
const Logger = ({ userId }: { userId: string }) => {
  useEffect(() => {
    const id = setInterval(() => {
      logActivity(userId)   // Reads userId — must be in deps
    }, 5000)
    return () => clearInterval(id)
  }, [userId])  // ✅ Re-creates interval when userId changes
}

// ❌ Bug — stale closure in event handler with debounce
const SearchInput = () => {
  const [query, setQuery] = useState('')

  const debouncedSearch = useMemo(
    () => debounce((q: string) => {
      fetchResults(q)  // ✅ Use the parameter, not the closed-over state
    }, 300),
    [],
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    debouncedSearch(value)  // ✅ Pass the value directly, don't rely on query state
  }
}
```

| Rule | Level |
|------|-------|
| Use functional updaters (`setState(prev => ...)`) in callbacks that may close over stale state | **MUST** |
| Pass values as parameters to debounced/throttled callbacks — don't read closed-over state | **MUST** |
| Include all referenced variables in `useEffect`/`useMemo`/`useCallback` dependency arrays | **MUST** |
| Use the `react-hooks/exhaustive-deps` ESLint rule (included in Next.js default config) | **MUST** |

### 2.7 Destructuring Pitfalls

#### `null` vs `undefined` — Defaults Only Apply to `undefined`

This is a language-level trap. Destructuring defaults trigger for `undefined` but **NOT for `null`**.

```typescript
// ✅ Understanding the behavior
const { name = 'Anonymous' } = { name: undefined }  // name = 'Anonymous' ✅
const { name = 'Anonymous' } = { name: null }       // name = null ❌ — default NOT applied!
const { name = 'Anonymous' } = {}                    // name = 'Anonymous' ✅ (missing = undefined)

// ❌ Bug — API returns null, default is bypassed
type ApiUser = { displayName: string | null }
const { displayName = 'Guest' } = apiUser  // If displayName is null, stays null

// ✅ Correct — use nullish coalescing after destructuring
const { displayName } = apiUser
const name = displayName ?? 'Guest'  // Handles both null and undefined

// ✅ Correct — or handle during Zod parsing
const UserSchema = z.object({
  displayName: z.string().nullable().transform((v) => v ?? 'Guest'),
})
```

#### Function Parameter Defaults

```typescript
// ✅ Correct — default parameter value
const greet = (name = 'World') => `Hello, ${name}!`
greet()           // 'Hello, World!'
greet(undefined)  // 'Hello, World!'
greet(null)       // 'Hello, null!' — null is NOT undefined, default doesn't apply

// ✅ Correct — use nullish coalescing for null-safe defaults
const greet = (name?: string | null) => `Hello, ${name ?? 'World'}!`
greet(null)       // 'Hello, World!' ✅
```

| Rule | Level |
|------|-------|
| Be aware that destructuring defaults only apply for `undefined`, not `null` | **MUST** |
| Use `??` for defaults that must handle both `null` and `undefined` | **MUST** |
| Handle `null` in Zod transforms when parsing API responses that may contain `null` | **SHOULD** |

### 2.8 Iteration Patterns

```typescript
// ✅ for...of — iterate over VALUES of arrays, strings, Maps, Sets, iterables
for (const item of items) {
  console.log(item)   // The actual item
}

// ❌ for...in — iterate over KEYS (including inherited prototype properties!)
for (const key in obj) {
  console.log(key)    // String keys — includes prototype properties
}
// Safer but still generally avoidable:
for (const key in obj) {
  if (Object.hasOwn(obj, key)) {
    console.log(key)
  }
}

// ✅ Object iteration — use Object.entries, Object.keys, Object.values
for (const [key, value] of Object.entries(config)) {
  console.log(key, value)
}

const keys = Object.keys(config)
const values = Object.values(config)

// ✅ Array methods are preferred over for loops in most cases
const activeUsers = users.filter((u) => u.isActive)
const names = users.map((u) => u.name)
const hasAdmin = users.some((u) => u.role === 'admin')
const totalAge = users.reduce((sum, u) => sum + u.age, 0)

// ✅ Use for...of when you need break/continue or async operations
for (const user of users) {
  if (user.role === 'admin') break   // Can't break in .forEach
  await sendNotification(user)        // Sequential async — forEach doesn't await
}

// ❌ Avoid — forEach with async doesn't wait for promises
users.forEach(async (user) => {
  await sendEmail(user.email)  // Fires all at once, forEach doesn't await
})

// ✅ Correct — sequential async processing
for (const user of users) {
  await sendEmail(user.email)  // Truly sequential
}

// ✅ Correct — parallel async processing
await Promise.all(users.map((user) => sendEmail(user.email)))
```

| Rule | Level |
|------|-------|
| Use `for...of` for iterating arrays and iterables — never `for...in` on arrays | **MUST** |
| Use `Object.entries()` / `Object.keys()` / `Object.values()` for objects — not `for...in` | **MUST** |
| Use array methods (`.map`, `.filter`, `.some`, `.every`, `.reduce`) over manual loops | **SHOULD** |
| Never use `.forEach` with `async` callbacks — use `for...of` or `Promise.all(arr.map(...))` | **MUST NOT** |
| Use `Object.hasOwn(obj, key)` instead of `obj.hasOwnProperty(key)` | **SHOULD** |

### 2.9 `typeof` and Type Guards

JavaScript's `typeof` has known traps. Build reliable type guards.

```typescript
// ⚠️ typeof null === 'object' — this is a 30-year-old bug in JavaScript
typeof null        // 'object' — not 'null'!
typeof []          // 'object' — arrays are objects
typeof {}          // 'object'
typeof undefined   // 'undefined'
typeof 'hello'     // 'string'
typeof 42          // 'number'
typeof true        // 'boolean'
typeof Symbol()    // 'symbol'
typeof BigInt(1)   // 'bigint'
typeof (() => {})  // 'function'

// ❌ Bug — typeof null is 'object'
const isObject = (value: unknown): boolean => typeof value === 'object'
isObject(null)  // true — wrong!

// ✅ Correct — explicit null check
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

// ✅ Correct — Array.isArray for arrays (not typeof)
Array.isArray([1, 2, 3])  // true
Array.isArray('hello')     // false

// ✅ Custom type guard functions (TypeScript narrows the type)
const isUser = (value: unknown): value is User =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  'email' in value &&
  typeof (value as Record<string, unknown>).id === 'string'
```

| Rule | Level |
|------|-------|
| Always check `!== null` alongside `typeof === 'object'` | **MUST** |
| Use `Array.isArray()` to check for arrays — never `typeof` | **MUST** |
| Write type guard functions (`value is Type`) for complex type narrowing | **SHOULD** |

### 2.10 Date Handling

The `Date` constructor has inconsistent parsing behavior across browsers and runtimes. Avoid parsing date strings with `new Date()`.

```typescript
// ❌ Unreliable — Date parsing is browser-dependent
new Date('2026-03-03')          // May be UTC or local time depending on runtime
new Date('03/03/2026')          // Ambiguous — MM/DD or DD/MM?
new Date('March 3, 2026')      // Works in some runtimes, fails in others

// ✅ Correct — ISO 8601 strings with timezone
new Date('2026-03-03T00:00:00Z')       // Explicit UTC
new Date('2026-03-03T00:00:00+05:30')  // Explicit timezone

// ✅ Correct — individual components (months are 0-indexed!)
new Date(2026, 2, 3)  // March 3, 2026 — month 2 is March, not February!

// ✅ Correct — timestamps
new Date(1772611200000)  // Unambiguous

// ✅ For display formatting — use Intl.DateTimeFormat (built-in, no dependency)
const formatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})
formatter.format(new Date())  // 'March 3, 2026'

// ✅ For complex date manipulation — use an approved library (see approved-libraries.md)
// date-fns is recommended if date manipulation is frequently needed
```

| Rule | Level |
|------|-------|
| Use ISO 8601 format with timezone for date strings in APIs (ADR-0005 `Timestamp` type) | **MUST** |
| Use `Intl.DateTimeFormat` for display formatting — not manual string building | **SHOULD** |
| Remember `Date` months are 0-indexed (January = 0, December = 11) | **MUST** |
| Store/transmit dates as ISO 8601 strings or Unix timestamps — never locale strings | **MUST** |

### 2.11 `parseInt` and Number Coercion

```typescript
// ❌ Bug — parseInt without radix can produce surprising results
parseInt('08')        // 8 in modern engines, but was 0 in older ones (octal)
parseInt('0x10')      // 16 — silently parses as hex
parseInt('123abc')    // 123 — silently ignores trailing non-numeric chars

// ✅ Correct — always specify radix 10
parseInt('08', 10)     // 8
parseInt('010', 10)    // 10

// ✅ Preferred — Number() and Number.parseInt() are more predictable
Number('123')          // 123
Number('123abc')       // NaN — doesn't silently truncate
Number('')             // 0 — be aware of this
Number(null)           // 0 — be aware of this
Number(undefined)      // NaN

// ✅ For strict numeric parsing
const parseStrictInt = (value: string): number | null => {
  const num = Number(value)
  return Number.isInteger(num) ? num : null
}
```

| Rule | Level |
|------|-------|
| Always provide radix to `parseInt`: `parseInt(value, 10)` | **MUST** |
| Prefer `Number()` over `parseInt()` for general string-to-number conversion | **SHOULD** |
| Validate numeric conversions — don't trust implicit coercion | **SHOULD** |

---

## Rules Summary

### TypeScript Type Rules

| Rule | Level |
|------|-------|
| Use `type` by default; use `interface` only for extensible contracts | **MUST** |
| Use `unknown` for uncertain types; `any` is forbidden without `// TODO: type` annotation | **MUST** |
| Use discriminated unions for multi-state values | **MUST** |
| Use exhaustive `switch` with `never` default for all discriminated union switches | **MUST** |
| Derive types from Zod schemas (`z.infer`) — never duplicate type definitions manually | **MUST** |
| Use specific React event types (`MouseEvent`, `ChangeEvent`, etc.) | **MUST** |
| Use utility types (`Pick`, `Omit`, `Partial`, etc.) over manual type rewriting | **MUST** |
| Use `satisfies` to validate shape while preserving literal types | **SHOULD** |
| Use branded types for entity IDs that must not be mixed | **SHOULD** |
| Use generics for type-safe reusable components | **SHOULD** |

### JavaScript Runtime Rules

| Rule | Level |
|------|-------|
| Use `===` / `!==` — never `==` / `!=` | **MUST** |
| Use `??` for defaults — not `\|\|` | **MUST** |
| Never mutate arrays/objects in React state — use immutable methods | **MUST** |
| Use `toSorted()`, `toReversed()`, `toSpliced()` over mutating equivalents | **MUST** |
| Use `Promise.all` for fail-fast parallel; `Promise.allSettled` for partial-success parallel | **MUST** |
| Run independent async operations in parallel, not sequentially | **MUST** |
| Never leave a promise floating — await, void, or catch it | **MUST** |
| Type catch variables as `unknown` and narrow before use | **MUST** |
| Use functional updaters in callbacks that may close over stale state | **MUST** |
| Use `for...of` for arrays — never `for...in` | **MUST** |
| Never use `.forEach` with async callbacks | **MUST NOT** |
| Check `!== null` alongside `typeof === 'object'` | **MUST** |
| Always pass radix to `parseInt` | **MUST** |
| Use ISO 8601 for date strings in APIs | **MUST** |
| Be aware that destructuring defaults only apply for `undefined`, not `null` | **MUST** |

---

## Rationale

### Why Combined (TS + JS) Instead of Separate ADRs

Every file in this project is a `.ts` or `.tsx` file — TypeScript type patterns and JavaScript runtime patterns are used together in every function, every component, every hook. Separating them into two ADRs would create an artificial boundary that doesn't match how developers (or agents) actually write code. A single reference makes it easier to find the rule you need.

### Why These Specific Patterns

These are the patterns agents get wrong most frequently:

1. **Stale closures** — The #1 source of subtle bugs in React Client Components. Types compile fine; the code silently uses old values.
2. **Array mutation** — `.sort()`, `.reverse()`, `.splice()` mutate in place. Agents reach for them without thinking, breaking React state.
3. **Nullish coalescing vs OR** — `??` vs `||` confusion causes real bugs with `0`, `""`, and `false` values.
4. **Error narrowing** — `catch (error)` without narrowing crashes when the thrown value isn't an Error.
5. **Sequential awaits** — Agents chain `await` calls that should run in parallel, degrading performance.
6. **`type` vs `interface`** inconsistency — Without a rule, the codebase drifts between both styles arbitrarily.
7. **Missing exhaustive switches** — New union variants silently fall through to default cases.

### Key Factors

1. **TypeScript types are erased at runtime** — Type correctness alone doesn't prevent the JavaScript runtime pitfalls documented here
2. **Agents pattern-match from training data** — They frequently emit `||` instead of `??`, `arr.sort()` instead of `arr.toSorted()`, and `for...in` on arrays. Explicit rules correct this.
3. **Consistency reduces cognitive load** — One answer for `type` vs `interface`, one answer for `??` vs `||`, one answer for `.sort()` vs `.toSorted()`
4. **Cross-ADR consolidation** — Patterns that were scattered (satisfies in ADR-0007, Promise.allSettled in ADR-0007, z.infer in ADR-0005/0012) now have a single reference point

## Options Considered

| Option | Description | Why Chosen / Why Not |
|--------|------------|---------------------|
| Combined TS + JS patterns ADR | Single reference for all type and runtime patterns | ✅ Chosen: matches how code is written, one reference point |
| TypeScript patterns only | Ignore JS runtime behaviors | ❌ Misses the most common runtime bugs (closures, mutation, async) |
| JavaScript patterns only | Ignore TS type patterns | ❌ Misses `type` vs `interface`, generics, branded types, satisfies |
| Two separate ADRs | TS patterns + JS patterns split | ❌ Artificial separation; every file uses both together |
| Rely on ESLint only | Let tooling catch everything | ❌ ESLint catches some (no-floating-promises, no-explicit-any) but not all (stale closures, nullish vs OR, destructuring nulls) |

---

## Implementation Guidelines

### File Locations

```
contracts/common.ts               — Brand<T, B> utility type (if adopted)
src/lib/utils.ts                  — getErrorMessage() helper
```

### Code Patterns

All code patterns are inline in the sections above, with ✅/❌ markers for correct/incorrect usage. This is intentional — the patterns are best understood in context, not as isolated snippets.

---

## Consequences

**Positive:**
- Agents produce idiomatic TypeScript with consistent `type` vs `interface` decisions
- Runtime bugs from array mutation, stale closures, and nullish coalescing are prevented by documented rules
- Error handling is safer with `unknown` catch variables and proper narrowing
- Async code is faster with parallel execution by default
- Cross-ADR patterns (`satisfies`, `z.infer`, `Promise.allSettled`) are consolidated into one reference
- New team members have one document for "how do we write TypeScript/JavaScript here"

**Negative:**
- Long ADR — mitigated by clear Part 1 (TS) / Part 2 (JS) structure and table of rules at the end
- Some overlap with existing ADR examples (e.g., `satisfies` in ADR-0007) — mitigated by cross-references, not duplication. This ADR explains the *pattern*; other ADRs show the *application*.
- ES2023 methods (`toSorted`, `toReversed`, `toSpliced`) require modern runtimes — mitigated by Next.js 15 targeting modern browsers and Node.js 18+

## Related ADRs

- [ADR-0001](./0001-architecture.md) — Architecture (TypeScript strict mode, const objects, type imports, naming conventions)
- [ADR-0005](./0005-data-fetching.md) — Data Fetching (Zod at boundaries, `z.infer`, `Result<T>`)
- [ADR-0007](./0007-error-handling.md) — Error Handling (`satisfies`, `ErrorCode` const object, `Promise.allSettled`, `Result<T>`)
- [ADR-0012](./0012-forms.md) — Forms (Zod schemas for form validation, `z.infer` for input types)
- [ADR-0020](./0020-state-management.md) — State Management (discriminated unions in reducers, useReducer patterns)
- [ADR-0021](./0021-performance-react.md) — Performance React (hooks, memoization, `useTransition`)
