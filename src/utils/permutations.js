import { ref } from 'vue';
// import { evaluate } from 'mathjs'

export let cycles = ref(0);

// export const getPermutations = (initialInputs) => {
//     let result = [];

//     const permute = (arr, m = []) => {
//         if (arr.length === 0) {
//             result.push(m);
//         } else {
//             for (let i = 0; i < arr.length; i++) {
//                 cycles.value += 1;
//                 let curr = arr.slice();
//                 let next = curr.splice(i, 1);
//                 permute(curr.slice(), m.concat(next));
//             }
//         }
//    }

//    permute(initialInputs);

//    return result;
// };

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
