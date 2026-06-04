export type UserRole = 'admin' | 'user'

export interface User {
  id: string
  name: string
  role: UserRole
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignUpData {
  name: string
  email: string
  password: string
}
