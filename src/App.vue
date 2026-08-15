<script setup>
import { ref, reactive, computed } from 'vue';
import { evaluate } from 'mathjs'
import { getPermutations, cycles } from './utils/permutations';

// Configuration constants
const BATCH_TIME_MS = 15;
const FLOAT_TOLERANCE = 0.000001;
const EQUATIONS_PREVIEW_COUNT = 10;
const DEFAULT_MAX_RESULTS = 2000;

const INITIAL = 'is-initial';
const COMPUTING = 'is-computing';
const COMPLETE = 'is-complete';
const state = ref(INITIAL);
const isInitial = computed(() => state.value === INITIAL);
const isComputing = computed(() => state.value === COMPUTING);

const options = reactive({
    inputs: [
        { value: 1 },
        { value: 4 },
        { value: 6 },
        { value: 8 },
    ],
    targetAnswer: 75,
    minAnswer: 1,
    maxAnswer: 100,
    allowDecimals: false,
    allowConcatenation: true,
    enforceOrder: false,
    showEquations: false,
    maxResults: DEFAULT_MAX_RESULTS,
    stopOnTarget: true, // NEW: Defaults to true
});

const availableNumbers = computed(() => options.inputs.map(x => x.value));
const permutations = ref([]);

// Binary operators go between operands. Symbols are inserted verbatim into
// equations, so word operators like mod carry their own spacing.
const binaryOperators = reactive([
    { symbol: '+', label: '+', enabled: true },
    { symbol: '-', label: '-', enabled: true },
    { symbol: '*', label: '*', enabled: true },
    { symbol: '/', label: '/', enabled: true },
    { symbol: '^', label: '^', enabled: true },
    { symbol: ' mod ', label: 'mod', enabled: false },
]);

// Unary operators wrap a single operand. Wrapped forms are parenthesized
// where needed so they stay atomic inside any surrounding expression.
const unaryOperators = reactive([
    { key: 'sqrt', label: 'sqrt(n)', wrap: v => `sqrt(${v})`, enabled: true },
    { key: 'factorial', label: 'n!', wrap: v => `${v}!`, enabled: true },
    { key: 'cbrt', label: 'cbrt(n)', wrap: v => `cbrt(${v})`, enabled: false },
    { key: 'square', label: 'n^2', wrap: v => `(${v}^2)`, enabled: false },
    { key: 'ln', label: 'ln(n)', wrap: v => `log(${v})`, enabled: false },
    { key: 'log10', label: 'log10(n)', wrap: v => `log10(${v})`, enabled: false },
    { key: 'negate', label: '-n', wrap: v => `(-${v})`, enabled: false },
]);

const enabledBinaryOps = computed(() => binaryOperators.filter(op => op.enabled).map(op => op.symbol));

/**
 * Generator that yields all combinations of the given operators for a given count.
 * For count=2, yields ['+'], ['-'], ['*'], ...
 * For count=3, yields ['+', '+'], ['+', '-'], ...
 */
function* operatorCombinations(count, operators) {
    if (count <= 1 || operators.length === 0) return;
    const numOps = count - 1;
    const indices = new Array(numOps).fill(0);

    while (true) {
        yield indices.map(i => operators[i]);

        // Increment indices like a counter (rightmost first)
        let pos = numOps - 1;
        while (pos >= 0) {
            indices[pos]++;
            if (indices[pos] < operators.length) break;
            indices[pos] = 0;
            pos--;
        }
        if (pos < 0) break;
    }
}

// Precomputed regex patterns for unary substitutions.
// Pattern uses negative lookbehind/lookahead (?<!\d) and (?!\d) to match whole numbers only,
// preventing partial matches like "81" matching the digit "1" in a concatenated number.
const unaryPatterns = computed(() => {
    const seen = new Set();
    return options.inputs
        .map(input => String(input.value))
        .filter(val => {
            if (seen.has(val)) return false;
            seen.add(val);
            return true;
        })
        .map(val => ({
            val,
            regex: new RegExp(`(?<!\\d)${val}(?!\\d)`, 'g'),
            replacements: unaryOperators.filter(op => op.enabled).map(op => op.wrap(val)),
        }));
});

const answers = ref([]);
const validEquationsFound = ref(0);
const processedCount = ref(0);
const targetFoundFlag = ref(false); // Immediate stop flag

const addInput = () => {
    options.inputs.push({ value: 0 });
};

const isTargetFound = computed(() => targetFoundFlag.value);

const hasValidInputs = computed(() => {
    if (options.inputs.length === 0) return false;
    return options.inputs.every(input =>
        input.value !== '' &&
        input.value !== null &&
        !isNaN(Number(input.value))
    );
});

