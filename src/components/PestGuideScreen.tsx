import { useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  CloudSun,
  Droplets,
  FlaskConical,
  House,
  Leaf,
  MapPinned,
  Microscope,
  Search,
  ShieldAlert,
  Sparkles,
  Sprout,
  Tractor,
  Wheat,
} from 'lucide-react';
import type { Field, Screen } from '../types';
import '../pages/Home/HomeScreen.css';
import './PestGuideScreen.css';

export interface PestGuideScreenProps {
  fields: Field[];
  selectedFieldId?: string;
  screen?: Screen | string;
  desktopMenuItems?: Array<{ screen: Screen | string; icon?: string; label: string; badge?: string }>;
  sideMenuOpen?: boolean;
  setScreen?: (screen: Screen) => void;
  setSideMenuOpen?: (open: boolean) => void;
}

type GuideArticle = {
  id: string;
  category: string;
  title: string;
  summary: string;
  tags: string[];
  sections: Array<{ title: string; text: string }>;
};

const CATEGORIES = [
  { id: 'Bitkisel Üretim', icon: Sprout, text: 'Ekimden hasada temel yetiştiricilik bilgileri' },
  { id: 'Bitki Besleme', icon: Leaf, text: 'Besin elementleri, eksiklik belirtileri ve gübreleme' },
  { id: 'Toprak', icon: FlaskConical, text: 'Toprak yapısı, pH, organik madde ve analiz okuma' },
  { id: 'Sulama', icon: Droplets, text: 'Su ihtiyacı, sulama zamanı ve yöntemleri' },
  { id: 'Hastalık ve Zararlılar', icon: ShieldAlert, text: 'Belirti tanıma, izleme ve mücadele ilkeleri' },
  { id: 'Tarla İşlemleri', icon: Tractor, text: 'Ekim, gübreleme, ilaçlama ve hasat uygulamaları' },
  { id: 'Uydu ve Tarım Teknolojisi', icon: MapPinned, text: 'NDVI, radar, uydu verisi ve hassas tarım' },
  { id: 'Tarım Sözlüğü', icon: BookOpen, text: 'Tarımda sık kullanılan kavramların Türkçe açıklamaları' },
];

