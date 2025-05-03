// src/components/UserMenu/UserMenu.tsx
import { Button } from "@/components/ui/Button/Button";
import { signOut } from "next-auth/react";
import {
    ExportEntriesButton,
    AboutButton,
    ForceRefreshButton,
    SystemCheckButton,
    RunCleanupButton,
    SystemDiskInfoButton,
    ScheduleButton,
} from "@/components/UserMenuCommands";
import { hasRole, UserRole } from "@/types/UserRole";

type Props = {
    userName?: string;
    userRole: UserRole;
    showForceRefresh?: boolean;
    onForceRefresh: () => void;
    onExport: () => void;
    canExport: boolean;
};

export const UserMenu = ({ userName, userRole, onForceRefresh, onExport, canExport, showForceRefresh }: Props) => (
    <div className="flex items-center gap-4 relative">
        <h1 className="text-sm font-medium text-white/50 whitespace-nowrap overflow-hidden text-ellipsis max-w-[250px]">{userName ?? "unknown"}</h1>

        <div className="relative group">
            <Button variant="secondary" className="px-4 py-2 rounded text-sm">
                Menu
            </Button>
            <div className="absolute hidden group-hover:flex flex-col right-0 top-full bg-gray-800 rounded shadow-lg z-50 min-w-[320px]">
                {hasRole(userRole, "streamer") && (
                    <div>
                        <ScheduleButton />
                    </div>
                )}
                {hasRole(userRole, "moderator") && (
                    <div>
                        <ExportEntriesButton onExport={onExport} disabled={!canExport} />

                        {showForceRefresh && (
                            <ForceRefreshButton
                                onForceRefresh={onForceRefresh}
                                tooltip="Force refresh the current streaming service and reload its playlist"
                            />
                        )}
                    </div>
                )}
                {hasRole(userRole, "admin") && (
                    <div>
                        <SystemCheckButton />
                        <SystemDiskInfoButton />
                        <RunCleanupButton />
                    </div>
                )}
                <AboutButton />
                <Button variant="default" onClick={() => signOut({ callbackUrl: "/" })} className="px-3 py-2 rounded text-sm">
            Logout
        </Button>
            </div>
        </div>
    </div>
);
