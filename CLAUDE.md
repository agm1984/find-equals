# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

- `npm install` - Install dependencies
- `npm run dev` - Start Vite dev server for local development
- `npm run build` - Create production build in `dist/`
- `npm run preview` - Serve production build locally

No automated test framework is configured yet. If you add tests, also add the corresponding npm scripts and keep test files close to source (e.g., `src/utils/__tests__/permutations.test.js`).

## Architecture Overview

Find Equals is a Vue 3 + Vite application that solves numerical puzzles (Countdown-style): given a set of input numbers and a target value, it brute-forces mathematical equations that produce the target.

### Core Files

- **`src/App.vue`** - Main application containing all solver logic and UI. Uses `<script setup>` composition API.
- **`src/utils/permutations.js`** - Heap's algorithm implementation for generating permutations. Exports `getPermutations()` and a reactive `cycles` counter (the counter is reset by `App.vue` but no longer incremented; it belonged to the old commented-out recursive implementation).
- **`src/App-v1.vue`** - Legacy variant of the app; avoid editing unless intentional.

### Solver Algorithm Flow

1. **Permutation Generation** - `getPermutations()` generates all orderings of input numbers using Heap's algorithm. Note: `getPermutations()` mutates its input array in place.
2. **Operator Looping** - `solveForNumbers()` iterates through all operator combinations (`+`, `-`, `*`, `/`, `^`) via the `operatorCombinations()` generator
3. **Structural Templates** - `applyTemplates()` applies parentheses groupings based on operand count (flat, grouped, nested). **Templates are hardcoded for 1-4 operands only** - operand lists of 5+ produce no equations, so adding inputs beyond 4 silently does nothing unless concatenation reduces the count.
4. **Unary Variations** - `applyUnary()` tests factorial (`x!`) and square root (`sqrt(x)`) substitutions on each number, using precomputed regexes with digit-boundary lookarounds so `1` doesn't match inside `81`
5. **Evaluation** - `tryEquation()` evaluates expressions using `mathjs` and filters results by constraints (finite, decimals allowed or not, min/max range, max results cap). Target matches use a float tolerance, bypass the min/max/decimal constraints, and are unshifted to the top of results.

### Non-Blocking Execution

The solver uses asynchronous batch processing (`processBatch()`) with 15ms time slices to keep the UI responsive during computation. The `targetFoundFlag` combined with the `stopOnTarget` option enables early termination when the target is found; this flag is checked at every level of the solver (batch loop, operator loop, templates, unary substitution).

### Concatenation Mode

When enabled, `handleGenerate()` also solves merged variants of each permutation (adjacent pairs only, e.g., `8` and `1` become `81`). Operands are handled as strings throughout the solver so concatenation is simple string joining.

## Code Style

- Vue 3 Single File Components with `<script setup>`
- JavaScript with single quotes and semicolons
- 4-space indentation
- Prefer descriptive, domain-focused names (e.g., `applyTemplates`, `handleGenerate`)
- Tailwind CSS for styling (utility classes in templates; avoid adding new CSS files)
- Math evaluation via `mathjs` library; avoid adding heavy compute dependencies without a clear need

## Commit Guidelines

- Short, concise, imperative messages (e.g., "Add concatenation guard"); no strict convention enforced
