export class NotImplementedError extends Error {
  constructor(what: string, milestone: string) {
    super(`${what} is not implemented yet (planned for ${milestone})`);
    this.name = 'NotImplementedError';
  }
}
