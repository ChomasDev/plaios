export interface CapabilityError {
  code: string;
  message: string;
  retryable?: boolean;
  details?: unknown;
}

export interface CapabilitySuccess<T> {
  success: true;
  data: T;
}

export interface CapabilityFailure {
  success: false;
  error: CapabilityError;
}

export type CapabilityResult<T = unknown> =
  | CapabilitySuccess<T>
  | CapabilityFailure;
