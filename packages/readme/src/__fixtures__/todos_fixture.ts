// TODO: single line inline todo

// TODO: this should be ignored // [readme-ignore]

// TODO: multi-line inline todo
// continues here
// and here

/* TODO: single line block comment */

/* TODO: this block should be ignored [readme-ignore] */

/*
 * TODO: multi-line block comment
 * continues here
 * and here
 */

/**
 * A function with a todo tag.
 * @todo single line jsdoc todo
 */
export function withSingleLineTodo(): void {}

/**
 * A function with a multi-line todo tag.
 * @todo multi-line jsdoc todo
 * continues here
 * and here
 * @param x - some param
 */
export function withMultiLineTodo(x: string): void {}

/**
 * A function with an ignored todo tag.
 * @todo this jsdoc todo should be ignored [readme-ignore]
 */
export function withIgnoredTodo(): void {}
