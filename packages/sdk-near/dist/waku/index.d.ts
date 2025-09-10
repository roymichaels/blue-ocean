/**
 * Fetch and cache all historical messages for a given topic.
 * Subsequent calls only append new unseen messages, preventing duplicates.
 */
export declare function hydrateMessages(topic: string): Promise<any[]>;
export declare function getListingsFromWaku(storeId: string): Promise<any[]>;
declare const _default: {
    getListingsFromWaku: typeof getListingsFromWaku;
    hydrateMessages: typeof hydrateMessages;
};
export default _default;