const hasOperatorsSelected = computed(() => enabledBinaryOps.value.length > 0 || options.inputs.length <= 1);

const canGenerate = computed(() => hasValidInputs.value && hasOperatorsSelected.value && !isComputing.value);

/**
 * 1. Evaluate Equation
 */
const tryEquation = (equation) => {
    // If we already found the target and we are supposed to stop, do nothing.
    if (targetFoundFlag.value && options.stopOnTarget) return;

    try {
        const answer = evaluate(equation);

        // Validate Basics
        if (!isFinite(answer) || isNaN(answer)) return;

        // CHECK TARGET FIRST (Before checking maxResults)
        // This ensures we don't give up searching for "75" just because we found 1000 "74s"
        if (Math.abs(answer - options.targetAnswer) < FLOAT_TOLERANCE) {
             answers.value.unshift({ equation, answer }); // Put it at the top!
             validEquationsFound.value += 1;
             targetFoundFlag.value = true; // Signal to stop
             return;
        }

        // Validate Constraints
        if ((answer % 1 !== 0) && !options.allowDecimals) return;
        if (answer < options.minAnswer || answer > options.maxAnswer) return;

        // Check Capacity
        if (answers.value.length >= options.maxResults) return;

        // Store standard result
        answers.value.push({ equation, answer });
        validEquationsFound.value += 1;

    } catch (error) {
        // Silent fail
    }
};

/**
 * 2. Generate Structural Templates
 */
const applyTemplates = (nums, ops) => {
    if (targetFoundFlag.value && options.stopOnTarget) return; // Optimization check

    const N = nums;
    const O = ops;

    // Helper to apply regex variations (factorials/roots) using precomputed patterns
    const applyUnary = (eq) => {
        tryEquation(eq);

        // Only run expensive regex if we haven't found target yet
        if (targetFoundFlag.value && options.stopOnTarget) return;

        for (const pattern of unaryPatterns.value) {
            if (pattern.regex.test(eq)) {
                // Reset regex lastIndex since we're using 'g' flag
                pattern.regex.lastIndex = 0;
                for (const replacement of pattern.replacements) {
                    tryEquation(eq.replace(pattern.regex, replacement));
                    pattern.regex.lastIndex = 0;
                }
            }
            pattern.regex.lastIndex = 0;
        }
    }

    // Dynamic Templates based on array length
    if (N.length === 1) {
        applyUnary(N[0]);
    }
    else if (N.length === 2) {
        applyUnary(`${N[0]} ${O[0]} ${N[1]}`);
    } 
    else if (N.length === 3) {
        applyUnary(`${N[0]}${O[0]}${N[1]}${O[1]}${N[2]}`);
        applyUnary(`(${N[0]}${O[0]}${N[1]})${O[1]}${N[2]}`);
        applyUnary(`${N[0]}${O[0]}(${N[1]}${O[1]}${N[2]})`);
    } 
    else if (N.length === 4) {
        const base = `${N[0]}${O[0]}${N[1]}${O[1]}${N[2]}${O[2]}${N[3]}`;
        applyUnary(base);
        applyUnary(`(${N[0]}${O[0]}${N[1]})${O[1]}(${N[2]}${O[2]}${N[3]})`);
        applyUnary(`((${N[0]}${O[0]}${N[1]})${O[1]}${N[2]})${O[2]}${N[3]}`);
        applyUnary(`${N[0]}${O[0]}(${N[1]}${O[1]}(${N[2]}${O[2]}${N[3]}))`);
    }
};

/**
 * 3. Operator Looper - iterates through all operator combinations using generator
 */
const solveForNumbers = (numberList) => {
    if (targetFoundFlag.value && options.stopOnTarget) return;

    const len = numberList.length;

    if (len === 1) {
        applyTemplates(numberList, []);
        return;
    }

    for (const ops of operatorCombinations(len, enabledBinaryOps.value)) {
        if (targetFoundFlag.value && options.stopOnTarget) return;
        applyTemplates(numberList, ops);
    }
};

/**
 * MAIN GENERATOR
 */
