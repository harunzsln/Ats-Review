import { AuthGuard } from "@/components/AuthGuard";
import InterviewsPageClient from "./InterviewsPageClient";

export const dynamic = "force-dynamic";

export default function InterviewsPage() {
  return (
    <AuthGuard>
      <InterviewsPageClient />
    </AuthGuard>
  );
}
