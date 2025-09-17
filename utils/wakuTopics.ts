// TODO:TODO-104 Expand buildTopic to validate domain/store identifiers against allowed vocabularies before constructing topics.
// TODO:REC-204 Consider caching normalized topics to reduce repeated string allocations in hot message loops.
export function buildTopic(domain: string, storeId: string): string {
  return `/blue-ocean/${domain}/${storeId}`;
}
