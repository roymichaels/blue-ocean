// TODO:TODO-104 Expand buildTopic to validate domain/store identifiers against allowed vocabularies before constructing topics.
// TODO:REC-204 Consider caching normalized topics to reduce repeated string allocations in hot message loops.

const ROOT_NAMESPACE = '/blue-ocean';
const DEFAULT_SCOPE = '1';

function normalizeSegment(segment: string | undefined): string {
  const value = (segment ?? '').trim();
  if (!value) return DEFAULT_SCOPE;
  return value.replace(/[^a-zA-Z0-9_.-]/g, '').toLowerCase() || DEFAULT_SCOPE;
}

export function buildTopic(domain: string, scope: string | undefined): string {
  const normalizedDomain = normalizeSegment(domain).replace(/\.+/g, '.');
  const normalizedScope = normalizeSegment(scope);
  return `${ROOT_NAMESPACE}/${normalizedDomain}/${normalizedScope}`;
}

export function adminUsersTopic(tenantId?: string): string {
  return buildTopic('users', tenantId ?? DEFAULT_SCOPE);
}

const RECOVERY_DOMAIN_MAP = {
  request: 'admin.recovery.request',
  verify: 'admin.recovery.verify',
  attempt: 'admin.recoveryAttempt',
  granted: 'admin.recoveryGranted',
  revoked: 'admin.recoveryRevoked',
} as const;

export type AdminRecoveryEvent = keyof typeof RECOVERY_DOMAIN_MAP;

export function adminRecoveryTopic(
  tenantId: string | undefined,
  event: AdminRecoveryEvent,
): string {
  const domain = RECOVERY_DOMAIN_MAP[event];
  return buildTopic(domain, tenantId ?? DEFAULT_SCOPE);
}

export function adminRecoveryTopicsForTenant(
  tenantId: string | undefined,
): Record<AdminRecoveryEvent, string> {
  return {
    request: adminRecoveryTopic(tenantId, 'request'),
    verify: adminRecoveryTopic(tenantId, 'verify'),
    attempt: adminRecoveryTopic(tenantId, 'attempt'),
    granted: adminRecoveryTopic(tenantId, 'granted'),
    revoked: adminRecoveryTopic(tenantId, 'revoked'),
  };
}
