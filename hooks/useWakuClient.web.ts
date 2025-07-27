export function useWakuClient() {
  return {
    send: async () => { /* noop */ },
    subscribe: async () => {},
    fetchHistory: async () => {},
  };
}
