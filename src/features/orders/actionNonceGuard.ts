import { useRef } from 'react';

export interface ActionNonceGuard {
  acquire(id: string | null | undefined): boolean;
  release(id: string | null | undefined): void;
  isActive(id: string | null | undefined): boolean;
}

function normalizeId(id: string | null | undefined): string | null {
  if (typeof id !== 'string') return null;
  const trimmed = id.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function createActionNonceGuard(): ActionNonceGuard {
  const active = new Set<string>();
  return {
    acquire(id) {
      const key = normalizeId(id);
      if (!key) return false;
      if (active.has(key)) return false;
      active.add(key);
      return true;
    },
    release(id) {
      const key = normalizeId(id);
      if (!key) return;
      active.delete(key);
    },
    isActive(id) {
      const key = normalizeId(id);
      return key ? active.has(key) : false;
    },
  };
}

export function useActionNonceGuard(): ActionNonceGuard {
  const guardRef = useRef<ActionNonceGuard | null>(null);
  if (!guardRef.current) {
    guardRef.current = createActionNonceGuard();
  }
  return guardRef.current;
}
