/**
 * Free vs Pro feature matrix (brief §5). Single source of truth so the same
 * data drives the marketing comparison table and in-app upsell points.
 */
export interface PlanFeature {
  feature: string;
  free: string | false;
  pro: string;
}

export const PLAN_FEATURES: PlanFeature[] = [
  {
    feature: "İlan Analizi & Skorlama",
    free: "Aylık 3 ilan, temel ATS skoru",
    pro: "Sınırsız, detaylı alt-skor dökümü",
  },
  {
    feature: "Format & CV Optimizasyonu",
    free: "Yazım/dilbilgisi/şablon kontrolü",
    pro: "İlana özel satır yeniden yazımı, ATS okunabilirlik analizi",
  },
  {
    feature: "Başvuru Panosu (Kanban)",
    free: "Sınırsız kart",
    pro: "Gelişmiş filtreleme, otomatik durum güncellemeleri",
  },
  {
    feature: "Ön Yazı (Cover Letter)",
    free: false,
    pro: "İlana ve adaya özel otomatik üretim",
  },
  {
    feature: "Beceri Açığı Analizi",
    free: "Eksik beceri listesi",
    pro: "Açığı kapatma planı (kurslar, projeler)",
  },
  {
    feature: "Networking Asistanı",
    free: false,
    pro: "Kişiselleştirilmiş LinkedIn soğuk mesaj şablonları",
  },
  {
    feature: "Mülakat Simülatörü",
    free: false,
    pro: "Zayıf noktalara özel senaryolar + savunma stratejileri",
  },
];

export const PRICING = {
  free: { name: "Basic", price: "Ücretsiz", tagline: "Başlamak için ihtiyacın olan her şey" },
  pro: { name: "Pro", price: "₺199/ay", tagline: "Ciddi iş arayanlar için tam donanım" },
};
