/**
 * http status codes
 *
 * - informational responses (100 – 199)
 * - Successful responses (200 – 299)
 * - Redirection messages (300 – 399)
 * - Client error responses (400 – 499)
 * - Server error responses (500 – 599)
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
 * */
export const STATUS_CODES = {
  INFORMATION_CONTINUE: 100,
  INFORMATION_SWITCHING_PROTOCOLS: 101,

  SUCCESS_OK: 200,
  SUCCESS_CREATED: 201,
  SUCCESS_ACCEPTED: 202,
  SUCCESS_NON_AUTHORITATIVE_INFORMATION: 203,
  SUCCESS_NO_CONTENT: 204,
  SUCCESS_RESET_CONTENT: 205,
  SUCCESS_PARTIAL_CONTENT: 206,

  REDIRECT_MULTIPLE_CHOICES: 300,
  REDIRECT_MOVED_PERMANENTLY: 301,
  /** aka MOVED_TEMPORARILY */
  REDIRECT_FOUND: 302,
  REDIRECT_SEE_OTHER: 303,
  REDIRECT_NOT_MODIFIED: 304,
  REDIRECT_TEMPORARY_REDIRECT: 307,
  REDIRECT_PERMANENT_REDIRECT: 308,

  CLIENTERROR_BAD_REQUEST: 400,
  CLIENTERROR_UNAUTHORIZED: 401,
  //CLIENTERROR_PAYMENT_REQUIRED: 402,
  CLIENTERROR_FORBIDDEN: 403,
  CLIENTERROR_NOT_FOUND: 404,
  CLIENTERROR_METHOD_NOT_ALLOWED: 405,
  CLIENTERROR_NOT_ACCEPTABLE: 406,
  CLIENTERROR_PROXY_AUTHENTICATION_REQUIRED: 407,
  CLIENTERROR_REQUEST_TIMEOUT: 408,
  CLIENTERROR_CONFLICT: 409,
  CLIENTERROR_GONE: 410,
  CLIENTERROR_LENGTH_REQUIRED: 411,
  CLIENTERROR_PRECONDITION_FAILED: 412,
  CLIENTERROR_PAYLOAD_TOO_LARGE: 413,
  CLIENTERROR_URI_TOO_LONG: 414,
  CLIENTERROR_UNSUPPORTED_MEDIA_TYPE: 415,
  CLIENTERROR_RANGE_NOT_SATISFIABLE: 416,
  CLIENTERROR_EXPECTATION_FAILED: 417,
  CLIENTERROR_UPGRADE_REQUIRED: 426,
  CLIENTERROR_PRECONDITION_REQUIRED: 428,
  CLIENTERROR_TOO_MANY_REQUESTS: 429,
  CLIENTERROR_REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
  CLIENTERROR_UNAVAILABLE_FOR_LEGAL_REASONS: 451,

  SERVERERROR_INTERNAL_SERVER_ERROR: 500,
  SERVERERROR_NOT_IMPLEMENTED: 501,
  SERVERERROR_BAD_GATEWAY: 502,
  SERVERERROR_SERVICE_UNAVAILABLE: 503,
  SERVERERROR_GATEWAY_TIMEOUT: 504,
  SERVERERROR_HTTP_VERSION_NOT_SUPPORTED: 505,
  SERVERERROR_NETWORK_AUTHENTICATION_REQUIRED: 511,
} as const;

/**
 * - INFORMATION_ (100 – 199)
 * - SUCCESS_ (200 – 299)
 * - REDIRECT_ (300 – 399)
 * - CLIENTERROR_ (400 – 499)
 * - SERVERERROR_ (500 – 599)
 *
 * example usage: `return errorbody("CLIENTERROR_UNAUTHORIZED", "some message")`
 *
 * for async functions there is only 2 options:
 * - return an object, for example: { hello: "world" }
 * - throw an object that looks like this: { statusCode, message };
 *
 * use methods on the `reply` param to set other things that is not simply the payload, like reply.code(201) for example
 */
export function errorMessage(
  status: keyof typeof STATUS_CODES,
  message = "no additional info"
) {
  throw { statusCode: STATUS_CODES[status], message };
}

/**
 *
 * honestly docs messy... this list copy pasted from [github.com/firebase/firebase-admin-node](https://github.com/firebase/firebase-admin-node/blob/master/src/utils/error.ts)
 * but added "messaging/" in front of codes since FirebaseError docstring sais format is like this: "service/string-code" eg. "messaging/invalid-recipient"
 *
 * ## checking for responses when sending messages
 * supposed to atleast check for `INVALID_ARGUMENT` and UNREGISTERED (aka `REGISTRATION_TOKEN_NOT_REGISTERED`)
 *
 * @see [manage-tokens](https://firebase.google.com/docs/cloud-messaging/manage-tokens#detect-invalid-token-responses-from-the-fcm-backend).
 */
export const FIREBASE_MESSAGING_ERROR_CODES = {
  INVALID_ARGUMENT: "messaging/invalid-argument",
  INVALID_RECIPIENT: "messaging/invalid-recipient",
  INVALID_PAYLOAD: "messaging/invalid-payload",
  INVALID_DATA_PAYLOAD_KEY: "messaging/invalid-data-payload-key",
  PAYLOAD_SIZE_LIMIT_EXCEEDED: "messaging/payload-size-limit-exceeded",
  INVALID_OPTIONS: "messaging/invalid-options",
  INVALID_REGISTRATION_TOKEN: "messaging/invalid-registration-token",
  REGISTRATION_TOKEN_NOT_REGISTERED:
    "messaging/registration-token-not-registered",
  MISMATCHED_CREDENTIAL: "messaging/mismatched-credential",
  INVALID_PACKAGE_NAME: "messaging/invalid-package-name",
  DEVICE_MESSAGE_RATE_EXCEEDED: "messaging/device-message-rate-exceeded",
  TOPICS_MESSAGE_RATE_EXCEEDED: "messaging/topics-message-rate-exceeded",
  MESSAGE_RATE_EXCEEDED: "messaging/message-rate-exceeded",
  THIRD_PARTY_AUTH_ERROR: "messaging/third-party-auth-error",
  TOO_MANY_TOPICS: "messaging/too-many-topics",
  AUTHENTICATION_ERROR: "messaging/authentication-error",
  SERVER_UNAVAILABLE: "messaging/server-unavailable",
  INTERNAL_ERROR: "messaging/internal-error",
  UNKNOWN_ERROR: "messaging/unknown-error",
};
