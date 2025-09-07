// src/app/profile/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import SelfEditForm from "@/components/User/SelfEditForm";
import ConnectMicrosoftButton from "@/components/User/ConnectMicrosoftButton";
import ConnectGoogleButton from "@/components/User/ConnectGoogleButton";
import ConnectedAccountsPanel from "@/components/User/ConnectedAccountsPanel";
import { ProviderId } from "@/lib/auth/provider-ids";
import { globalProviders } from "@/lib/auth/policy";
import { Button } from "@/components/ui/Button/Button";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const [enabled, accounts] = await Promise.all([
        globalProviders(),
        prisma.account.findMany({ where: { userId: session.user.id }, select: { id: true, provider: true, label: true, image: true } }),
    ]);

    const linked = new Set(accounts.map((a) => a.provider));
    const isLinked = (...ids: string[]) => ids.some((id) => linked.has(id));

    const showGoogle = enabled.google && !isLinked(ProviderId.Google);
    const showMicrosoft = enabled[ProviderId.AzureAd] && !isLinked(ProviderId.AzureAd);
    const formId = "self-edit-form";

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            <h1 className="text-2xl font-bold">Your Profile</h1>
            <p className="text-gray-400">Manage your account details and connected accounts.</p>
            <SelfEditForm formId={formId} />
            <div className="flex gap-3">
                {showMicrosoft && <ConnectMicrosoftButton />}
                {showGoogle && <ConnectGoogleButton />}
                {/* Steam connect intentionally omitted */}
            </div>
            <ConnectedAccountsPanel />
            <Button type="submit" form={formId} variant="important" className="w-full">
                Save
            </Button>
        </div>
    );
}

