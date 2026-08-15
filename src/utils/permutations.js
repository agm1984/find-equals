/**
 * Heap's algorithm. Returns all orderings of the given array.
 * Note: mutates the input array in place while cycling through swaps.
 */
export const getPermutations = (permutation) => {
    const length = permutation.length;
    let result = [permutation.slice()];
    const c = new Array(length).fill(0);
    let i = 1;
    let k = 1;
    let p = 1;

    while (i < length) {
        if (c[i] < i) {
            k = i % 2 && c[i];
            p = permutation[i];
            permutation[i] = permutation[k];
            permutation[k] = p;
            ++c[i];
            i = 1;
            result.push(permutation.slice());
        } else {
            c[i] = 0;
            ++i;
        }
    }

    return result;
}
