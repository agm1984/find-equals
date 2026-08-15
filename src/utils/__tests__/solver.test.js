import { describe, it, expect } from 'vitest';
import { getPermutations } from '../permutations';
import {
    BINARY_OPERATORS,
    UNARY_OPERATORS,
    concatenationVariants,
    buildOperandLists,
    forEachExpression,
    createSearch,
} from '../solver';

const runSearch = (config) => {
    const search = createSearch(config);
    const results = [];
    let status = { done: search.total === 0 };
    while (!status.done) {
        status = search.step();
        results.push(...search.takeNewResults());
    }
    return { results, targetFound: search.targetFound, nearMisses: search.nearMisses };
};

const baseConfig = {
    values: [1, 4, 6, 8],
    binaryKeys: ['add', 'subtract', 'multiply', 'divide', 'power'],
    unaryKeys: ['sqrt', 'factorial'],
    unaryDepth: 1,
    subExpressionFunctions: false,
    enforceOrder: false,
    allowConcatenation: true,
    targetAnswer: 75,
    minAnswer: 1,
    maxAnswer: 100,
    allowDecimals: false,
    maxResults: 2000,
    stopOnTarget: true,
};

describe('getPermutations', () => {
    it('generates n! orderings', () => {
        expect(getPermutations(['a', 'b', 'c', 'd'])).toHaveLength(24);
    });

    it('includes every distinct ordering', () => {
        const perms = getPermutations(['1', '2', '3']).map((p) => p.join(''));
        expect(new Set(perms).size).toBe(6);
    });
});

describe('concatenationVariants', () => {
    it('produces all adjacent merges', () => {
        const variants = concatenationVariants(['8', '1', '6']).map((v) => v.join(','));
        expect(variants).toEqual(expect.arrayContaining(['8,1,6', '81,6', '8,16', '816']));
        expect(variants).toHaveLength(4);
    });

    it('never merges negatives or decimals', () => {
        const variants = concatenationVariants(['-3', '5', '1.5']).map((v) => v.join(','));
        expect(variants).toEqual(['-3,5,1.5']);
    });

    it('never merges onto a leading zero', () => {
        const variants = concatenationVariants(['0', '8']).map((v) => v.join(','));
        expect(variants).toEqual(['0,8']);
    });
});

describe('buildOperandLists', () => {
    it('honors enforceOrder', () => {
        const lists = buildOperandLists([1, 2, 3], { enforceOrder: true });
        expect(lists).toEqual([['1', '2', '3']]);
    });

    it('dedupes permutations of duplicate values', () => {
        const lists = buildOperandLists([2, 2], { enforceOrder: false });
        expect(lists).toEqual([['2', '2']]);
    });
});

