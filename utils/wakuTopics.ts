// TODO:TODO-104 Expand buildTopic to validate domain/store identifiers against allowed vocabularies before constructing topics.
// TODO:REC-204 Consider caching normalized topics to reduce repeated string allocations in hot message loops.
export function buildTopic(domain: string, storeId: string): string {
  // TODO:CORE-023 Angle 1 - Expand topic derivation with analytics namespaces once the Angle 1 contract is defined.
  return `/blue-ocean/${domain}/${storeId}`;
}
