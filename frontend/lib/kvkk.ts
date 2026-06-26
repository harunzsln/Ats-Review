/**
 * KVKK disclosure text (Aydınlatma Metni). Versioned: when this text changes,
 * bump DISCLOSURE_VERSION and the backend will require re-consent.
 *
 * Keep this version string in sync with the backend KVKK_DISCLOSURE_VERSION.
 */
export const DISCLOSURE_VERSION = "2026-01-01";

export const DISCLOSURE_TITLE =
  "Kişisel Verilerin Korunması Aydınlatma Metni (KVKK)";

export const DISCLOSURE_SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "Veri Sorumlusu",
    body:
      "ATS Review olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) " +
      "kapsamında kişisel verilerinizi aşağıda açıklanan amaçlarla işliyoruz.",
  },
  {
    heading: "İşlenen Veriler",
    body:
      "Yüklediğiniz CV'lerinizde yer alan ad-soyad, iletişim bilgileri, eğitim ve " +
      "iş geçmişi gibi kimliğinizi belirleyen/belirlenebilir kılan veriler işlenir. " +
      "Gereksiz hassas alanlar (T.C. Kimlik No, doğum tarihi vb.) yapay zekâ " +
      "servislerine gönderilmeden önce otomatik olarak temizlenir.",
  },
  {
    heading: "İşleme Amaçları",
    body:
      "CV'nizin ilan ile eşleştirilmesi, ATS uyum puanı hesaplanması, mülakat " +
      "simülasyonu ve networking (soğuk mesaj) asistanı hizmetlerinin sunulması.",
  },
  {
    heading: "Yurt Dışına Aktarım",
    body:
      "Hizmetin sağlanabilmesi için verileriniz, Google (Gemini API) ve Supabase " +
      "altyapısı gibi yurt dışında bulunabilen veri işleyenlere aktarılabilir. " +
      "Bu aktarım, açık rızanıza dayanılarak gerçekleştirilir.",
  },
  {
    heading: "Üçüncü Kişi Verileri (Soğuk Mesaj)",
    body:
      "Soğuk mesaj üretirken bir İK yetkilisinin adını girseniz dahi, bu bilgi " +
      "yalnızca anlık olarak mesaj taslağında kullanılır ve sistemimizde " +
      "KESİNLİKLE saklanmaz. Yalnızca rol etiketi (ör. 'İK Müdürü') tutulur.",
  },
  {
    heading: "Haklarınız (KVKK m. 11)",
    body:
      "Verilerinize erişme, düzeltilmesini/silinmesini isteme ve verilerinizin " +
      "bir kopyasını dışa aktarma haklarına sahipsiniz. Hesabınızı sildiğinizde " +
      "tüm verileriniz kalıcı olarak (geri dönüşümsüz) silinir.",
  },
];
