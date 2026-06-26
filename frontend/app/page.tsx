"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import Dashboard from "@/components/Dashboard";
import { ScoreGauge } from "@/components/score/ScoreWidgets";
import { PricingTable } from "@/components/marketing/PricingTable";

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="text-center text-sm text-slate-400">Yükleniyor...</p>;
  }

  if (user) return <Dashboard />;

  return (
    <div className="space-y-20 pb-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-brand-700 via-brand to-brand-600 p-8 text-white shadow-lift dark:border-slate-800 sm:p-12">
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-blue-50">
              KVKK uyumlu · Yapay zekâ destekli kariyer platformu
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              CV&apos;ni her ilana göre optimize et,
              <br className="hidden sm:block" /> ATS skorunu anında gör.
            </h1>
            <p className="mt-4 max-w-xl text-blue-50/90">
              Tutarlı ve şeffaf bir ATS uyum skoru, ilana özel CV optimizasyonu,
              başvuru takibi, mülakat provası ve networking asistanı — hepsi tek
              yerde, kişisel verilerin güvende.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand shadow-sm transition-colors hover:bg-blue-50"
              >
                Ücretsiz CV skorunu al
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Giriş yap
              </Link>
            </div>
            <p className="mt-3 text-xs text-blue-100/80">
              Kredi kartı gerekmez · İlk 3 analiz ücretsiz
            </p>
          </div>

          {/* Signature score visual */}
          <div className="flex justify-center">
            <div className="rounded-2xl bg-white/10 p-6 backdrop-blur">
              <ScoreGauge score={82} bandKey="good" size={220} />
              <p className="mt-3 text-center text-sm text-blue-50">
                Deterministik ATS skoru
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section>
        <h2 className="text-center text-2xl font-bold text-slate-900 dark:text-slate-100">
          Tek platform, uçtan uca iş arama
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-card transition-shadow hover:shadow-lift dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="text-2xl">{f.icon}</div>
              <h3 className="mt-3 font-semibold text-slate-900 dark:text-slate-100">
                {f.title}
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Guides */}
      <section>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            CV Rehberi
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Etkili bir CV yazmanın temellerini öğren, sonra ücretsiz skorunu al.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GUIDES.map((g) => (
            <Link
              key={g.href}
              href={g.href}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="text-2xl">{g.icon}</div>
              <h3 className="mt-3 font-semibold text-slate-900 group-hover:text-brand dark:text-slate-100">
                {g.title}
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {g.excerpt}
              </p>
              <span className="mt-3 inline-block text-sm font-medium text-brand">
                Oku →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Basit, şeffaf fiyatlandırma
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Ücretsiz başla, hazır olduğunda Pro&apos;ya yükselt.
          </p>
        </div>
        <div className="mx-auto mt-8 max-w-3xl">
          <PricingTable />
        </div>
      </section>

      {/* Final CTA */}
      <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-card dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          CV&apos;n bir sonraki işine hazır mı?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-400">
          Dakikalar içinde ilk ATS skorunu al ve nasıl daha iyi yapabileceğini
          gör.
        </p>
        <Link
          href="/register"
          className="mt-5 inline-block rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Ücretsiz başla
        </Link>
      </section>
    </div>
  );
}

const FEATURES = [
  {
    icon: "📊",
    title: "Tutarlı ATS Skoru",
    body: "Aynı CV + ilan her zaman aynı skoru verir. Kategori bazlı, şeffaf ve açıklanabilir.",
  },
  {
    icon: "📄",
    title: "İlana Özel Optimizasyon",
    body: "CV'ni ilanın gereksinimlerine göre uyarlayan, diff ile gösteren akış.",
  },
  {
    icon: "🗂️",
    title: "Başvuru Panosu",
    body: "Sürükle-bırak Kanban; durumlar gerçek zamanlı senkronlanır.",
  },
  {
    icon: "🎤",
    title: "Mülakat Simülatörü",
    body: "Zayıf noktalarına odaklanan yapay zekâ destekli soru-cevap provası.",
  },
  {
    icon: "✉️",
    title: "Networking Asistanı",
    body: "KVKK uyumlu, kişiselleştirilmiş LinkedIn soğuk mesaj taslakları.",
  },
  {
    icon: "🔒",
    title: "KVKK by design",
    body: "Açık rıza, hard-delete, veri dışa aktarma, kısa ömürlü imzalı dosya URL'leri.",
  },
];

const GUIDES = [
  {
    href: "/rehber/cv-nedir",
    icon: "📘",
    title: "CV Nedir?",
    excerpt: "CV'nin tanımı ve neden kariyerinde kritik olduğu.",
  },
  {
    href: "/rehber/neden-cv",
    icon: "🎯",
    title: "Neden ve Ne Zaman?",
    excerpt: "Farklı kariyer aşamalarında CV'ye neden ihtiyaç duyarsın.",
  },
  {
    href: "/rehber/nasil-yazilir",
    icon: "✍️",
    title: "Nasıl Yazılır?",
    excerpt: "Adım adım, ATS dostu bir CV oluşturma rehberi.",
  },
  {
    href: "/rehber/dikkat-edilecekler",
    icon: "⚠️",
    title: "Nelere Dikkat?",
    excerpt: "Sık yapılan hatalar ve ATS tuzakları.",
  },
];
