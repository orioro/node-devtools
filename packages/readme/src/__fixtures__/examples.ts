/**
 * Formats a value into a string using a template.
 * @public
 * @param value - the value to format
 * @param template - the template string
 * @returns the formatted string
 * @example <caption>Basic usage</caption>
 * // Works with numbers
 * const result = format(42, 'The answer is {0}')
 * console.log(result)
 * // => 'The answer is 42'
 *
 * // Works with any value
 * const bool = format(true, 'Flag is {0}')
 * console.log(bool)
 * // => 'Flag is true'
 * @example
 * // Nested inside a helper
 * function greet(name: string): string {
 *   return format(name, 'Hello, {0}! Welcome back.')
 * }
 *
 * console.log(greet('Alice'))
 * // => 'Hello, Alice! Welcome back.'
 *
 * console.log(greet('Bob'))
 * // => 'Hello, Bob! Welcome back.'
 */
export function format(value: unknown, template: string): string {
  return template.replace('{0}', String(value))
}
