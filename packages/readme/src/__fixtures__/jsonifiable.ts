import type { Jsonifiable } from 'type-fest'

/**
 * Serializes a value to a JSON string.
 * @public
 * @param value - any JSON-serializable value
 * @returns the JSON string representation
 */
export function serialize(value: Jsonifiable): string {
  return JSON.stringify(value)
}
