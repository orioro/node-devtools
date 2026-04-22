type Status = 'active' | 'inactive' | 'pending'

type Address = {
  street: string
  city: string
}

type UserProfile = {
  id: string
  name: string
  status: Status
  address: Address
}

type UserList = {
  items: UserProfile[]
  total: number
}

/**
 * Finds a user by id.
 * @public
 * @param id - user identifier
 * @returns the matching user profile, or null if not found
 */
export function findUser(id: string): UserProfile | null {
  return null
}

/**
 * Updates a user's profile fields.
 * @public
 * @param id - user identifier
 * @param patch - fields to update
 */
export function updateUser(
  id: string,
  patch: Partial<UserProfile>,
): UserProfile {
  throw new Error('not implemented')
}

/**
 * Lists all users.
 * @public
 */
export function listUsers(): UserList {
  throw new Error('not implemented')
}