const handleGenerate = async () => {
    state.value = COMPUTING;
    answers.value = [];
    validEquationsFound.value = 0;
    cycles.value = 0;
    processedCount.value = 0;
    targetFoundFlag.value = false;

    const rawOperands = availableNumbers.value.map(String);
    permutations.value = options.enforceOrder
        ? [rawOperands.slice()]
        : getPermutations(rawOperands);

    const totalPermutations = permutations.value.length;
    let permIndex = 0;

    const processBatch = () => {
        return new Promise((resolve) => {
            const startTime = performance.now();

            // Loop while: 
            // 1. We have items
            // 2. Time is under 15ms
            // 3. We haven't found the target (if stopOnTarget is on)
            while (
                permIndex < totalPermutations && 
                (performance.now() - startTime < BATCH_TIME_MS) &&
                !(options.stopOnTarget && targetFoundFlag.value)
            ) {

                const p = permutations.value[permIndex];

                // Standard Solve
                solveForNumbers(p);

                // Concatenation Solve
                if (options.allowConcatenation) {
                    if (p.length > 1) solveForNumbers([ p[0] + p[1], ...p.slice(2) ]);
                    if (p.length > 2) solveForNumbers([ p[0], p[1] + p[2], ...p.slice(3) ]);
                    if (p.length > 3) solveForNumbers([ ...p.slice(0, 2), p[2] + p[3] ]);
                    if (p.length === 4) solveForNumbers([ p[0] + p[1], p[2] + p[3] ]);
                }

                permIndex++;
                processedCount.value++;
            }

            // Return true if we should continue processing
            const shouldContinue = permIndex < totalPermutations && !(options.stopOnTarget && targetFoundFlag.value);
            resolve(shouldContinue);
        });
    };

    const runBatches = async () => {
        let hasMore = true;
        while (hasMore && state.value === COMPUTING) {
            hasMore = await processBatch();
            await new Promise(r => setTimeout(r, 0));
        }
        state.value = COMPLETE;
    };

    runBatches();
};

const sortedAnswers = computed(() => {
    const ans = {};
    const seen = {}; // Use Sets for O(1) duplicate checks
    for (const sol of answers.value) {
        if (!ans[sol.answer]) {
            ans[sol.answer] = [];
            seen[sol.answer] = new Set();
        }
        if (!seen[sol.answer].has(sol.equation)) {
            seen[sol.answer].add(sol.equation);
            ans[sol.answer].push(sol.equation);
        }
    }
    return Object.keys(ans).map(Number).sort((a, b) => a - b).map(key => ({ answer: key, equations: ans[key] }));
});
</script>

