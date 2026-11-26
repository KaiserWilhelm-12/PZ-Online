export const CloseCode = {
  Normal: 1000,
  GoingAway: 1001,
  ProtocolError: 1002,
  UnsupportedData: 1003,
  PolicyViolation: 1008,
  MessageTooBig: 1009,
  InternalError: 1011,
  TryAgainLater: 1013,
  HelloTimeout: 4000,
  Unauthenticated: 4001,
  Forbidden: 4002,
  DuplicateSession: 4003,
  VersionMismatch: 4004,
  RateLimited: 4005,
  ReconnectRejected: 4006,
  HeartbeatTimeout: 4007,
  ServerFull: 4008,
  ProtocolViolation: 4009,
} as const;

export type CloseCodeValue = (typeof CloseCode)[keyof typeof CloseCode];

export type ProtocolErrorCode =
  | 'HELLO_TIMEOUT'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'DUPLICATE_SESSION'
  | 'PROTOCOL_VERSION_MISMATCH'
  | 'INVALID_MESSAGE'
  | 'PAYLOAD_TOO_LARGE'
  | 'SEQUENCE_ERROR'
  | 'RATE_LIMITED'
  | 'RECONNECT_REJECTED'
  | 'SESSION_TIMEOUT'
  | 'SERVER_FULL'
  | 'NOT_IMPLEMENTED'
  | 'INTERNAL_ERROR';

export interface ProtocolErrorPayload {
  code: ProtocolErrorCode;
  message: string;
  fatal: boolean;
}

export const protocolErrorPayload = (
  code: ProtocolErrorCode,
  message: string,
  fatal = false,
): ProtocolErrorPayload => ({ code, message, fatal });
