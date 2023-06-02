/**
 * example usage: `throw errorbody(401, "some message")`
 *
 * for async functions there is only 2 options:
 * - return an object, for example: { hello: "world" }
 * - throw an object that looks like this: { statusCode, message };
 *
 * use methods on the `reply` param to set other things that is not simply the payload, like reply.code(201) for example
 */
export function errorMessage(statusCode: number, message?: string) {
  return { statusCode, message: message || "no info" };
}
