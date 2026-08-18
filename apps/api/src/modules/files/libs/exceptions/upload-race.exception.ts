class UploadRaceError extends Error {
  public constructor(message: string) {
    super(message);

    this.name = 'UploadRaceError';
  }
}

export { UploadRaceError };
