<template>
  <div class="api-playground">
    <form class="request" @submit.prevent="send">
      <div class="request-grid">
        <label class="field">
          <span>Method</span>
          <select v-model="method">
            <option v-for="option in methods" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </label>
        <label class="field">
          <span>Base URL</span>
          <input v-model="baseUrl" type="text" spellcheck="false" />
        </label>
        <label class="field">
          <span>Path</span>
          <input v-model="path" type="text" spellcheck="false" />
        </label>
      </div>
      <label class="field">
        <span>Request body</span>
        <textarea
          v-model="body"
          rows="8"
          spellcheck="false"
          :disabled="method === 'GET'"
        />
      </label>
      <div class="toggles">
        <label class="toggle">
          <input type="checkbox" v-model="mockMode" />
          <span>Use mock response</span>
        </label>
        <span class="hint">Resolved URL: {{ resolvedUrl }}</span>
      </div>
      <button class="send" type="submit" :disabled="loading">
        {{ loading ? 'Sending…' : 'Send request' }}
      </button>
    </form>

    <section class="result" aria-live="polite">
      <header>
        <strong>Response</strong>
        <span v-if="status" class="status">{{ status }}</span>
      </header>
      <pre v-if="responseText"><code>{{ responseText }}</code></pre>
      <p v-else class="empty">No response yet.</p>
      <p v-if="error" class="error">{{ error }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const method = ref<HttpMethod>('POST');
const baseUrl = ref('http://localhost:8787');
const path = ref('/api/products');
const body = ref(
  JSON.stringify(
    {
      productId: 'hex-blade-9',
      name: 'Hex Blade 9',
      price: '49.00',
      currency: 'USD',
      availability: 'in-stock'
    },
    null,
    2
  )
);
const responseText = ref('');
const status = ref<string | null>(null);
const loading = ref(false);
const mockMode = ref(true);
const error = ref<string | null>(null);

const buildRequestUrl = () => {
  const trimmedBase = baseUrl.value.trim();
  if (!trimmedBase) {
    throw new Error('Base URL is required');
  }
  const normalizedBase = trimmedBase.endsWith('/') ? trimmedBase : `${trimmedBase}/`;
  const trimmedPath = path.value.trim().replace(/^\//, '');
  return new URL(trimmedPath, normalizedBase).toString();
};

const resolvedUrl = computed(() => {
  try {
    return buildRequestUrl();
  } catch (err) {
    return (err as Error).message;
  }
});

const generateRequestId = () => {
  const cryptoApi = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoApi && 'randomUUID' in cryptoApi) {
    return cryptoApi.randomUUID();
  }
  return `mock-${Math.random().toString(16).slice(2)}`;
};

const mockResponse = () => ({
  ok: true,
  requestId: generateRequestId(),
  receivedAt: new Date().toISOString(),
  replayTopic: '/blue-ocean/products/1',
  echo: {
    method: method.value,
    url: resolvedUrl.value,
    body: method.value === 'GET' ? undefined : safeParseBody()
  }
});

const safeParseBody = () => {
  if (!body.value || method.value === 'GET') {
    return undefined;
  }
  try {
    return JSON.parse(body.value);
  } catch (err) {
    return body.value;
  }
};

const send = async () => {
  loading.value = true;
  status.value = null;
  responseText.value = '';
  error.value = null;

  try {
    if (mockMode.value) {
      const mock = mockResponse();
      responseText.value = JSON.stringify(mock, null, 2);
      status.value = '200 (mock)';
      return;
    }

    const url = buildRequestUrl();
    const init: RequestInit = {
      method: method.value
    };

    if (method.value !== 'GET' && body.value) {
      init.headers = {
        'Content-Type': 'application/json'
      };
      init.body = body.value;
    }

    const res = await fetch(url, init);
    status.value = `${res.status} ${res.statusText}`.trim();
    const text = await res.text();

    if (!text) {
      responseText.value = '<empty response>';
      return;
    }

    try {
      const parsed = JSON.parse(text);
      responseText.value = JSON.stringify(parsed, null, 2);
    } catch {
      responseText.value = text;
    }
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.api-playground {
  display: grid;
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.request {
  display: grid;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
}

.request-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.field {
  display: grid;
  gap: 0.35rem;
  font-size: 0.95rem;
}

.field input,
.field select,
.field textarea {
  font: inherit;
  padding: 0.5rem 0.65rem;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.field textarea {
  resize: vertical;
  min-height: 160px;
}

.toggles {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.hint {
  font-family: var(--vp-font-family-mono);
}

.send {
  justify-self: start;
  padding: 0.55rem 1.25rem;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  background: linear-gradient(135deg, #2563eb, #0ea5e9);
  color: white;
}

.send[disabled] {
  opacity: 0.6;
  cursor: progress;
}

.result {
  padding: 1.25rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg);
  display: grid;
  gap: 0.75rem;
}

.result header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status {
  font-size: 0.85rem;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-2);
}

.empty {
  font-size: 0.9rem;
  color: var(--vp-c-text-3);
}

.error {
  color: var(--vp-c-brand-1);
  font-size: 0.9rem;
}

pre {
  margin: 0;
  padding: 1rem;
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  overflow-x: auto;
}
</style>
