"use client";

import Link from "next/link";
import { PLAN_FEATURES, PRICING } from "@/lib/pricing";

export function PricingTable() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="grid grid-cols-[1.4fr_1fr_1fr]">
        {/* Header */}
        <div className="bg-slate-50 p-4 dark:bg-slate-900" />
        <div className="bg-slate-50 p-4 text-center dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {PRICING.free.name}
          </p>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {PRICING.free.price}
          </p>
        </div>
        <div className="bg-brand-50 p-4 text-center dark:bg-brand-900/30">
          <p className="text-sm font-semibold text-brand-700 dark:text-brand-200">
            {PRICING.pro.name}
          </p>
          <p className="text-lg font-bold text-brand dark:text-brand-200">
            {PRICING.pro.price}
          </p>
        </div>

        {/* Rows */}
        {PLAN_FEATURES.map((row, i) => (
          <Row key={row.feature} row={row} striped={i % 2 === 1} />
        ))}

        {/* CTA row */}
        <div className="bg-white p-4 dark:bg-slate-950" />
        <div className="bg-white p-4 text-center dark:bg-slate-950">
          <Link
            href="/register"
            className="inline-block rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Ücretsiz başla
          </Link>
        </div>
        <div className="bg-brand-50/60 p-4 text-center dark:bg-brand-900/20">
          <Link
            href="/register"
            className="inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            Pro&apos;ya yükselt
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({
  row,
  striped,
}: {
  row: (typeof PLAN_FEATURES)[number];
  striped: boolean;
}) {
  const base = striped
    ? "bg-slate-50/60 dark:bg-slate-900/40"
    : "bg-white dark:bg-slate-950";
  return (
    <>
      <div className={`${base} border-t border-slate-100 p-4 text-sm font-medium text-slate-700 dark:border-slate-800 dark:text-slate-300`}>
        {row.feature}
      </div>
      <div className={`${base} border-t border-slate-100 p-4 text-center text-sm dark:border-slate-800`}>
        {row.free === false ? (
          <span className="text-slate-300 dark:text-slate-600">—</span>
        ) : (
          <span className="text-slate-600 dark:text-slate-400">{row.free}</span>
        )}
      </div>
      <div className={`border-t border-slate-100 bg-brand-50/40 p-4 text-center text-sm text-slate-700 dark:border-slate-800 dark:bg-brand-900/10 dark:text-slate-300`}>
        {row.pro}
      </div>
    </>
  );
}
