<script setup>
import { ref, reactive, computed } from 'vue';
import { evaluate } from 'mathjs'
import cloneDeep from 'lodash.clonedeep';
import { getPermutations, cycles } from './utils/permutations';

const INITIAL = 'is-initial';
const COMPUTING = 'is-computing';
const COMPLETE = 'is-complete';
const state = ref(INITIAL);
const isInitial = computed(() => state.value === INITIAL);
const isComputing = computed(() => state.value === COMPUTING);
const isComplete = computed(() => state.value === COMPLETE);

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
    showEquations: false,
});

const availableNumbers = computed(() => options.inputs.map(x => x.value));
const permutations = ref([]);

// const operators = ['+', '-', '*', '/'];
const operators = ['+', '-', '*', '/', '^'];

const answers = ref([]);

const validEquationsFound = ref(0);

const addInput = () => {
    options.inputs.push({ value: 0 });
};

const isTargetFound = computed(() => answers.value.some(result => result.answer === options.targetAnswer));

const tryEquation = (equation) => {
    try {
        const answer = evaluate(equation);

        const isLargerThanMin = (answer >= options.minAnswer);
        const isSmallerThanMax = (answer <= options.maxAnswer);
        const hasDecimal = (answer % 1 !== 0);

        if (hasDecimal && !options.allowDecimals) return;

        if (isLargerThanMin && isSmallerThanMax) {
            answers.value.push({ equation, answer });
            validEquationsFound.value += 1;
        }
    } catch (error) {
        // goto next
    }
};

