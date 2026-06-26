/**
 * CV guide content (SEO marketing pages). Kept as structured data so all guides
 * share one layout and cross-link to each other + funnel toward sign-up.
 */
export interface GuideSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface Guide {
  slug: string;
  icon: string;
  title: string;
  description: string;
  intro: string;
  sections: GuideSection[];
}

export const GUIDES: Record<string, Guide> = {
  "cv-nedir": {
    slug: "cv-nedir",
    icon: "📘",
    title: "CV Nedir?",
    description:
      "CV (özgeçmiş) nedir, neyi içerir ve iş başvurularında neden bu kadar kritiktir? Kapsamlı bir başlangıç rehberi.",
    intro:
      "CV (Curriculum Vitae), eğitim geçmişini, iş deneyimini, becerilerini ve başarılarını işverene özetleyen profesyonel bir belgedir. Çoğu başvuruda işverenle ilk temas noktan CV'ndir.",
    sections: [
      {
        heading: "CV neyi içerir?",
        bullets: [
          "İletişim bilgileri (ad, e-posta, telefon, şehir)",
          "Kısa profesyonel özet / hedef",
          "İş deneyimi (rol, şirket, tarih, ölçülebilir başarılar)",
          "Eğitim bilgileri",
          "Beceriler (teknik ve kişisel)",
          "İlgili sertifikalar ve projeler",
        ],
      },
      {
        heading: "CV neden önemli?",
        paragraphs: [
          "Bir ilana yüzlerce başvuru gelebilir. İşverenler genellikle her CV'ye yalnızca birkaç saniye ayırır; üstelik birçok şirket başvuruları önce bir ATS (Applicant Tracking System) yazılımıyla tarar.",
          "İyi yapılandırılmış, ilana uygun anahtar kelimeler içeren bir CV, bu ilk elemeyi geçmenin ve gerçek bir insanın eline ulaşmanın anahtarıdır.",
        ],
      },
      {
        heading: "CV ve ATS ilişkisi",
        paragraphs: [
          "ATS, CV'ni metne dönüştürür ve ilanın gereksinimleriyle eşleştirir. Karmaşık tablolar, çok sütunlu düzenler veya görsel içine gömülü metinler bu ayrıştırmayı bozabilir ve nitelikli olsan bile elenmene yol açabilir.",
          "ATS Review tam da burada devreye girer: CV'nin ilana uyumunu tutarlı ve şeffaf bir skorla ölçer.",
        ],
      },
    ],
  },
  "neden-cv": {
    slug: "neden-cv",
    icon: "🎯",
    title: "Neden ve Ne Zaman CV'ye İhtiyaç Duyarsın?",
    description:
      "Farklı kariyer aşamalarında (yeni mezun, kariyer değişikliği, terfi) CV'nin rolü ve önemi.",
    intro:
      "CV yalnızca iş ararken değil, kariyerinin birçok dönüm noktasında işine yarar. İhtiyacın olan an gelmeden hazır olmak büyük avantaj sağlar.",
    sections: [
      {
        heading: "Hangi durumlarda gerekir?",
        bullets: [
          "İlk işine başvururken (yeni mezun veya stajyer)",
          "Kariyer değişikliği yaparken — aktarılabilir becerileri öne çıkarmak için",
          "Terfi veya iç başvurularda",
          "Freelance / danışmanlık tekliflerinde güven oluşturmak için",
          "Networking ve LinkedIn profilini güçlendirmek için",
        ],
      },
      {
        heading: "Kariyer aşamasına göre odak",
        paragraphs: [
          "Yeni mezunsan eğitim, projeler ve stajlar öne çıkar. Deneyimliysen ölçülebilir başarılar ve liderlik vurgulanmalı. Kariyer değiştiriyorsan, hedef role aktarılabilen becerileri net biçimde bağlamalısın.",
        ],
      },
      {
        heading: "Her zaman güncel tut",
        paragraphs: [
          "En iyi fırsatlar çoğu zaman beklenmedik anda gelir. CV'ni güncel tutmak ve her ilana hızlıca uyarlayabilmek, fırsatları kaçırmamanı sağlar.",
        ],
      },
    ],
  },
  "nasil-yazilir": {
    slug: "nasil-yazilir",
    icon: "✍️",
    title: "Nasıl CV Yazılır? (Adım Adım)",
    description:
      "ATS dostu, etkili bir CV yazmanın adım adım rehberi: yapı, içerik, anahtar kelimeler ve biçim.",
    intro:
      "İyi bir CV; net, ölçülebilir ve ilana göre uyarlanmış olmalıdır. İşte adım adım izleyebileceğin pratik bir yöntem.",
    sections: [
      {
        heading: "1. Net bir yapı kur",
        bullets: [
          "Standart başlıklar kullan: Özet, Deneyim, Eğitim, Beceriler",
          "Tek sütunlu, sade bir düzen tercih et (ATS dostu)",
          "Okunabilir bir yazı tipi ve tutarlı boşluklar kullan",
        ],
      },
      {
        heading: "2. Başarıları ölçülebilir yaz",
        paragraphs: [
          "“Sorumluydum” yerine sonuç odaklı yaz: “Ödeme servisini yeniden tasarlayarak yanıt süresini %40 azalttım.” Sayılar, ölçek ve etki güven verir.",
        ],
      },
      {
        heading: "3. İlana göre uyarla",
        paragraphs: [
          "Her ilan farklıdır. İlandaki gerçek gereksinimleri ve anahtar kelimeleri (araçlar, teknolojiler, sertifikalar) CV'ne — yalnızca gerçekten sahip olduklarını — yansıt.",
        ],
        bullets: [
          "İlandaki zorunlu becerileri tespit et",
          "CV'nde eksik olanları (varsa) ekle",
          "Genel ifadeler yerine spesifik terimler kullan",
        ],
      },
      {
        heading: "4. Skorla ve iyileştir",
        paragraphs: [
          "Göndermeden önce CV'nin ilana uyumunu ATS Review ile ölç. Eksik anahtar kelimeleri ve format sorunlarını görüp düzelt, sonra başvur.",
        ],
      },
    ],
  },
  "dikkat-edilecekler": {
    slug: "dikkat-edilecekler",
    icon: "⚠️",
    title: "CV Yazarken Nelere Dikkat Etmeli?",
    description:
      "Sık yapılan CV hataları, ATS tuzakları ve biçimsel sorunlar — ve bunlardan nasıl kaçınılır.",
    intro:
      "İyi bir aday bile yaygın hatalar yüzünden elenebilir. İşte en sık karşılaşılan tuzaklar ve çözümleri.",
    sections: [
      {
        heading: "ATS'i bozan biçim tuzakları",
        bullets: [
          "Çok sütunlu düzenler ve metin kutuları — ayrıştırmayı bozar",
          "Tablolar içine yerleştirilmiş bilgiler",
          "Görsel/logo içine gömülü metin (ATS okuyamaz)",
          "Standart dışı bölüm başlıkları",
          "Aşırı özel karakter ve simgeler",
        ],
      },
      {
        heading: "İçerik hataları",
        bullets: [
          "Genel, ölçülemeyen ifadeler",
          "Her ilana aynı CV'yi göndermek",
          "İlanda geçen anahtar kelimeleri hiç kullanmamak",
          "Yazım ve dilbilgisi hataları",
          "Çok uzun (gereksiz detaylı) veya çok kısa CV",
        ],
      },
      {
        heading: "KVKK ve gizlilik",
        paragraphs: [
          "Gereksiz hassas verileri (T.C. kimlik no, doğum tarihi, medeni durum) CV'ne eklemek zorunda değilsin. ATS Review, yapay zekâ analizinden önce bu tür alanları otomatik temizler.",
        ],
      },
    ],
  },
};

export const GUIDE_ORDER = [
  "cv-nedir",
  "neden-cv",
  "nasil-yazilir",
  "dikkat-edilecekler",
];
