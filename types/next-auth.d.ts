
import { UserRole } from "../src/utils/auth/accessControl" //"@/utils/auth/accessControl"; // or from "@/types/UserRole" if you're keeping it isolated

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      id?: string;
      role?: UserRole;
    };
  }

  interface User {
    role?: UserRole;
  }

  interface JWT {
    role?: UserRole;
  }
}