const handleGenerate = () => {
    state.value = COMPUTING;

    const operands = availableNumbers.value;
    permutations.value = getPermutations([
        // ...operators,
        ...operands,
        // ...['(', ')'],
    ]);

    // let potentialSolutions = [];

    // for (let i = 0; i < 2; i += 1) {
    //     console.log('test', permutations.value[i], operators);
    //     for (let y = 0; y < permutations.value[i].length; y += 1) {
    //         for (let x = 0; x < operators.length; x += 1) {
    //             let permutation = cloneDeep(permutations.value[i]);
    //             permutation.splice(y, 0, operators[x]);
    //             potentialSolutions.push(permutation);
    //         }
    //     }
    // }
    // console.log('solutions', potentialSolutions);

    // return;

    permutations.value.forEach((permutation) => {
        let equation = permutation.join('');
        // console.log('equation', equation);
        tryEquation(equation);

        let potentialSolutions = [];

        // one operator
        for (let y = 0; y < permutation.length; y += 1) {
            for (let x = 0; x < operators.length; x += 1) {
                let perm = cloneDeep(permutation);
                perm.splice(y, 0, operators[x]);
                potentialSolutions.push(perm);
            }
        }

        // two operator
        for (let y = 0; y < permutation.length; y += 1) {
            for (let x = 0; x < operators.length; x += 1) {
                let perm = cloneDeep(permutation);
                perm.splice(y, 0, operators[x]);
                perm.splice(y+2, 0, operators[x]);
                potentialSolutions.push(perm);
            }
        }

        // three operator
        for (let y = 0; y < permutation.length; y += 1) {
            for (let x = 0; x < operators.length; x += 1) {
                let perm = cloneDeep(permutation);
                perm.splice(y, 0, operators[x]);
                perm.splice(y+2, 0, operators[x]);
                perm.splice(y+4, 0, operators[x]);
                potentialSolutions.push(perm);
            }
        }

        // four operator
        for (let y = 0; y < permutation.length; y += 1) {
            for (let x = 0; x < operators.length; x += 1) {
                let perm = cloneDeep(permutation);
                perm.splice(y, 0, operators[x]);
                perm.splice(y+2, 0, operators[x]);
                perm.splice(y+4, 0, operators[x]);
                perm.splice(y+6, 0, operators[x]);
                potentialSolutions.push(cloneDeep(perm));
            }
        }

        // console.log('poten', potentialSolutions);

        potentialSolutions.forEach(solution => {

            tryEquation(solution.join(''));

            // superfluous operators
            tryEquation(solution.join('').replace('1', '-1'));
            tryEquation(solution.join('').replace('4', '-4'));
            tryEquation(solution.join('').replace('6', '-6'));
            tryEquation(solution.join('').replace('8', '-8'));
            tryEquation(solution.join('').replace('1', '+1'));
            tryEquation(solution.join('').replace('4', '+4'));
            tryEquation(solution.join('').replace('6', '+6'));
            tryEquation(solution.join('').replace('8', '+8'));
            tryEquation(solution.join('').replace('1', '*1'));
            tryEquation(solution.join('').replace('4', '*4'));
            tryEquation(solution.join('').replace('6', '*6'));
            tryEquation(solution.join('').replace('8', '*8'));
            tryEquation(solution.join('').replace('1', '/1'));
            tryEquation(solution.join('').replace('4', '/4'));
            tryEquation(solution.join('').replace('6', '/6'));
            tryEquation(solution.join('').replace('8', '/8'));
            tryEquation(solution.join('').replace('1', '^1'));
            tryEquation(solution.join('').replace('4', '^4'));
            tryEquation(solution.join('').replace('6', '^6'));
            tryEquation(solution.join('').replace('8', '^8'));

            // roots
            tryEquation(solution.join('').replace('1', 'sqrt(1)'));
            tryEquation(solution.join('').replace('4', 'sqrt(4)'));
            tryEquation(solution.join('').replace('6', 'sqrt(6)'));
            tryEquation(solution.join('').replace('8', 'sqrt(8)'));

            // factorials
            tryEquation(solution.join('').replace('1', '1!'));
            tryEquation(solution.join('').replace('4', '4!'));
            tryEquation(solution.join('').replace('6', '6!'));
            tryEquation(solution.join('').replace('8', '8!'));
        });

        // superfluous operators
        tryEquation(equation.replace('1', '-1'));
        tryEquation(equation.replace('4', '-4'));
        tryEquation(equation.replace('6', '-6'));
        tryEquation(equation.replace('8', '-8'));
        tryEquation(equation.replace('1', '+1'));
        tryEquation(equation.replace('4', '+4'));
        tryEquation(equation.replace('6', '+6'));
        tryEquation(equation.replace('8', '+8'));
        tryEquation(equation.replace('1', '*1'));
        tryEquation(equation.replace('4', '*4'));
        tryEquation(equation.replace('6', '*6'));
        tryEquation(equation.replace('8', '*8'));
        tryEquation(equation.replace('1', '/1'));
        tryEquation(equation.replace('4', '/4'));
        tryEquation(equation.replace('6', '/6'));
        tryEquation(equation.replace('8', '/8'));
        tryEquation(equation.replace('1', '^1'));
        tryEquation(equation.replace('4', '^4'));
        tryEquation(equation.replace('6', '^6'));
        tryEquation(equation.replace('8', '^8'));

        // roots
        tryEquation(equation.replace('1', 'sqrt(1)'));
        tryEquation(equation.replace('4', 'sqrt(4)'));
        tryEquation(equation.replace('6', 'sqrt(6)'));
        tryEquation(equation.replace('8', 'sqrt(8)'));

        // factorials
        tryEquation(equation.replace('1', '1!'));
        tryEquation(equation.replace('4', '4!'));
        tryEquation(equation.replace('6', '6!'));
        tryEquation(equation.replace('8', '8!'));

        operators.forEach(operator => {
            if (operator === '(' || operator === ')') {
                tryEquation(equation.replaceAll('(', '').replaceAll(')', ''));
            } else {
                tryEquation(equation.replaceAll(operator, ''));
            }
        });
    });

    state.value = COMPLETE;
};

const sortedAnswers = computed(() => {
    const ans = answers.value.reduce((acc, solution) => {
        // console.log('solution', solution);
        if (acc[solution.answer]) {
            acc[solution.answer].push(solution.equation);
        } else {
            acc[solution.answer] = [solution.equation];
        }
        return acc;
    }, {});

    const sortedAns = Object.keys(ans).sort((a, b) => (a - b)).reduce((acc, key) => {
        acc.push({ answer: key, equations: ans[key] });
        return acc;
    }, []);

    return sortedAns;
});
</script>

