// src/types/CustomSession.ts
import { Session } from "next-auth";
import { UserRole } from "@/types/UserRole";

export interface ExtendedSession extends Session {
  user: Session["user"] & {
    id: string;
    role: UserRole;
  };
}
