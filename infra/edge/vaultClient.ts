import { randomBytes } from 'crypto';
import type { VaultKeyRecord, VaultKeyRing, VaultKeyStatus } from './types';

export interface VaultClientOptions {
  baseUrl: string;
  token: string;
  mountPath?: string;
  namespace?: string;
  timeoutMs?: number;
}

function stripSlashes(input: string): string {
  return input.replace(/^\/+/, '').replace(/\/+$/, '');
}

function cloneKey(record: VaultKeyRecord | null): VaultKeyRecord | null {
  if (!record) return null;
  return {
    ...record,
    metadata: record.metadata ? { ...record.metadata } : undefined,
  };
}

export class VaultClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: HeadersInit;
  private readonly timeoutMs: number;
  private readonly mountPath: string;

  constructor(options: VaultClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.defaultHeaders = {
      'X-Vault-Token': options.token,
      ...(options.namespace ? { 'X-Vault-Namespace': options.namespace } : {}),
    } satisfies HeadersInit;
    this.mountPath = stripSlashes(options.mountPath ?? 'secret');
  }

  private mergeHeaders(extra?: HeadersInit): Headers {
    const headers = new Headers(this.defaultHeaders);
    if (!extra) {
      return headers;
    }
    const additional = extra instanceof Headers ? extra : new Headers(extra);
    additional.forEach((value, key) => {
      headers.set(key, value);
    });
    return headers;
  }

  private async send(path: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: this.mergeHeaders(init?.headers),
        signal: controller.signal,
      });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Vault request timed out after ${this.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private path(functionName: string): string {
    const name = stripSlashes(functionName);
    return `/v1/${this.mountPath}/data/edge/${name}`;
  }

  private deserialize(data: any): VaultKeyRing {
    const fallback: VaultKeyRing = {
      active: null,
      pending: null,
      retired: [],
      updatedAt: new Date(0).toISOString(),
    };
    if (!data || typeof data !== 'object') {
      return fallback;
    }
    const parseKey = (raw: any): VaultKeyRecord | null => {
      if (!raw || typeof raw !== 'object') return null;
      if (!raw.id || !raw.secret) return null;
      return {
        id: String(raw.id),
        secret: String(raw.secret),
        status: raw.status as VaultKeyStatus,
        createdAt: String(raw.createdAt),
        activateAt: String(raw.activateAt ?? raw.createdAt),
        expiresAt: String(raw.expiresAt ?? raw.createdAt),
        metadata: raw.metadata && typeof raw.metadata === 'object' ? { ...raw.metadata } : undefined,
      };
    };
    return {
      active: parseKey(data.active),
      pending: parseKey(data.pending),
      retired: Array.isArray(data.retired)
        ? (data.retired.map(parseKey).filter(Boolean) as VaultKeyRecord[])
        : [],
      updatedAt: data.updatedAt ? String(data.updatedAt) : new Date().toISOString(),
    };
  }

  async readKeyRing(functionName: string): Promise<VaultKeyRing> {
    const response = await this.send(this.path(functionName));
    if (response.status === 404) {
      return {
        active: null,
        pending: null,
        retired: [],
        updatedAt: new Date().toISOString(),
      };
    }
    const text = await response.text();
    if (!response.ok) {
      throw new Error(
        `Vault request failed with status ${response.status}: ${text || response.statusText}`,
      );
    }
    if (!text) {
      return this.deserialize(null);
    }
    let json: any;
    try {
      json = JSON.parse(text);
    } catch (error) {
      throw new Error(`Vault returned invalid JSON: ${(error as Error).message}`);
    }
    const payload = json?.data?.data ?? json?.data ?? json;
    return this.deserialize(payload);
  }

  async writeKeyRing(functionName: string, ring: VaultKeyRing): Promise<void> {
    const payload = {
      data: {
        active: cloneKey(ring.active),
        pending: cloneKey(ring.pending),
        retired: ring.retired.map((item) => cloneKey(item)),
        updatedAt: new Date().toISOString(),
      },
    };
    const response = await this.send(this.path(functionName), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Vault request failed with status ${response.status}: ${body || response.statusText}`,
      );
    }
  }

  createKeyRecord(
    status: VaultKeyStatus,
    now: Date,
    rotationIntervalMs: number,
    activateInMs: number,
    metadata?: Record<string, string>,
  ): VaultKeyRecord {
    const id = randomBytes(12).toString('hex');
    const secret = randomBytes(32).toString('base64');
    const createdAt = now.toISOString();
    const activationTarget = new Date(now.getTime() + Math.max(activateInMs, 0));
    const activateAt = activationTarget.toISOString();
    const expiresAt = new Date(
      activationTarget.getTime() + Math.max(rotationIntervalMs, 0),
    ).toISOString();
    return {
      id,
      secret,
      status,
      createdAt,
      activateAt,
      expiresAt,
      metadata: metadata ? { ...metadata } : undefined,
    };
  }

  async getVerificationKeys(
    functionName: string,
    now = new Date(),
    gracePeriodMs = 5 * 60 * 1000,
  ): Promise<VaultKeyRecord[]> {
    const ring = await this.readKeyRing(functionName);
    const cutoff = now.getTime() - Math.max(gracePeriodMs, 0);
    const keys: VaultKeyRecord[] = [];
    if (ring.active) {
      keys.push(ring.active);
    }
    if (ring.pending) {
      const activateAt = new Date(ring.pending.activateAt).getTime();
      if (activateAt <= now.getTime()) {
        keys.push(ring.pending);
      }
    }
    for (const retired of ring.retired) {
      const retiredAt = new Date(retired.expiresAt).getTime();
      if (retiredAt >= cutoff) {
        keys.push(retired);
      } else {
        break;
      }
    }
    return keys;
  }
}
