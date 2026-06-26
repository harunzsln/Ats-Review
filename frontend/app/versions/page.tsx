import { AuthGuard } from "@/components/AuthGuard";
import VersionsPageClient from "./VersionsPageClient";

export const dynamic = "force-dynamic";

export default function VersionsPage() {
  return (
    <AuthGuard>
      <VersionsPageClient />
    </AuthGuard>
  );
}