const ARTICLES: GuideArticle[] = [
  {
    id: 'ndvi', category: 'Uydu ve Tarım Teknolojisi', title: 'NDVI Nedir, Nasıl Yorumlanır?',
    summary: 'Bitki canlılığını uydu görüntülerinden izlemek için kullanılan NDVI göstergesinin temel mantığı.',
    tags: ['NDVI', 'uydu', 'bitki sağlığı'],
    sections: [
      { title: 'NDVI nedir?', text: 'NDVI, yakın kızılötesi ve kırmızı ışık bantları arasındaki farktan hesaplanan bir bitki örtüsü göstergesidir. Değerler genel olarak -1 ile +1 arasındadır.' },
      { title: 'Ne anlatır?', text: 'Yüksek değerler çoğu durumda daha yoğun ve aktif yeşil bitki örtüsünü, düşük değerler ise seyrek bitki, çıplak toprak, hasat edilmiş alan veya bitki stresini gösterebilir.' },
      { title: 'Tek başına teşhis değildir', text: 'NDVI düşüşü hastalık, su stresi, besin eksikliği, gelişim dönemi veya hasat gibi farklı nedenlerden oluşabilir. Hava, fenoloji ve tarla gözlemleriyle birlikte değerlendirilmelidir.' },
    ],
  },
  {
    id: 'ndre', category: 'Uydu ve Tarım Teknolojisi', title: 'NDRE Nedir?',
    summary: 'Özellikle gelişmiş ve yoğun bitki örtüsünde klorofil değişimlerini izlemeye yardımcı olan uydu göstergesi.',
    tags: ['NDRE', 'klorofil', 'uydu'],
    sections: [{ title: 'Kullanım', text: 'NDRE kırmızı kenar bandını kullanır. Yoğun bitki örtüsünde NDVI doygunluğunun arttığı dönemlerde bitki gelişimindeki değişimleri izlemek için yararlı olabilir.' }],
  },
  {
    id: 'savi', category: 'Uydu ve Tarım Teknolojisi', title: 'SAVI Nedir?',
    summary: 'Bitki örtüsünün seyrek olduğu alanlarda toprak parlaklığının etkisini azaltmayı amaçlayan vejetasyon indeksi.',
    tags: ['SAVI', 'toprak', 'uydu'],
    sections: [{ title: 'Ne zaman kullanılır?', text: 'Yeni çıkış yapan veya bitki örtüsü seyrek tarlalarda, görünen toprağın vejetasyon indeksine etkisini azaltmak için tercih edilebilir.' }],
  },
  {
    id: 'radar', category: 'Uydu ve Tarım Teknolojisi', title: 'Sentinel-1 Radar Verisi Ne Anlatır?',
    summary: 'Buluttan daha az etkilenen radar gözlemleriyle tarla yüzeyindeki değişimleri izleme yaklaşımı.',
    tags: ['Sentinel-1', 'VH', 'VV', 'radar'],
    sections: [{ title: 'Radarın farkı', text: 'Sentinel-1 optik kamera yerine radar kullanır. VV ve VH geri saçılım değerleri yüzey pürüzlülüğü, bitki yapısı ve nem değişimleriyle ilişkili sinyaller taşıyabilir; doğrudan nem ölçümü olarak yorumlanmamalıdır.' }],
  },
  {
    id: 'ph', category: 'Toprak', title: 'Toprak pH Değeri Ne Anlama Gelir?',
    summary: 'Toprağın asitlik ve alkalilik durumunun bitki besinlerinin alınabilirliğine etkisi.',
    tags: ['pH', 'toprak analizi'],
    sections: [{ title: 'Neden önemlidir?', text: 'pH, besin elementlerinin bitki tarafından alınabilirliğini ve topraktaki biyolojik süreçleri etkiler. Uygun aralık ürüne ve toprak koşullarına göre değişebilir.' }, { title: 'Ölçüm', text: 'Kesin karar için uygun yöntemle alınmış toprak örneğinin laboratuvar analizi esas alınmalıdır. Harita ve model verileri ön bilgi niteliğindedir.' }],
  },
  {
    id: 'organic', category: 'Toprak', title: 'Toprak Organik Maddesi',
    summary: 'Organik maddenin toprak yapısı, su tutma ve besin döngüsündeki rolü.',
    tags: ['organik madde', 'toprak'],
    sections: [{ title: 'Görevi', text: 'Organik madde toprağın agregat yapısını, su tutma kapasitesini, biyolojik faaliyetini ve besin döngüsünü destekler. Değerlendirme toprak bünyesi ve bölgesel koşullarla birlikte yapılmalıdır.' }],
  },
  {
    id: 'texture', category: 'Toprak', title: 'Kum, Silt ve Kil: Toprak Bünyesi',
    summary: 'Toprak bünyesinin su tutma, havalanma ve işlenebilirlik üzerindeki etkileri.',
    tags: ['kil', 'kum', 'silt'],
    sections: [{ title: 'Temel fark', text: 'Kumlu topraklar genellikle daha hızlı drene olur; killi topraklar daha fazla su tutabilir ancak havalanma ve işlenebilirlik sorunları görülebilir. Tınlı yapılar farklı tane boylarının dengeli karışımını içerir.' }],
  },
  {
    id: 'nitrogen', category: 'Bitki Besleme', title: 'Azot: Bitkide Görevi ve Eksiklik Belirtileri',
    summary: 'Azotun büyüme ve klorofil oluşumundaki rolü ile sık görülen eksiklik işaretleri.',
    tags: ['azot', 'N', 'besleme'],
    sections: [{ title: 'Görevi', text: 'Azot protein, klorofil ve birçok temel bitki bileşiğinin yapısında bulunur. Yetersizlikte özellikle yaşlı yapraklarda başlayan soluklaşma ve gelişme geriliği görülebilir.' }, { title: 'Dikkat', text: 'Yaprak rengi tek başına azot eksikliğini kanıtlamaz. Su stresi, kök sorunu ve diğer besin eksiklikleri benzer belirti oluşturabilir.' }],
  },
  {
    id: 'phosphorus', category: 'Bitki Besleme', title: 'Fosfor: Kök ve Enerji Metabolizması',
    summary: 'Fosforun kök gelişimi, enerji aktarımı ve bitki gelişimindeki temel görevleri.',
    tags: ['fosfor', 'P', 'besleme'],
    sections: [{ title: 'Görevi', text: 'Fosfor enerji aktarımı, kök gelişimi ve birçok metabolik süreçte görev alır. Toprak pH değeri ve sıcaklık fosforun alınabilirliğini etkileyebilir.' }],
  },
  {
    id: 'potassium', category: 'Bitki Besleme', title: 'Potasyum: Su Dengesi ve Dayanıklılık',
    summary: 'Potasyumun su düzenleme, enzim faaliyeti ve stres toleransındaki rolü.',
    tags: ['potasyum', 'K', 'besleme'],
    sections: [{ title: 'Görevi', text: 'Potasyum stomaların çalışması, su dengesi, enzim faaliyetleri ve ürün kalitesiyle ilişkili çok sayıda süreçte rol oynar. Gübreleme kararı analiz ve ürün ihtiyacına göre verilmelidir.' }],
  },
  {
    id: 'micro', category: 'Bitki Besleme', title: 'Mikro Besin Elementleri',
    summary: 'Demir, çinko, mangan, bor ve diğer mikro elementlerin temel rolleri.',
    tags: ['demir', 'çinko', 'bor', 'mangan'],
    sections: [{ title: 'Az miktar, önemli görev', text: 'Mikro elementlere daha düşük miktarlarda ihtiyaç duyulur ancak eksiklikleri gelişmeyi ciddi biçimde etkileyebilir. Belirtiler elemente, ürüne ve yaprak yaşına göre değişir.' }],
  },
  {
    id: 'irrigation-time', category: 'Sulama', title: 'Sulama Zamanı Nasıl Belirlenir?',
    summary: 'Hava, toprak, ürün dönemi ve kök bölgesini birlikte değerlendirerek sulama zamanını belirleme.',
    tags: ['sulama', 'toprak nemi', 'ET'],
    sections: [{ title: 'Tek veri yeterli değildir', text: 'Sulama zamanı; yağış, evapotranspirasyon, kök bölgesi su durumu, toprağın su tutma kapasitesi, ürünün gelişim dönemi ve son sulama kaydı birlikte değerlendirilerek belirlenir.' }],
  },
  {
    id: 'et', category: 'Sulama', title: 'Evapotranspirasyon (ET) Nedir?',
    summary: 'Toprak yüzeyinden buharlaşma ve bitkiden terleme yoluyla gerçekleşen toplam su kaybı.',
    tags: ['ET', 'ET0', 'ETc', 'su'],
    sections: [{ title: 'ET0 ve ETc', text: 'Referans evapotranspirasyon (ET0) atmosferik su talebini temsil eder. Ürün evapotranspirasyonu (ETc), ürün katsayıları ve gelişim koşulları kullanılarak ürünün su tüketimini tahmin etmek için değerlendirilir.' }],
  },
  {
    id: 'drip', category: 'Sulama', title: 'Damla Sulamada Temel İlkeler',
    summary: 'Suyu kök bölgesine kontrollü uygularken dikkat edilmesi gereken temel noktalar.',
    tags: ['damla sulama', 'su'],
    sections: [{ title: 'Kontrol listesi', text: 'Damlatıcı debisi, basınç, filtrasyon, sulama süresi, ıslatılan alan ve kök derinliği birlikte değerlendirilmelidir. Sık sulama her zaman doğru sulama anlamına gelmez.' }],
  },
  {
    id: 'spray-weather', category: 'Tarla İşlemleri', title: 'İlaçlamada Hava Koşulları Neden Önemlidir?',
    summary: 'Rüzgâr, yağış, sıcaklık ve nemin uygulama başarısına etkisini anlamak.',
    tags: ['ilaçlama', 'rüzgâr', 'yağış'],
    sections: [{ title: 'Uygulama penceresi', text: 'Rüzgâr sürüklenmeyi, yağış yıkanmayı, aşırı sıcaklık ve düşük bağıl nem ise damlacıkların hızlı buharlaşmasını artırabilir. Kesin uygulama sınırlarında kullanılacak ürünün etiketi esas alınmalıdır.' }],
  },
  {
    id: 'soil-sampling', category: 'Tarla İşlemleri', title: 'Toprak Örneği Nasıl Alınır?',
    summary: 'Laboratuvar sonucunun tarlayı temsil etmesi için doğru örnekleme yaklaşımı.',
    tags: ['toprak örneği', 'analiz'],
    sections: [{ title: 'Temsil edici örnek', text: 'Tarlanın benzer özellikteki bölümünden birden fazla noktadan alt örnek alınarak karıştırılır. Yol kenarı, gübre yığını, su birikintisi gibi sıra dışı noktalar genel örneğe dahil edilmemelidir.' }],
  },
  {
    id: 'scouting', category: 'Hastalık ve Zararlılar', title: 'Tarla Gözlemi Nasıl Yapılır?',
    summary: 'Sorunu erken fark etmek için düzenli ve kayıtlı tarla kontrolünün temelleri.',
    tags: ['gözlem', 'zararlı', 'hastalık'],
    sections: [{ title: 'Düzenli izleme', text: 'Tarla farklı bölgeleri temsil edecek biçimde gezilmeli; yaprak, gövde, kök ve meyve belirtileri incelenmeli; fotoğraf, tarih ve konum kaydedilmelidir. Tek bir bitkideki belirti tüm tarlayı temsil etmeyebilir.' }],
  },
  {
    id: 'integrated-pest', category: 'Hastalık ve Zararlılar', title: 'Entegre Mücadele Nedir?',
    summary: 'Zararlı yönetiminde gözlem, eşik, kültürel, biyolojik ve gerektiğinde kimyasal yöntemlerin birlikte kullanılması.',
    tags: ['entegre mücadele', 'IPM'],
    sections: [{ title: 'Temel yaklaşım', text: 'Amaç her canlıyı yok etmek değil, ekonomik zararı kabul edilebilir düzeyde tutmaktır. Doğru teşhis, düzenli izleme ve uygun mücadele yönteminin doğru zamanda seçilmesi esastır.' }],
  },
  {
    id: 'phenology', category: 'Bitkisel Üretim', title: 'Fenoloji: Bitkinin Gelişim Dönemini Bilmek',
    summary: 'Ekim, çıkış, vejetatif gelişim, çiçeklenme ve olgunlaşma gibi dönemlerin kararlarla ilişkisi.',
    tags: ['fenoloji', 'gelişim dönemi'],
    sections: [{ title: 'Neden önemli?', text: 'Bitkinin su ve besin ihtiyacı, bazı hastalık riskleri ve tarla işlemlerinin zamanlaması gelişim dönemine göre değişir. Takvim tarihi tek başına gelişim dönemini kesin olarak göstermez.' }],
  },
  {
    id: 'germination', category: 'Bitkisel Üretim', title: 'Çimlenme ve Çıkışı Etkileyen Faktörler',
    summary: 'Tohum kalitesi, sıcaklık, su, oksijen ve ekim derinliğinin çıkış üzerindeki etkisi.',
    tags: ['çimlenme', 'ekim', 'tohum'],
    sections: [{ title: 'Temel koşullar', text: 'Başarılı çimlenme için canlı tohum, uygun sıcaklık, yeterli nem ve oksijen gerekir. Ekim derinliği ve yüzey kabuklaşması çıkış başarısını etkileyebilir.' }],
  },
  {
    id: 'harvest', category: 'Bitkisel Üretim', title: 'Hasat Zamanını Belirleme',
    summary: 'Olgunluk, ürün nemi, hava ve kullanım amacını birlikte değerlendirme.',
    tags: ['hasat', 'olgunluk'],
    sections: [{ title: 'Karar', text: 'Hasat zamanı ürüne göre fizyolojik veya ticari olgunluk, tane ya da meyve nemi, kalite hedefi, hava tahmini ve depolama koşulları dikkate alınarak belirlenir.' }],
  },
  {
    id: 'dictionary', category: 'Tarım Sözlüğü', title: 'Temel Tarım Terimleri',
    summary: 'TarlaPusula içinde karşılaşacağın temel teknik terimlerin kısa Türkçe karşılıkları.',
    tags: ['sözlük', 'kavramlar'],
    sections: [
      { title: 'Fenoloji', text: 'Bitkilerin mevsimsel gelişim olaylarını ve dönemlerini inceleyen alan.' },
      { title: 'Evapotranspirasyon', text: 'Topraktan buharlaşma ile bitkiden terleme sonucu atmosfere geçen toplam su.' },
      { title: 'Kök bölgesi', text: 'Bitkinin aktif köklerinin önemli bölümünün bulunduğu ve su-besin aldığı toprak hacmi.' },
      { title: 'Vejetasyon indeksi', text: 'Uydu veya sensör bantlarından hesaplanarak bitki örtüsünün özelliklerini izlemeye yardımcı olan sayısal gösterge.' },
    ],
  },
];

