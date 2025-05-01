// src/components/UserMenu/UserMenu.tsx
import { Button } from "@/components/ui/Button/Button";
import { signOut } from "next-auth/react";
import {
  ForceRefreshButton,
  SystemCheckButton,
  RunCleanupButton,
} from "@/components/UserMenuCommands";

type Props = {
  userName?: string;
  userRole: string;
  onForceRefresh: () => void;
};

export const UserMenu = ({ userName, userRole, onForceRefresh }: Props) => (
  <div className="flex items-center gap-4 relative">
    <h3 className="text-sm sm:text-base font-semibold whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
      {userName ?? "unknown"} ({userRole})
    </h3>

    {userRole === "admin" && (
      <div className="relative group">
        <Button variant="secondary" className="px-4 py-2 rounded text-sm">
          Admin
        </Button>
        <div className="absolute hidden group-hover:flex flex-col right-0 top-full bg-gray-800 rounded shadow-lg z-50 min-w-[320px]">
          <ForceRefreshButton onForceRefresh={onForceRefresh} />
          <SystemCheckButton />
          <RunCleanupButton />
        </div>
      </div>
    )}

    <Button variant="default" onClick={() => signOut({ callbackUrl: "/" })} className="px-3 py-2 rounded text-sm">
      Logout
    </Button>
  </div>
);
