import { AuthGuard } from "@/components/AuthGuard";
import ScorePageClient from "./ScorePageClient";

export const dynamic = "force-dynamic";

export default async function ScorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AuthGuard>
      <ScorePageClient jobPostingId={id} />
    </AuthGuard>
  );
}
