<script setup>
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue';
import { BINARY_OPERATORS, UNARY_OPERATORS } from './utils/solver';

const EQUATIONS_PREVIEW_COUNT = 10;
const DEFAULT_MAX_RESULTS = 2000;
const STORAGE_KEY = 'find-equals-settings-v1';

const INITIAL = 'is-initial';
const COMPUTING = 'is-computing';
const COMPLETE = 'is-complete';
const state = ref(INITIAL);
const isComputing = computed(() => state.value === COMPUTING);

const DEFAULT_BINARY_KEYS = ['add', 'subtract', 'multiply', 'divide', 'power'];
const DEFAULT_UNARY_KEYS = ['sqrt', 'factorial'];

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
    stopOnTarget: true,
    subExpressionFunctions: false,
    unaryDepth: 1,
});

const binaryToggles = reactive(BINARY_OPERATORS.map((op) => ({
    key: op.key,
    label: op.symbol,
    enabled: DEFAULT_BINARY_KEYS.includes(op.key),
})));

const unaryToggles = reactive(UNARY_OPERATORS.map((op) => ({
    key: op.key,
    label: op.label,
    enabled: DEFAULT_UNARY_KEYS.includes(op.key),
})));

// ---- Settings persistence ----

const loadSettings = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (Array.isArray(saved.inputs) && saved.inputs.length) {
            options.inputs = saved.inputs.map((value) => ({ value }));
        }
        for (const key of ['targetAnswer', 'minAnswer', 'maxAnswer', 'allowDecimals', 'allowConcatenation', 'enforceOrder', 'showEquations', 'maxResults', 'stopOnTarget', 'subExpressionFunctions', 'unaryDepth']) {
            if (key in saved) options[key] = saved[key];
        }
        if (Array.isArray(saved.binaryKeys)) {
            binaryToggles.forEach((t) => { t.enabled = saved.binaryKeys.includes(t.key); });
        }
        if (Array.isArray(saved.unaryKeys)) {
            unaryToggles.forEach((t) => { t.enabled = saved.unaryKeys.includes(t.key); });
        }
    } catch (error) {
        // Corrupt storage: fall back to defaults.
    }
};
loadSettings();

watch([options, binaryToggles, unaryToggles], () => {
    const { inputs, ...rest } = options;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...rest,
        inputs: inputs.map((input) => input.value),
        binaryKeys: binaryToggles.filter((t) => t.enabled).map((t) => t.key),
        unaryKeys: unaryToggles.filter((t) => t.enabled).map((t) => t.key),
    }));
}, { deep: true });

// ---- Input management ----

const addInput = () => {
    options.inputs.push({ value: 0 });
};

const removeInput = (index) => {
    if (options.inputs.length > 1) options.inputs.splice(index, 1);
};

const hasValidInputs = computed(() => {
    if (options.inputs.length === 0) return false;
    return options.inputs.every((input) =>
        input.value !== '' &&
        input.value !== null &&
        !isNaN(Number(input.value))
    );
});

const enabledBinaryKeys = computed(() => binaryToggles.filter((t) => t.enabled).map((t) => t.key));
const enabledUnaryKeys = computed(() => unaryToggles.filter((t) => t.enabled).map((t) => t.key));

const hasOperatorsSelected = computed(() => enabledBinaryKeys.value.length > 0 || options.inputs.length <= 1);

const canGenerate = computed(() => hasValidInputs.value && hasOperatorsSelected.value && !isComputing.value);

// ---- Search execution (in a web worker) ----

const answers = ref([]);
const nearMisses = ref([]);
const targetFound = ref(false);
const processedCount = ref(0);
const totalCount = ref(0);
const showAllSolutions = ref(false);

let worker = null;

const stopWorker = () => {
    if (worker) {
        worker.terminate();
        worker = null;
    }
};

onBeforeUnmount(stopWorker);

