export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidOrderIdError extends DomainError {
  constructor(value: string) {
    super(`Invalid order ID: "${value}". Must be a non-empty numeric string.`);
  }
}

export class InvalidOrderError extends DomainError {
  constructor(reason: string) {
    super(`Invalid order: ${reason}`);
  }
}

export class InvalidPlatformNotImplementedError extends DomainError {
  constructor(errorMessage: string) {
    super(`Error: ${errorMessage}`);
  }
}

export class InvalidClientError extends DomainError {
  constructor(reason: string) {
    super(`Invalid client: ${reason}`);
  }
}

export class InvalidStoreError extends DomainError {
  constructor(reason: string) {
    super(`Invalid store: ${reason}`);
  }
}