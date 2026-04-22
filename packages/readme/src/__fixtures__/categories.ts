/**
 * Logs a user in.
 * @public
 * @readme category=Auth
 */
export function login(username: string, password: string): boolean {
  return true
}

/**
 * Logs a user out.
 * @public
 * @readme category=Auth
 */
export function logout(): void {}

/**
 * Formats a date string.
 * @public
 * @readme category=Utility
 */
export function formatDate(date: Date): string {
  return date.toISOString()
}

/**
 * Truncates a string.
 * @public
 * @readme category=Utility
 */
export function truncate(str: string, max: number): string {
  return str.slice(0, max)
}

/**
 * A button component.
 * @public
 * @readme category=Auth kind=Components
 */
export function Button({ label }: { label: string }): unknown {
  return label
}

/**
 * An uncategorized helper.
 * @public
 */
export function noop(): void {}
