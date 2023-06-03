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
  CONTINUE: 100,
  SWITCHING_PROTOCOLS: 101,

  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NON_AUTHORITATIVE_INFORMATION: 203,
  NO_CONTENT: 204,
  RESET_CONTENT: 205,
  PARTIAL_CONTENT: 206,

  MULTIPLE_CHOICES: 300,
  MOVED_PERMANENTLY: 301,
  /** aka MOVED_TEMPORARILY */
  FOUND: 302,
  SEE_OTHER: 303,
  NOT_MODIFIED: 304,
  TEMPORARY_REDIRECT: 307,
  PERMANENT_REDIRECT: 308,

  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  //PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  PROXY_AUTHENTICATION_REQUIRED: 407,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  LENGTH_REQUIRED: 411,
  PRECONDITION_FAILED: 412,
  PAYLOAD_TOO_LARGE: 413,
  URI_TOO_LONG: 414,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RANGE_NOT_SATISFIABLE: 416,
  EXPECTATION_FAILED: 417,
  UPGRADE_REQUIRED: 426,
  PRECONDITION_REQUIRED: 428,
  TOO_MANY_REQUESTS: 429,
  REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
  UNAVAILABLE_FOR_LEGAL_REASONS: 451,

  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
  HTTP_VERSION_NOT_SUPPORTED: 505,
  NETWORK_AUTHENTICATION_REQUIRED: 511,
} as const;

/**
 * example usage: `throw errorbody("UNAUTHORIZED", "some message")`
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
  return { statusCode: STATUS_CODES[status], message };
}
