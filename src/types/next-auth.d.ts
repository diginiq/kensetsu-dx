import { UserRole } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
      companyId: string | null
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: UserRole
    companyId: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    companyId: string | null
  }
}
