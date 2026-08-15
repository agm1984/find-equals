# Find Equals

**Find Equals** is a high-performance Vue 3 application that solves numerical puzzles. Given a set of input numbers and a target value, it searches every possible mathematical equation that reaches the target — similar to the *Countdown* numbers game, but with a much richer toolbox.

```math
((1 + 8) ^ sqrt(4)) - 6 = 75
```

## 🚀 Features

* **Any number of inputs** — expressions are generated as full binary trees, so every possible parenthesization is covered for any operand count. No fixed templates, no silent limits.
* **Configurable operators** — toggle `+`, `-`, `*`, `/`, `^`, and `mod` individually. Fewer operators = smaller search space = faster runs.
* **Configurable functions** — toggle `sqrt`, factorial (`!`), `cbrt`, `n^2`, `ln`, `log10`, and negation per run:
  * **Nesting** — compose functions up to a chosen depth: `sqrt(9!)`.
  * **Sub-expressions** — optionally apply functions to whole groups, not just single numbers: `sqrt(9 + 7)`.
* **Keep Input Order** — restrict the search to equations where the numbers appear exactly as declared.
* **Concatenation mode** — merge adjacent numbers (`8`, `1` → `81`), covering every adjacent grouping (`[8,1,6]` → `[81,6]`, `[8,16]`, `[816]`).
* **Near misses** — when the target is unreachable, the five closest results are shown instead of a dead end.
* **Instant, cancellable, non-blocking** — the entire search runs in a Web Worker with live progress streaming; the UI never freezes and a run can be cancelled mid-flight.
* **Persistent settings** — inputs, target, and every toggle survive page reloads via localStorage.

## 🏗️ Architecture

The app is split into three layers with a strict dependency direction:

```
src/App.vue                    UI: options, toggles, results display
        │  postMessage(config) / onmessage(updates)
        ▼
src/workers/solver.worker.js   Web Worker: drives the search off the main thread
        │  createSearch(config).step()
        ▼
src/utils/solver.js            Pure solver: no Vue, no DOM, no dependencies
```

* **`src/utils/solver.js`** is a dependency-free module exporting the operator definitions and the search engine. Because it is pure, it runs identically in the worker, in Node, and in tests.
* **`src/workers/solver.worker.js`** receives one config message, loops the incremental search synchronously (it owns its thread), and posts progress + result batches every ~100 ms. Cancellation is simply `worker.terminate()` from the UI.
* **`src/App.vue`** owns all state the user sees: it launches a fresh worker per run, appends streamed result batches, groups them by answer, and pins target matches to the top while collapsing the rest.

### The search pipeline

1. **Operand lists** — all orderings of the inputs (Heap's algorithm), or just the declared order; each ordering expanded into its concatenation variants; duplicates removed.
2. **Expression trees** — each operand list is recursively split into left/right halves, producing every binary tree shape (Catalan numbers) crossed with every enabled operator.
3. **Unary layering** — enabled functions are applied to leaves (always) and to inner nodes (opt-in), chained up to the nesting depth, with domain guards (factorial: integers ≤ 170; roots/logs: sign checks) and pruning of no-ops like `sqrt(1)` or `2!`.
4. **Filtering** — the target is checked first with a float tolerance and outside all other constraints, so a full results cap can never hide it. Everything else passes through the decimals/min/max/cap filters, while the closest misses are tracked throughout.

### ⚡ Why it's fast

Earlier versions built equation *strings* and fed them to a math parser for every candidate — meaning every single evaluation paid for tokenizing, parsing, and interpreting. The engine now computes each expression's **value numerically as the tree is built** (one arithmetic op per node) and only formats a display string when a result survives filtering. Combined with moving the loop into a worker, this is orders of magnitude faster, and dropping the parser dependency shrank the JS bundle from **~1.4 MB to ~77 kB**.

## 🕹️ Usage

```bash
npm install
npm run dev
```

Enter your numbers (`+ Add Input` / the `×` badge to remove), set a target, pick your operators and functions, and hit **Start Generator**. Watch the progress bar, cancel any time, and expand "Show N other answers" to browse everything else the search found.

## 🧪 Tests

The solver has full Vitest coverage — permutations, concatenation rules, tree-shape counts, function composition, operator semantics, and end-to-end searches:

```bash
npm test          # run once
npm run test:watch
```

## 🛠️ Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build in `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Run the test suite |
