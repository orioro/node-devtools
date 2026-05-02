export type NodeState = Record<string, unknown> | unknown[]

export type NodeId = string

export type FnNodeIdArray = (state: NodeState) => NodeId[]

export type FnNodeEntry = (state: NodeState, id: NodeId) => unknown

// Simulates a factory/wrapper type pattern (e.g. TreeQueryProvider<T>)
type QueryProvider<T> = (model: unknown) => [T, () => string]

/**
 * Returns IDs of all nodes in state.
 * @signature function nodeIdArray(state: NodeState): NodeId[]
 * @param state - the tree state
 * @returns array of node ids
 * @public
 */
export const nodeIdArray: QueryProvider<FnNodeIdArray> = () => [
  (state) =>
    Array.isArray(state) ? state.map((n: any) => n.id) : Object.keys(state),
  () => 'constant_key',
]

/**
 * Returns a node entry by id.
 * @signature function nodeEntry(state: NodeState, id: NodeId): unknown
 * @param state - the tree state
 * @param id - the node id
 * @returns the node or undefined
 * @public
 */
export const nodeEntry: QueryProvider<FnNodeEntry> = () => [
  (state, id) => (Array.isArray(state) ? undefined : (state as any)[id]),
  (id) => id,
]

/**
 * No signature tag — falls back to normal type inference.
 * @public
 */
export const noSignatureTag: QueryProvider<FnNodeIdArray> = () => [
  () => [],
  () => 'key',
]

/**
 * Signature tag that references no local types.
 * @signature function primitiveOnly(count: number, label: string): boolean
 * @public
 */
export const primitiveOnly: QueryProvider<FnNodeIdArray> = () => [
  () => [],
  () => 'key',
]

/**
 * Multiline signature spanning multiple JSDoc lines.
 * @signature function multiLine(
 *   state: NodeState,
 *   id: NodeId,
 *   depth: number
 * ): NodeId[]
 * @param state - the tree state
 * @param id - root node id
 * @param depth - max traversal depth
 * @public
 */
export const multiLine: QueryProvider<FnNodeIdArray> = () => [
  () => [],
  () => 'key',
]
