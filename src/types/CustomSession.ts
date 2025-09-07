// src/types/CustomSession.ts
import { Session } from "next-auth";
import { UserRole } from "@/utils/auth/accessControl";

export interface ExtendedSession extends Session {
  user: Session["user"] & {
    id: string;
    role: UserRole;
  };
}
