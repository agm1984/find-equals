# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

- `npm install` - Install dependencies
- `npm run dev` - Start Vite dev server for local development
- `npm run build` - Create production build in `dist/`
- `npm run preview` - Serve production build locally
- `npm test` - Run the Vitest suite once
- `npm run test:watch` - Run Vitest in watch mode
- `npx vitest run src/utils/__tests__/solver.test.js -t "finds 75"` - Run a single test by file and name

## Architecture Overview

Find Equals is a Vue 3 + Vite application that solves numerical puzzles (Countdown-style): given a set of input numbers and a target value, it brute-forces mathematical equations that produce the target.

The solver is a pure JavaScript module with no dependencies (not even mathjs — evaluation is direct numeric computation, which is what makes the search fast). The UI runs it inside a Web Worker so the main thread stays free.

### Core Files

- **`src/utils/solver.js`** - All solver logic, pure and UI-free. Exports the operator definitions (`BINARY_OPERATORS`, `UNARY_OPERATORS`), the enumeration primitives (`concatenationVariants`, `buildOperandLists`, `forEachExpression`), and `createSearch()`, the incremental search driver.
- **`src/workers/solver.worker.js`** - Thin Web Worker wrapper: receives a `start` message with a search config, drives `createSearch()` to completion, posts `update` messages (progress + result batches) every ~100ms and a final `done` message. Cancellation is `worker.terminate()` from the main thread.
- **`src/App.vue`** - UI only: options/toggles, worker lifecycle, results display. Persists all settings to localStorage (`find-equals-settings-v1`).
- **`src/utils/permutations.js`** - Heap's algorithm. Mutates its input array in place.
- **`src/utils/__tests__/solver.test.js`** - Vitest coverage of the solver.

### Solver Algorithm Flow (all in `createSearch()`)

1. **Operand lists** - `buildOperandLists()` produces every operand sequence to solve: permutations of the inputs (or just the declared order when `enforceOrder` is set), each expanded by `concatenationVariants()` (all adjacent digit-merges, e.g. `[8,1,6] -> [81,6], [8,16], [816]`; negatives, decimals, and leading zeros never merge), deduplicated.
2. **Expression enumeration** - `forEachExpression()` streams every expression tree for an operand list via callbacks: it recursively splits the list into left/right halves (all binary tree shapes — Catalan(n-1) of them), crosses with every enabled binary operator, and layers unary variants on leaves (always) and inner nodes (when `subExpressionFunctions` is on). **Any operand count works** — there are no hardcoded templates.
3. **Unary variants** - `applyUnaries()` composes unary operators up to `unaryDepth` (e.g. `sqrt(9!)` at depth 2). Applications that don't change the value (`sqrt(1)`, `2!`, `-0`) are pruned; each `apply` guards its own domain (factorial: integers 0-170; sqrt/ln: sign checks).
4. **Filtering** - `processEquation()` checks the target first (float tolerance, outside the min/max/decimal/cap constraints so the target can never be missed), tracks the 5 nearest distinct misses, then applies constraints and stores.

Expressions carry `{value, expr, atom}`; `atom` marks self-delimiting expressions (numbers, function calls, factorials) that don't need parens when embedded, which is how display strings stay readable. `mod` follows mathjs semantics (sign of divisor).

### Search/UI Contract

`createSearch()` is incremental: each `step()` fully solves one operand list; drain results between steps with `takeNewResults()`. The worker loops `step()` synchronously and batches messages. The UI appends result batches to `answers`, groups/dedupes them in `sortedAnswers`, and always renders target matches (yellow card) while collapsing other answers behind a toggle. Near misses render only when the run completes without finding the target.

## Code Style

- Vue 3 Single File Components with `<script setup>`
- JavaScript with single quotes and semicolons
- 4-space indentation
- Prefer descriptive, domain-focused names (e.g., `buildOperandLists`, `handleGenerate`)
- Tailwind CSS for styling (utility classes in templates; avoid adding new CSS files)
- Keep solver logic in `src/utils/solver.js` (pure, testable, worker-safe: no Vue/DOM imports)

## Commit Guidelines

- Short, concise, imperative messages (e.g., "Add concatenation guard"); no strict convention enforced
