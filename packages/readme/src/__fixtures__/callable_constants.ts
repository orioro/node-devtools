type ValidationResult = true | { message: string; path: string[] }

type ValidatorFn = (value: unknown) => ValidationResult

interface Validate {
  (value: unknown): ValidationResult
  string: ValidatorFn
  number: ValidatorFn
  required: ValidatorFn
}

function makeValidator(check: (v: unknown) => boolean, message: string): ValidatorFn {
  return (value) => (check(value) ? true : { message, path: [] })
}

function buildValidate(): Validate {
  const fn = (value: unknown): ValidationResult =>
    value !== undefined ? true : { message: 'invalid', path: [] }
  ;(fn as Validate).string = makeValidator((v) => typeof v === 'string', 'must be string')
  ;(fn as Validate).number = makeValidator((v) => typeof v === 'number', 'must be number')
  ;(fn as Validate).required = makeValidator((v) => v !== undefined && v !== null, 'required')
  return fn as Validate
}

/**
 * Validates a value. Callable as a function; type validators attached as properties.
 * @param value - value to validate
 * @returns true when valid, or an object with message and path
 * @public
 */
export const validate: Validate = buildValidate()
