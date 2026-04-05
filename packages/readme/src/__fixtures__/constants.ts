type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Current package version.
 * @public
 */
export const VERSION = '1.0.0'

/**
 * Maximum number of retries before giving up.
 * @public
 */
export const MAX_RETRIES = 3

/**
 * Default request configuration.
 * @public
 */
export const DEFAULT_CONFIG = {
  timeout: 5000,
  retries: 3,
  verbose: false,
}

/**
 * Default log level. Type inferred from explicit annotation.
 * @public
 */
export const DEFAULT_LOG_LEVEL: LogLevel = 'info'
