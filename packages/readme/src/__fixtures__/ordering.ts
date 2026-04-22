/**
 * Zebra fn, no order — should sort alphabetically among unordered.
 * @public
 */
export function zebra(): void {}

/**
 * Alpha fn, no order — should sort alphabetically among unordered.
 * @public
 */
export function alpha(): void {}

/**
 * Second priority.
 * @public
 * @readme order=2
 */
export function second(): void {}

/**
 * First priority.
 * @public
 * @readme order=1
 */
export function first(): void {}

/**
 * Also second priority — tie broken alphabetically, so 'also' before 'second'.
 * @public
 * @readme order=2
 */
export function also(): void {}
