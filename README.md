# Find Equals

**Find Equals** is a high-performance Vue 3 application that solves numerical puzzles. Given a set of input numbers and a target value, it calculates every possible mathematical equation to reach that target using standard operators, grouping, and advanced mathematical concepts.

## 🚀 Features

* **Complete Permutation Search:** Finds every possible arrangement of input numbers.
* **Advanced Operations:** Supports Addition (`+`), Subtraction (`-`), Multiplication (`*`), Division (`/`), and Exponents (`^`).
* **Unary Variations:** Automatically checks for **Square Roots** (`sqrt(x)`) and **Factorials** (`x!`) on individual numbers.
* **Complex Grouping:** Uses structural templates to test various parentheses placements (e.g., `(A+B)*C` vs `A+(B*C)`).
* **Concatenation Mode:** Optional feature to combine numbers (e.g., merging `8` and `1` to create `81`).
* **Non-Blocking Performance:** Uses asynchronous batch processing to handle millions of combinations without freezing the browser UI or crashing memory.

## 🧠 How It Works (The Algorithm)

This application solves the "Target Number" problem (similar to the *Countdown* numbers game) using a Brute Force approach optimized with structural heuristics.

### 1. Permutation Generation
The app first generates all valid orderings of the input numbers (e.g., `[1, 4, 6, 8]`, `[8, 1, 6, 4]`, etc.).

### 2. Concatenation (Optional)
If enabled, the algorithm dynamically alters the input arrays to merge adjacent numbers.
* *Input:* `[8, 1, 6]`
* *Variations:* `[8, 1, 6]`, `[81, 6]`, `[8, 16]`

### 3. Structural Templates & Operators
Instead of simple left-to-right evaluation, the app injects the numbers into specific mathematical structures to ensure Order of Operations is respected and manipulated correctly.
* **Flat:** `A + B * C`
* **Grouped:** `(A + B) * C`
* **Nested:** `(A + B) ^ (C - D)`

### 4. Unary Substitution
Before evaluating, the engine scans for individual numbers and attempts to apply unary operators if they result in valid integers.
* *Example:* If the number is `4`, it tests both `4` and `sqrt(4)` (2).
* *Example:* If the number is `3`, it tests both `3` and `3!` (6).

### 5. Evaluation & Memory Management
* **Batching:** Calculations run in 15ms time-slices to keep the UI responsive.
* **Lazy Evaluation:** Strings are generated and evaluated immediately using `mathjs`. Invalid results are discarded instantly to prevent RAM overflow.
* **Stop-On-Target:** The search can effectively prioritize finding the specific target answer and halt execution immediately upon success.

## 🧮 Example Case

**Inputs:** `1, 4, 6, 8`
**Target:** `75`

Standard left-to-right math struggles to find this. However, by using structural grouping and unary square roots, **Find Equals** discovers:

```math
((1 + 8) ^ sqrt(4)) - 6 = 75
```