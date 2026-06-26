import Link from "next/link";
import { GUIDES, GUIDE_ORDER, type Guide } from "@/lib/guides";

export function GuideLayout({ guide }: { guide: Guide }) {
  const others = GUIDE_ORDER.filter((s) => s !== guide.slug).map(
    (s) => GUIDES[s],
  );

  return (
    <article className="mx-auto max-w-3xl">
      <nav className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-brand">
          Ana sayfa
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700 dark:text-slate-300">CV Rehberi</span>
      </nav>

      <header>
        <div className="text-4xl">{guide.icon}</div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {guide.title}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-slate-600 dark:text-slate-400">
          {guide.intro}
        </p>
      </header>

      <div className="mt-8 space-y-8">
        {guide.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              {section.heading}
            </h2>
            {section.paragraphs?.map((p, i) => (
              <p
                key={i}
                className="mt-2 leading-relaxed text-slate-600 dark:text-slate-400"
              >
                {p}
              </p>
            ))}
            {section.bullets && (
              <ul className="mt-3 space-y-2">
                {section.bullets.map((b, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-slate-600 dark:text-slate-400"
                  >
                    <span className="mt-1 text-brand">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-10 rounded-2xl border border-slate-200 bg-gradient-to-br from-brand-600 to-brand p-6 text-center text-white shadow-lift dark:border-slate-800">
        <h3 className="text-xl font-bold">CV&apos;ni şimdi test et</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-blue-50">
          Hedeflediğin ilana göre ATS uyum skorunu ücretsiz al ve nasıl
          iyileştirebileceğini gör.
        </p>
        <Link
          href="/register"
          className="mt-4 inline-block rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand hover:bg-blue-50"
        >
          Ücretsiz başla
        </Link>
      </div>

      {/* Cross-links */}
      <div className="mt-10">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Diğer rehberler
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {others.map((g) => (
            <Link
              key={g.slug}
              href={`/rehber/${g.slug}`}
              className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-brand dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="text-xl">{g.icon}</div>
              <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                {g.title}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}
