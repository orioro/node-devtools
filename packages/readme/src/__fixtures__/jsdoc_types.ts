/**
 * Converts a value using a custom formatter.
 * @public
 * @param value {any} - the value to format
 * @param options {FormatterOptions} - formatting options
 * @returns {string} formatted result
 */
export function format(value: unknown, options?: Record<string, unknown>): unknown {
  return String(value)
}

/**
 * Computes a score.
 * @public
 * @param input - raw input (no JSDoc type — should use TS type)
 * @returns the numeric score
 */
export function score(input: string): number {
  return input.length
}
