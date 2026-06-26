import { AuthGuard } from "@/components/AuthGuard";
import AccountPageClient from "./AccountPageClient";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  return (
    <AuthGuard>
      <AccountPageClient />
    </AuthGuard>
  );
}
