import { AuthGuard } from "@/components/AuthGuard";
import CvPageClient from "./CvPageClient";

export const dynamic = "force-dynamic";

export default function CvPage() {
  return (
    <AuthGuard>
      <CvPageClient />
    </AuthGuard>
  );
}
