type Result<T> = { data: T; error: null } | { data: null; error: string }

/**
 * Fetches a user by id.
 * @public
 * @param id - user identifier
 * @param options - request options
 * @returns resolved user result
 */
export async function fetchUser(
  id: string,
  options?: { timeout?: number; retries?: number },
): Promise<Result<{ id: string; name: string }>> {
  throw new Error('not implemented')
}

/**
 * Greets using an arrow function.
 * @public
 * @param name - the name to greet
 */
export const greet = (name: string): string => `Hello, ${name}!`

/**
 * A simple class.
 * @public
 */
export class Greeter {
  greet(name: string) {
    return `Hello, ${name}`
  }
}
