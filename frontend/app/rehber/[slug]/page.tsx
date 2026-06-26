import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GUIDES, GUIDE_ORDER } from "@/lib/guides";
import { GuideLayout } from "@/components/marketing/GuideLayout";

export function generateStaticParams() {
  return GUIDE_ORDER.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = GUIDES[slug];
  if (!guide) return { title: "Rehber bulunamadı" };
  return {
    title: `${guide.title} — ATS Review CV Rehberi`,
    description: guide.description,
    openGraph: { title: guide.title, description: guide.description },
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = GUIDES[slug];
  if (!guide) notFound();
  return <GuideLayout guide={guide} />;
}
