export type IdleTask = (deadline?: IdleDeadline) => void;

export const scheduleIdleTask = (task: IdleTask, timeout = 1000): void => {
  if (typeof window === 'undefined') {
    return;
  }
  const idleCallback = (window as Window & { requestIdleCallback?: any }).requestIdleCallback;
  if (typeof idleCallback === 'function') {
    idleCallback((deadline: IdleDeadline) => task(deadline), { timeout });
    return;
  }
  window.setTimeout(() => task(undefined), timeout);
};
