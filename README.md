# Find Equals

**Find Equals** is a high-performance Vue 3 application that solves numerical puzzles. Given a set of input numbers and a target value, it calculates every possible mathematical equation to reach that target using standard operators, grouping, and advanced mathematical concepts.

## 🚀 Features

* **Complete Permutation Search:** Finds every possible arrangement of input numbers, or only the declared order with "Keep Input Order".
* **Configurable Operators:** Toggle Addition (`+`), Subtraction (`-`), Multiplication (`*`), Division (`/`), Exponents (`^`), and Modulo (`mod`) individually.
* **Configurable Functions:** Toggle Square Roots (`sqrt`), Factorials (`!`), Cube Roots (`cbrt`), Squares (`n^2`), Logarithms (`ln`, `log10`), and Negation — with optional nesting (`sqrt(9!)`) and application to whole sub-expressions (`sqrt(9 + 7)`).
* **Any Number of Inputs:** Expressions are generated as full binary trees, so every possible parenthesization is covered for any operand count — no fixed templates.
* **Concatenation Mode:** Optional feature to combine adjacent numbers (e.g., merging `8` and `1` to create `81`), covering every adjacent grouping.
* **Near Misses:** When the target can't be reached, the closest results found are shown instead.
* **Fast and Non-Blocking:** The search evaluates numbers directly (no expression parsing) and runs in a Web Worker, so the UI never freezes and long runs can be cancelled at any time.
* **Persistent Settings:** All inputs and options are saved to localStorage between visits.

## 🧠 How It Works (The Algorithm)

This application solves the "Target Number" problem (similar to the *Countdown* numbers game) by exhaustive search over expression trees.

### 1. Operand Lists
All orderings of the input numbers are generated (Heap's algorithm), or just the declared order if "Keep Input Order" is on. With concatenation enabled, each ordering is also expanded into every adjacent digit-merge (`[8, 1, 6]` → `[81, 6]`, `[8, 16]`, `[816]`).

### 2. Expression Trees
Each operand list is recursively split into left/right halves, producing every binary tree shape (Catalan numbers), crossed with every enabled operator. This covers all possible parenthesizations for any number of operands.

### 3. Unary Functions
Enabled functions are applied to individual numbers — and optionally to sub-expressions and in nested chains — with domain guards (factorials only for integers ≤ 170, roots only for valid signs) and pruning of no-op applications like `sqrt(1)`.

### 4. Evaluation & Filtering
Every candidate is computed numerically as it is built (no string parsing), then filtered by the min/max/decimal constraints. The target check runs first with a float tolerance, so a full results cap can never hide the target. The five closest distinct misses are tracked throughout.

### 5. Execution
The whole search runs in a Web Worker that streams progress and results back to the UI, stops early when the target is found (optional), and can be cancelled instantly.

## 🧮 Example Case

**Inputs:** `1, 4, 6, 8`
**Target:** `75`

Standard left-to-right math struggles to find this. However, by using structural grouping and unary square roots, **Find Equals** discovers:

```math
((1 + 8) ^ sqrt(4)) - 6 = 75
```

## How to install

```bash
$ npm install
$ npm run dev
```

## Tests

```bash
$ npm test
```
