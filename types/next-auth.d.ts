
import { UserRole } from "../src/utils/auth/accessControl" //"@/utils/auth/accessControl"; // or from "@/types/UserRole" if you're keeping it isolated
import type { Theme } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      id?: string;
      role?: UserRole;
      username?: string | null;
      theme?: Theme;
      profileImage?: string | null;
    };
  }

  interface User {
    role?: UserRole;
    username?: string | null;
    theme?: Theme;
    profileImage?: string | null;
  }

  interface JWT {
    role?: UserRole;
    username?: string | null;
    theme?: Theme;
    profileImage?: string | null;
    id?: string;
    lastProvider?: string;
  }
}
