class ShareRaceError extends Error {
  public constructor(message: string) {
    super(message);

    this.name = 'ShareRaceError';
  }
}

export { ShareRaceError };
