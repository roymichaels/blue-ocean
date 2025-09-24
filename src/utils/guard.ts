// TOUCHPOINT: utils/guard.ts renders in production — Fix Pack v2
export function guard(
  address: string | null,
  connect: () => Promise<void>,
  action: () => void,
) {
  return async () => {
    if (!address) {
      await connect();
    } else {
      action();
    }
  };
}

export default guard;