export default function PestGuideScreen({ setScreen }: PestGuideScreenProps) {
  const navigate = (screen: Screen) => setScreen?.(screen);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tümü');
  const [selectedArticle, setSelectedArticle] = useState<GuideArticle | null>(null);

  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr-TR');
    return ARTICLES.filter((article) => {
      if (category !== 'Tümü' && article.category !== category) return false;
      if (!needle) return true;
      return [article.title, article.summary, article.category, ...article.tags]
        .join(' ')
        .toLocaleLowerCase('tr-TR')
        .includes(needle);
    });
  }, [query, category]);

  return (
    <div className="tp-knowledge-page">
      <main className="tp-knowledge-canvas" aria-label="Bilgi Rehberi">
        <section className="tp-knowledge-hero">
          <span className="tp-knowledge-kicker"><BookOpen size={15} /> TarlaPusula Bilgi Kütüphanesi</span>
          <h1>Bilgi Rehberi</h1>
          <p>Tarla, bitki, toprak, sulama ve tarım teknolojilerini anlaşılır Türkçe ile tek yerde keşfet.</p>
          <label className="tp-knowledge-search">
            <Search size={19} aria-hidden="true" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Bir konu ara: azot, NDVI, sulama, pH…" />
          </label>
        </section>

        {!selectedArticle ? (
          <>
            <section className="tp-knowledge-categories" aria-label="Kategoriler">
              <div className="tp-knowledge-section-title"><div><small>KEŞFET</small><h2>Kategoriler</h2></div></div>
              <div className="tp-knowledge-category-grid">
                {CATEGORIES.map((item) => {
                  const Icon = item.icon;
                  const active = category === item.id;
                  return <button key={item.id} type="button" className={active ? 'active' : ''} onClick={() => setCategory(active ? 'Tümü' : item.id)}><span><Icon size={22} /></span><strong>{item.id}</strong><small>{item.text}</small></button>;
                })}
              </div>
            </section>

            <section className="tp-knowledge-library">
              <div className="tp-knowledge-section-title"><div><small>{category === 'Tümü' ? 'TÜM KONULAR' : category.toLocaleUpperCase('tr-TR')}</small><h2>Bilgi Kütüphanesi</h2></div><span>{results.length} konu</span></div>
              <div className="tp-knowledge-article-list">
                {results.map((article) => <button key={article.id} type="button" onClick={() => setSelectedArticle(article)}><span className="tp-knowledge-article-icon"><Wheat size={20} /></span><span className="tp-knowledge-article-copy"><small>{article.category}</small><strong>{article.title}</strong><p>{article.summary}</p><span className="tp-knowledge-tags">{article.tags.slice(0, 3).map((tag) => <em key={tag}>{tag}</em>)}</span></span><ChevronRight size={20} /></button>)}
                {results.length === 0 && <div className="tp-knowledge-no-result"><Microscope size={28} /><strong>Bu aramayla eşleşen konu bulunamadı.</strong><span>Farklı bir kelime deneyebilirsin.</span></div>}
              </div>
            </section>

            <section className="tp-knowledge-note"><Sparkles size={19} /><div><strong>Bilgiyi tarlanla birleştir</strong><p>Rehber genel tarımsal bilgi verir. Tarlana özel kararlar için Pusula AI; kayıtlı ürün, gelişim dönemi, hava, toprak ve uydu verilerini birlikte değerlendirir.</p></div></section>
          </>
        ) : (
          <article className="tp-knowledge-detail">
            <button className="tp-knowledge-back" type="button" onClick={() => setSelectedArticle(null)}>‹ Bilgi Kütüphanesine Dön</button>
            <small>{selectedArticle.category}</small>
            <h2>{selectedArticle.title}</h2>
            <p className="lead">{selectedArticle.summary}</p>
            <div className="tp-knowledge-tags">{selectedArticle.tags.map((tag) => <em key={tag}>{tag}</em>)}</div>
            {selectedArticle.sections.map((section) => <section key={section.title}><h3>{section.title}</h3><p>{section.text}</p></section>)}
            <aside><ShieldAlert size={18} /><p>Bu içerik eğitim ve genel bilgilendirme amaçlıdır. Gübre, bitki koruma ürünü ve diğer uygulamalarda laboratuvar sonucu, ürün etiketi, yerel koşullar ve gerektiğinde yetkili uzman değerlendirmesi esas alınmalıdır.</p></aside>
          </article>
        )}
      </main>

      <nav className="tp-bottom" aria-label="Ana menü">
        <button type="button" onClick={() => navigate('home')}><span className="tp-bottom-icon-shell"><House className="tp-bottom-line-icon" aria-hidden="true" strokeWidth={1.8} /></span>Ana Sayfa</button>
        <button type="button" onClick={() => navigate('weatherHub')} aria-label="Hava Durumu"><span className="tp-bottom-icon-shell"><CloudSun className="tp-bottom-line-icon" aria-hidden="true" strokeWidth={1.8} /></span>Hava Durumu</button>
        <button className="ai" type="button" onClick={() => navigate('aiAnalysis')}><span className="tp-bottom-ai-shell"><Sparkles className="tp-bottom-line-icon" aria-hidden="true" strokeWidth={1.8} /></span>Pusula AI</button>
        <button type="button" onClick={() => navigate('calendar')}><span className="tp-bottom-icon-shell"><CalendarDays className="tp-bottom-line-icon" aria-hidden="true" strokeWidth={1.8} /></span>Takvim</button>
        <button type="button" onClick={() => navigate('home')} aria-label="Tarlalarım"><span className="tp-bottom-icon-shell"><MapPinned className="tp-bottom-line-icon" aria-hidden="true" strokeWidth={1.8} /></span>Tarlalarım</button>
      </nav>
    </div>
  );
}