<template>
    <div class="w-full max-w-[1024px] mx-auto p-8">
        <div class="bg-gray-200 rounded-xl shadow-lg border p-8">
            <h1 class="text-3xl text-gray-700 font-bold">Find Equals</h1>

            <div class="flex items-center flex-wrap gap-4 pt-4">
                <div v-for="(num, index) in options.inputs" :key="`input-${index}`">
                    <input
                        v-model="num.value"
                        type="number"
                        class="w-24 border rounded-md px-4 py-1"
                        :class="{ 'border-red-500 bg-red-50': num.value === '' || num.value === null || isNaN(Number(num.value)) }"
                        placeholder="#"
                    >
                </div>
                <button type="button" class="text-blue-600 font-bold" @click="addInput">+ Add Input</button>
            </div>

            <div class="flex flex-wrap gap-6 pt-4 items-end">
                <div>
                    <span class="block text-gray-500 text-sm">Target</span>
                    <input v-model="options.targetAnswer" type="number" class="w-32 border rounded-md px-4 py-1 font-bold">
                </div>
                <div>
                    <span class="block text-gray-500 text-sm">Min Answer</span>
                    <input v-model="options.minAnswer" type="number" class="w-20 border rounded-md px-4 py-1">
                </div>
                <div>
                    <span class="block text-gray-500 text-sm">Max Answer</span>
                    <input v-model="options.maxAnswer" type="number" class="w-20 border rounded-md px-4 py-1">
                </div>
                <div>
                     <span class="block text-gray-500 text-sm">Max Results</span>
                     <input v-model="options.maxResults" type="number" class="w-24 border rounded-md px-4 py-1">
                </div>
                <div class="flex flex-col justify-center">
                    <label class="flex items-center gap-2 cursor-pointer select-none">
                        <input v-model="options.stopOnTarget" type="checkbox" class="w-5 h-5 text-green-600"> 
                        <span class="font-bold text-gray-700">Stop when target found</span>
                    </label>
                </div>
            </div>

            <div class="pt-4 border-t border-gray-300 mt-4">
                <span class="block text-gray-500 text-sm mb-2">Operators (between numbers)</span>
                <div class="flex flex-wrap gap-4">
                    <label v-for="op in binaryOperators" :key="op.symbol" class="flex items-center gap-2 cursor-pointer">
                        <input v-model="op.enabled" type="checkbox">
                        <span class="font-mono font-bold">{{ op.label }}</span>
                    </label>
                </div>
                <span class="block text-gray-500 text-sm mb-2 mt-4">Functions (applied to a single number)</span>
                <div class="flex flex-wrap gap-4">
                    <label v-for="op in unaryOperators" :key="op.key" class="flex items-center gap-2 cursor-pointer">
                        <input v-model="op.enabled" type="checkbox">
                        <span class="font-mono">{{ op.label }}</span>
                    </label>
                </div>
            </div>

            <div class="flex flex-wrap gap-6 pt-4 border-t border-gray-300 mt-4">
                <label class="flex items-center gap-2 cursor-pointer">
                    <input v-model="options.allowDecimals" type="checkbox"> <span>Decimals</span>
                </label>
                 <label class="flex items-center gap-2 cursor-pointer">
                    <input v-model="options.allowConcatenation" type="checkbox">
                    <span>Combine Numbers (8 & 1 -> 81)</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                    <input v-model="options.enforceOrder" type="checkbox">
                    <span>Keep Input Order</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                    <input v-model="options.showEquations" type="checkbox">
                    <span>Show All Equations</span>
                </label>
            </div>

            <div class="pt-6">
                <button
                    type="button"
                    :disabled="!canGenerate"
                    class="bg-green-500 hover:bg-green-600 text-white font-bold rounded-md px-6 py-2 disabled:opacity-50 w-full md:w-auto"
                    @click="handleGenerate"
                >
                    {{ isComputing ? (targetFoundFlag ? 'Target Found! Finishing...' : 'Calculating...') : 'Start Generator' }}
                </button>
                <span v-if="!hasValidInputs && !isComputing" class="text-red-500 text-sm ml-4">Please enter valid numbers</span>
                <span v-else-if="!hasOperatorsSelected && !isComputing" class="text-red-500 text-sm ml-4">Select at least one operator</span>
            </div>
        </div>

        <div class="mt-8">
             <div v-if="isComputing" class="w-full bg-gray-200 rounded-full h-4 mb-4 overflow-hidden relative">
                <div class="bg-blue-600 h-full transition-all duration-200" :style="{ width: (permutations.length ? (processedCount / permutations.length * 100) : 0) + '%' }"></div>
                <div class="absolute inset-0 flex items-center justify-center text-xs text-white font-bold drop-shadow-md">
                    {{ permutations.length ? Math.round(processedCount / permutations.length * 100) : 0 }}% Scanned
                </div>
            </div>

            <div v-if="isTargetFound" class="bg-green-100 border border-green-500 text-green-800 px-4 py-3 rounded mb-4 flex justify-between items-center">
                <span class="font-bold flex items-center gap-2">
                    <i class="fas fa-check-circle"></i> TARGET {{ options.targetAnswer }} FOUND!
                </span>
                <span class="text-sm">Stopping early to save memory.</span>
            </div>

            <div v-if="sortedAnswers.length" class="flex flex-col gap-3">
                 <div
                    v-for="({ answer, equations }) in sortedAnswers"
                    :key="answer"
                    class="bg-green-50 rounded-md border border-green-200 p-3"
                    :class="{ 'bg-yellow-100 border-yellow-400 shadow-md ring-2 ring-yellow-300': answer === options.targetAnswer }"
                >
                    <div class="font-bold text-lg mb-1 flex justify-between">
                        <span>Answer: {{ answer }}</span>
                        <span v-if="answer === options.targetAnswer" class="text-xs bg-yellow-400 text-yellow-900 px-2 py-1 rounded">MATCH</span>
                    </div>
                    <div class="text-sm text-gray-600 flex flex-wrap gap-2">
                        <span v-for="eq in (options.showEquations ? equations : equations.slice(0, EQUATIONS_PREVIEW_COUNT))" :key="eq" class="bg-white px-2 py-1 rounded border shadow-sm font-mono text-xs md:text-sm">{{ eq }}</span>
                        <span v-if="!options.showEquations && equations.length > EQUATIONS_PREVIEW_COUNT" class="italic pt-1 text-xs">...and {{ equations.length - EQUATIONS_PREVIEW_COUNT }} more</span>
                    </div>
                </div>
            </div>

            <div v-else-if="state === COMPLETE && !isTargetFound" class="text-center text-gray-500 py-12 bg-gray-50 rounded border border-dashed">
                <p class="text-xl font-bold text-gray-400">No solutions found</p>
                <p class="text-sm">Try enabling Decimals or Concatenation</p>
            </div>
        </div>
    </div>
</template>
