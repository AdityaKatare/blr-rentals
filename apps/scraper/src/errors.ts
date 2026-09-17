export class NotImplementedError extends Error {
  constructor(what: string, milestone: string) {
    super(`${what} is not implemented yet (planned for ${milestone})`);
    this.name = 'NotImplementedError';
  }
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    message?: string,
  ) {
    super(message ?? `HTTP ${status} for ${url}`);
    this.name = 'HttpError';
  }
}

export class BlockedError extends HttpError {
  constructor(status: number, url: string) {
    super(status, url, `Blocked with HTTP ${status} by ${new URL(url).host}; stopping (no retry, no evasion)`);
    this.name = 'BlockedError';
  }
}

export class RobotsDisallowedError extends Error {
  constructor(
    readonly url: string,
    readonly userAgent: string,
  ) {
    super(`robots.txt disallows ${url} for "${userAgent}"`);
    this.name = 'RobotsDisallowedError';
  }
}

export class RobotsUnavailableError extends Error {
  constructor(
    readonly origin: string,
    readonly status: number,
  ) {
    super(`robots.txt for ${origin} could not be fetched (status ${status}); refusing to crawl`);
    this.name = 'RobotsUnavailableError';
  }
}
