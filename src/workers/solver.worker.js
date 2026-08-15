import { createSearch } from '../utils/solver';

// Runs one full search per 'start' message, posting incremental updates.
// Cancellation is handled by the main thread calling worker.terminate(),
// so the loop here can stay synchronous.

const POST_INTERVAL_MS = 100;

self.onmessage = (event) => {
    if (event.data?.type !== 'start') return;

    const search = createSearch(event.data.config);
    let lastPost = 0;

    const postUpdate = (processed) => {
        self.postMessage({
            type: 'update',
            processed,
            total: search.total,
            results: search.takeNewResults(),
            targetFound: search.targetFound,
        });
    };

    let status = { done: search.total === 0, processed: 0 };
    while (!status.done) {
        status = search.step();
        const now = performance.now();
        if (now - lastPost >= POST_INTERVAL_MS) {
            lastPost = now;
            postUpdate(status.processed);
        }
    }

    postUpdate(status.processed);
    self.postMessage({
        type: 'done',
        targetFound: search.targetFound,
        nearMisses: search.nearMisses,
    });
};
