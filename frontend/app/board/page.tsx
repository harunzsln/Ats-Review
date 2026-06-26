import { AuthGuard } from "@/components/AuthGuard";
import { KanbanBoard } from "@/components/KanbanBoard";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function BoardPage() {
  return (
    <AuthGuard>
      <div className="space-y-4">
        <PageHeader
          title="Başvuru Panosu"
          subtitle="Kartları sürükleyerek durumu değiştirin; detay, not ve silme için karta tıklayın."
        />
        <KanbanBoard />
      </div>
    </AuthGuard>
  );
}