const handleGenerate = () => {
    stopWorker();
    state.value = COMPUTING;
    answers.value = [];
    nearMisses.value = [];
    targetFound.value = false;
    processedCount.value = 0;
    totalCount.value = 0;
    showAllSolutions.value = false;

    worker = new Worker(new URL('./workers/solver.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (event) => {
        const message = event.data;
        if (message.type === 'update') {
            processedCount.value = message.processed;
            totalCount.value = message.total;
            if (message.results.length) answers.value.push(...message.results);
            targetFound.value = message.targetFound;
        } else if (message.type === 'done') {
            targetFound.value = message.targetFound;
            nearMisses.value = message.targetFound ? [] : message.nearMisses;
            state.value = COMPLETE;
            stopWorker();
        }
    };

    worker.postMessage({
        type: 'start',
        config: {
            values: options.inputs.map((input) => input.value),
            binaryKeys: enabledBinaryKeys.value,
            unaryKeys: enabledUnaryKeys.value,
            unaryDepth: options.unaryDepth,
            subExpressionFunctions: options.subExpressionFunctions,
            enforceOrder: options.enforceOrder,
            allowConcatenation: options.allowConcatenation,
            targetAnswer: Number(options.targetAnswer),
            minAnswer: Number(options.minAnswer),
            maxAnswer: Number(options.maxAnswer),
            allowDecimals: options.allowDecimals,
            maxResults: Number(options.maxResults) || DEFAULT_MAX_RESULTS,
            stopOnTarget: options.stopOnTarget,
        },
    });
};

const handleCancel = () => {
    stopWorker();
    state.value = COMPLETE;
};

// ---- Results ----

const sortedAnswers = computed(() => {
    const ans = {};
    const seen = {};
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
    return Object.keys(ans).map(Number).sort((a, b) => a - b).map((key) => ({ answer: key, equations: ans[key] }));
});

const isTargetAnswer = (answer) => Math.abs(answer - Number(options.targetAnswer)) < 0.000001;
const targetSolutions = computed(() => sortedAnswers.value.filter((group) => isTargetAnswer(group.answer)));
const otherSolutions = computed(() => sortedAnswers.value.filter((group) => !isTargetAnswer(group.answer)));

const progressPercent = computed(() => (totalCount.value ? Math.round((processedCount.value / totalCount.value) * 100) : 0));
</script>

<template>
    <div class="w-full max-w-[1024px] mx-auto p-8">
        <div class="bg-gray-200 rounded-xl shadow-lg border p-8">
            <h1 class="text-3xl text-gray-700 font-bold">Find Equals</h1>

            <div class="flex items-center flex-wrap gap-4 pt-4">
                <div v-for="(num, index) in options.inputs" :key="`input-${index}`" class="relative">
                    <input
                        v-model="num.value"
                        type="number"
                        class="w-24 border rounded-md px-4 py-1"
                        :class="{ 'border-red-500 bg-red-50': num.value === '' || num.value === null || isNaN(Number(num.value)) }"
                        placeholder="#"
                    >
                    <button
                        v-if="options.inputs.length > 1"
                        type="button"
                        class="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center text-xs bg-gray-400 hover:bg-red-500 text-white rounded-full leading-none"
                        title="Remove this number"
                        @click="removeInput(index)"
                    >&times;</button>
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
                    <label v-for="op in binaryToggles" :key="op.key" class="flex items-center gap-2 cursor-pointer">
                        <input v-model="op.enabled" type="checkbox">
                        <span class="font-mono font-bold">{{ op.label }}</span>
                    </label>
                </div>
                <span class="block text-gray-500 text-sm mb-2 mt-4">Functions (applied to a single number)</span>
                <div class="flex flex-wrap gap-4 items-center">
                    <label v-for="op in unaryToggles" :key="op.key" class="flex items-center gap-2 cursor-pointer">
                        <input v-model="op.enabled" type="checkbox">
                        <span class="font-mono">{{ op.label }}</span>
                    </label>
                </div>
                <div class="flex flex-wrap gap-6 mt-3 items-center">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input v-model="options.subExpressionFunctions" type="checkbox">
                        <span>Apply functions to sub-expressions (e.g. sqrt(9 + 7))</span>
                    </label>
                    <label class="flex items-center gap-2">
                        <span class="text-gray-500 text-sm">Max function nesting</span>
                        <select v-model.number="options.unaryDepth" class="border rounded-md px-2 py-1">
                            <option :value="1">1</option>
                            <option :value="2">2</option>
                        </select>
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

            <div class="pt-6 flex items-center gap-4 flex-wrap">
                <button
                    type="button"
                    :disabled="!canGenerate"
                    class="bg-green-500 hover:bg-green-600 text-white font-bold rounded-md px-6 py-2 disabled:opacity-50 w-full md:w-auto"
                    @click="handleGenerate"
                >
                    {{ isComputing ? (targetFound ? 'Target Found! Finishing...' : 'Calculating...') : 'Start Generator' }}
                </button>
                <button
                    v-if="isComputing"
                    type="button"
                    class="bg-red-500 hover:bg-red-600 text-white font-bold rounded-md px-6 py-2"
                    @click="handleCancel"
                >
                    Cancel
                </button>
                <span v-if="!hasValidInputs && !isComputing" class="text-red-500 text-sm">Please enter valid numbers</span>
                <span v-else-if="!hasOperatorsSelected && !isComputing" class="text-red-500 text-sm">Select at least one operator</span>
            </div>
        </div>

        <div class="mt-8">
             <div v-if="isComputing" class="w-full bg-gray-200 rounded-full h-4 mb-4 overflow-hidden relative">
                <div class="bg-blue-600 h-full transition-all duration-200" :style="{ width: progressPercent + '%' }"></div>
                <div class="absolute inset-0 flex items-center justify-center text-xs text-white font-bold drop-shadow-md">
                    {{ progressPercent }}% Scanned
                </div>
            </div>

            <div v-if="targetFound" class="bg-green-100 border border-green-500 text-green-800 px-4 py-3 rounded mb-4 flex justify-between items-center">
                <span class="font-bold flex items-center gap-2">
                    <i class="fas fa-check-circle"></i> TARGET {{ options.targetAnswer }} FOUND!
                </span>
                <span v-if="options.stopOnTarget" class="text-sm">Stopping early to save memory.</span>
            </div>

            <div v-if="sortedAnswers.length" class="flex flex-col gap-3">
                 <div
                    v-for="({ answer, equations }) in targetSolutions"
                    :key="answer"
                    class="bg-yellow-100 border-yellow-400 shadow-md ring-2 ring-yellow-300 rounded-md border p-3"
                >
                    <div class="font-bold text-lg mb-1 flex justify-between">
                        <span>Answer: {{ answer }}</span>
                        <span class="text-xs bg-yellow-400 text-yellow-900 px-2 py-1 rounded">MATCH</span>
                    </div>
                    <div class="text-sm text-gray-600 flex flex-wrap gap-2">
                        <span v-for="eq in (options.showEquations ? equations : equations.slice(0, EQUATIONS_PREVIEW_COUNT))" :key="eq" class="bg-white px-2 py-1 rounded border shadow-sm font-mono text-xs md:text-sm">{{ eq }}</span>
                        <span v-if="!options.showEquations && equations.length > EQUATIONS_PREVIEW_COUNT" class="italic pt-1 text-xs">...and {{ equations.length - EQUATIONS_PREVIEW_COUNT }} more</span>
                    </div>
                </div>

                <button
                    v-if="otherSolutions.length"
                    type="button"
                    class="text-left text-gray-600 font-bold bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md px-4 py-2 flex items-center gap-2"
                    @click="showAllSolutions = !showAllSolutions"
                >
                    <span class="text-xs">{{ showAllSolutions ? '&#9660;' : '&#9654;' }}</span>
                    {{ showAllSolutions ? 'Hide' : 'Show' }} {{ otherSolutions.length }} other answer{{ otherSolutions.length === 1 ? '' : 's' }}
                </button>

                <template v-if="showAllSolutions">
                    <div
                        v-for="({ answer, equations }) in otherSolutions"
                        :key="answer"
                        class="bg-green-50 rounded-md border border-green-200 p-3"
                    >
                        <div class="font-bold text-lg mb-1 flex justify-between">
                            <span>Answer: {{ answer }}</span>
                        </div>
                        <div class="text-sm text-gray-600 flex flex-wrap gap-2">
                            <span v-for="eq in (options.showEquations ? equations : equations.slice(0, EQUATIONS_PREVIEW_COUNT))" :key="eq" class="bg-white px-2 py-1 rounded border shadow-sm font-mono text-xs md:text-sm">{{ eq }}</span>
                            <span v-if="!options.showEquations && equations.length > EQUATIONS_PREVIEW_COUNT" class="italic pt-1 text-xs">...and {{ equations.length - EQUATIONS_PREVIEW_COUNT }} more</span>
                        </div>
                    </div>
                </template>
            </div>

            <div v-if="state === COMPLETE && !targetFound && nearMisses.length" class="mt-4 bg-orange-50 border border-orange-300 rounded-md p-3">
                <div class="font-bold text-orange-800 mb-2">Target {{ options.targetAnswer }} not found — closest results:</div>
                <div class="flex flex-wrap gap-2">
                    <span v-for="miss in nearMisses" :key="miss.answer" class="bg-white px-2 py-1 rounded border shadow-sm font-mono text-xs md:text-sm">
                        {{ miss.equation }} = {{ miss.answer }}
                    </span>
                </div>
            </div>

            <div v-if="state === COMPLETE && !targetFound && !sortedAnswers.length && !nearMisses.length" class="text-center text-gray-500 py-12 bg-gray-50 rounded border border-dashed">
                <p class="text-xl font-bold text-gray-400">No solutions found</p>
                <p class="text-sm">Try enabling Decimals or Concatenation</p>
            </div>
        </div>
    </div>
</template>
