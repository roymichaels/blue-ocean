const closeAsync = jest.fn();
const openDatabaseAsync = jest.fn(async () => ({ closeAsync }));

jest.mock('expo-sqlite', () => ({ openDatabaseAsync }));

describe('getDatabase handle reuse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('waits for closing before opening a new handle', async () => {
    let resolveClose: () => void;
    closeAsync.mockImplementation(
      () => new Promise<void>((resolve) => {
        resolveClose = resolve;
      })
    );

    const { getDatabase, closeDatabase } = await import('../lib/sqlite');

    await getDatabase();

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const closing = closeDatabase();
    const reopenPromise = getDatabase();

    // while closing unresolved, openDatabaseAsync should not be called again
    await Promise.resolve();
    expect(openDatabaseAsync).toHaveBeenCalledTimes(1);

    resolveClose!();
    await closing;
    await reopenPromise;

    expect(openDatabaseAsync).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
