// Floor on both outcomes: login answers in the same time whatever the reason.
export async function atLeast<T>(ms: number, run: () => Promise<T>): Promise<T> {
  const floor = new Promise<void>((resolve) => setTimeout(resolve, ms));
  try {
    return await run();
  } finally {
    await floor;
  }
}
