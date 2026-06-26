import { AuthGuard } from "@/components/AuthGuard";
import JobsPageClient from "./JobsPageClient";

export const dynamic = "force-dynamic";

export default function JobsPage() {
  return (
    <AuthGuard>
      <JobsPageClient />
    </AuthGuard>
  );
}
