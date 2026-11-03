export function createBus() {
  const listeners = {};
  return {
    on(type, fn) {
      (listeners[type] ??= []).push(fn);
    },
    emit(type, payload) {
      for (const fn of listeners[type] ?? []) fn(payload);
    },
  };
}