<template>
    <div class="w-full max-w-[1024px] mx-auto p-8">
        <div class="bg-gray-200 rounded-xl shadow-lg border p-8">
            <h1 class="text-3xl text-gray-700 font-bold">
                Find Equals
            </h1>

            <p class="text-gray-500 text-lg pt-4">
                Enter the numbers you need to use
            </p>

            <div class="flex items-center flex-wrap gap-4 pt-2">
                <div v-for="(num, index) in options.inputs" :key="`input-${index}`" class="">
                    <input
                        v-model="num.value"
                        type="number"
                        class="w-24 border rounded-md px-4 py-1"
                        placeholder="Enter number"
                    >
                </div>

                <div class="">
                    <button type="button" class="flex items-center gap-2" @click="addInput">
                        <i class="fas fa-plus"></i>
                        Add Input
                    </button>
                </div>
            </div>

            <p class="text-gray-500 text-lg pt-4">
                Target answer
            </p>

            <div class="flex items-center flex-wrap gap-4 pt-2">
                <input
                    v-model="options.targetAnswer"
                    type="number"
                    class="w-48 border rounded-md px-4 py-1"
                    placeholder="Enter number"
                >
            </div>

            <p class="text-gray-500 text-lg pt-4">
                Options
            </p>

            <div class="flex gap-4 pt-2">
                <div class="flex items-center gap-2">
                    <span>Min answer</span>
                    <input
                        v-model="options.minAnswer"
                        type="number"
                        class="w-24 border rounded-md px-4 py-1"
                        placeholder="eg: 1"
                    >
                </div>

                <div class="flex items-center gap-2">
                    <span>Max answer</span>
                    <input
                        v-model="options.maxAnswer"
                        type="number"
                        class="w-24 border rounded-md px-4 py-1"
                        placeholder="eg: 100"
                    >
                </div>

                <div class="flex items-center gap-2">
                    <span>Allow decimals</span>
                    <input
                        v-model="options.allowDecimals"
                        type="checkbox"
                    >
                </div>
            </div>

            <div class="pt-4">
                <button type="button" class="bg-green-500 rounded-md px-4 py-1" @click="handleGenerate">Generate</button>
            </div>
        </div>

        <div class="w-full flex flex-col gap-2 p-8">
            <h1 class="text-3xl text-gray-700 font-bold">
                Results
            </h1>

            <span>INPUTS: {{ availableNumbers }}</span>
            <span>OPTIONS: {{ options }}</span>
            <span>FOUND: {{ isTargetFound }}</span>
            <span>TOTAL PERMUTATIONS: {{ cycles }}</span>
            <span>VALID PERMUTATIONS: {{ permutations.length }}</span>
            <span>VALID EQUATIONS FOUND: {{ validEquationsFound }}</span>
            <span>STATE: {{ state }}</span>

            <div class="flex items-center justify-between pt-4">
                <h1 class="text-3xl text-gray-700 font-bold">
                    Answers <template v-if="Object.keys(sortedAnswers).length">({{ Object.keys(sortedAnswers).length }})</template>
                </h1>

                <div class="flex items-center gap-2">
                    <span>Show equations</span>
                    <input
                        v-model="options.showEquations"
                        type="checkbox"
                    >
                </div>
            </div>
            <!-- {{ sortedAnswers }} -->
            <div v-if="isComplete" class="w-full flex flex-col gap-4">
                <div
                    v-for="({ answer, equations }) in sortedAnswers"
                    :key="`answer-${answer}`"
                    class="grid grid-cols-[1fr_3fr] gap-2 bg-green-100 rounded-md shadow-lg p-2"
                >
                    <div class="text-xl font-semibold">Answer: {{ answer }}</div>
                    <div class="text-xl font-semibold">Equations: {{ options.showEquations ? equations : equations.length }}</div>
                </div>
            </div>

            <div v-else-if="isComputing" class="">
                Computing...
            </div>

            <div v-else class="">
                Press Generate to find equations.
            </div>
        </div>
    </div>
</template>
