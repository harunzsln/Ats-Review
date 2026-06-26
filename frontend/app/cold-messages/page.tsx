import { AuthGuard } from "@/components/AuthGuard";
import ColdMessagesPageClient from "./ColdMessagesPageClient";

export const dynamic = "force-dynamic";

export default function ColdMessagesPage() {
  return (
    <AuthGuard>
      <ColdMessagesPageClient />
    </AuthGuard>
  );
}