describe('forEachExpression', () => {
    const config = (overrides = {}) => ({
        binaryOps: BINARY_OPERATORS.filter((op) => op.key === 'add'),
        unaryOps: [],
        unaryDepth: 0,
        subExpressionFunctions: false,
        shouldStop: () => false,
        ...overrides,
    });

    it('emits Catalan(n-1) tree shapes per operator combination', () => {
        // 4 operands, 1 operator -> Catalan(3) = 5 expressions.
        const emitted = [];
        forEachExpression(['1', '2', '3', '4'], config(), (node) => emitted.push(node));
        expect(emitted).toHaveLength(5);
        expect(new Set(emitted.map((n) => n.expr)).size).toBe(5);
        emitted.forEach((node) => expect(node.value).toBe(10));
    });

    it('supports 5+ operands', () => {
        // 5 operands, 1 operator -> Catalan(4) = 14 expressions.
        const emitted = [];
        forEachExpression(['1', '1', '1', '1', '1'], config(), (node) => emitted.push(node));
        expect(emitted).toHaveLength(14);
    });

    it('composes unary functions up to the given depth', () => {
        const emitted = [];
        forEachExpression(['9'], config({
            unaryOps: UNARY_OPERATORS.filter((op) => ['sqrt', 'factorial'].includes(op.key)),
            unaryDepth: 2,
        }), (node) => emitted.push(node));
        const exprs = emitted.map((n) => n.expr);
        expect(exprs).toContain('sqrt(9!)');
        expect(exprs).toContain('sqrt(9)!');
        // Identity chains are pruned: sqrt(4)! would equal sqrt(4).
        const values = emitted.map((n) => n.value);
        expect(new Set(values).size).toBe(values.length);
    });

    it('applies functions to sub-expressions when enabled', () => {
        const emitted = [];
        forEachExpression(['9', '7'], config({
            unaryOps: UNARY_OPERATORS.filter((op) => op.key === 'sqrt'),
            unaryDepth: 1,
            subExpressionFunctions: true,
        }), (node) => emitted.push(node));
        expect(emitted.map((n) => n.expr)).toContain('sqrt(9 + 7)');
    });

    it('mod follows the divisor sign like mathjs', () => {
        const mod = BINARY_OPERATORS.find((op) => op.key === 'mod');
        expect(mod.apply(-7, 3)).toBe(2);
        expect(mod.apply(7, 3)).toBe(1);
        expect(mod.apply(7, 0)).toBeNaN();
    });

    it('guards factorial against non-integers and overflow', () => {
        const fact = UNARY_OPERATORS.find((op) => op.key === 'factorial');
        expect(fact.apply(0.5)).toBeNaN();
        expect(fact.apply(171)).toBeNaN();
        expect(fact.apply(5)).toBe(120);
    });
});

describe('createSearch', () => {
    it('finds 75 from 1, 4, 6, 8 (the README example)', () => {
        const { results, targetFound } = runSearch(baseConfig);
        expect(targetFound).toBe(true);
        expect(results.some((r) => r.answer === 75)).toBe(true);
    });

    it('respects enforceOrder', () => {
        const { results } = runSearch({
            ...baseConfig,
            values: [3, 1],
            binaryKeys: ['subtract'],
            unaryKeys: [],
            allowConcatenation: false,
            enforceOrder: true,
            targetAnswer: 999,
            stopOnTarget: false,
        });
        expect(results.map((r) => r.equation)).toEqual(['3 - 1']);
    });

    it('reports near misses when the target is unreachable', () => {
        const { targetFound, nearMisses } = runSearch({
            ...baseConfig,
            values: [2, 2],
            binaryKeys: ['add'],
            unaryKeys: [],
            allowConcatenation: false,
            targetAnswer: 5,
            stopOnTarget: false,
        });
        expect(targetFound).toBe(false);
        expect(nearMisses.length).toBeGreaterThan(0);
        expect(nearMisses[0].answer).toBe(4);
    });

    it('filters decimals unless allowed', () => {
        const strict = runSearch({
            ...baseConfig,
            values: [1, 2],
            binaryKeys: ['divide'],
            unaryKeys: [],
            allowConcatenation: false,
            targetAnswer: 999,
            minAnswer: 0,
            stopOnTarget: false,
        });
        expect(strict.results.map((r) => r.answer)).toEqual([2]);

        const loose = runSearch({
            ...baseConfig,
            values: [1, 2],
            binaryKeys: ['divide'],
            unaryKeys: [],
            allowConcatenation: false,
            targetAnswer: 999,
            minAnswer: 0,
            allowDecimals: true,
            stopOnTarget: false,
        });
        expect(loose.results.map((r) => r.answer).sort()).toEqual([0.5, 2]);
    });

    it('stops early when stopOnTarget is set', () => {
        const search = createSearch({ ...baseConfig, targetAnswer: 5, values: [1, 4] });
        let status = { done: false };
        while (!status.done) status = search.step();
        expect(search.targetFound).toBe(true);
        expect(status.processed).toBeLessThanOrEqual(search.total);
    });

    it('caps stored results at maxResults but still finds the target', () => {
        const { results, targetFound } = runSearch({
            ...baseConfig,
            maxResults: 3,
        });
        expect(targetFound).toBe(true);
        expect(results.some((r) => r.answer === 75)).toBe(true);
    });
});
