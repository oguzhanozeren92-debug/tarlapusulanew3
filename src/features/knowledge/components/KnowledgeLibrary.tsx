import { useMemo, useState } from 'react';
import { KNOWLEDGE_GUIDE_EXTRA_ARTICLES } from '../../../components/knowledgeGuideExtraArticles';
import { KNOWLEDGE_GUIDE_MORE_ARTICLES } from '../../../components/knowledgeGuideMoreArticles';
import { KNOWLEDGE_GUIDE_FIELD_ARTICLES } from '../../../components/knowledgeGuideFieldArticles';
import { KNOWLEDGE_GUIDE_CLIMATE_ARTICLES } from '../../../components/knowledgeGuideClimateArticles';
import { KNOWLEDGE_GUIDE_SOIL_HEALTH_ARTICLES } from '../../../components/knowledgeGuideSoilHealthArticles';
import { knowledgeSources } from '../data/sources.ts';
import { knowledgeEntries, searchKnowledge } from '../services/catalog.ts';
import type { KnowledgeKind } from '../types.ts';
import './KnowledgeLibrary.css';

type GuideArticle = { id:string; category:string; title:string; summary:string; tags:string[]; sections:Array<{title:string;text:string}> };
type LibraryMode = 'guides' | 'dictionary';

const guideArticles: GuideArticle[] = [
  ...KNOWLEDGE_GUIDE_EXTRA_ARTICLES,
  ...KNOWLEDGE_GUIDE_MORE_ARTICLES,
  ...KNOWLEDGE_GUIDE_FIELD_ARTICLES,
  ...KNOWLEDGE_GUIDE_CLIMATE_ARTICLES,
  ...KNOWLEDGE_GUIDE_SOIL_HEALTH_ARTICLES,
];

const kindLabels: Record<KnowledgeKind, string> = {
  growing: 'Yetiştirme', disease: 'Hastalık', pest: 'Zararlı', healthy: 'Sağlıklı örnek',
};
const crops = [...new Set(knowledgeEntries.flatMap((entry) => entry.crops))].sort((a, b) => a.localeCompare(b, 'tr'));
const guideCategories = [...new Set(guideArticles.map((article) => article.category))].sort((a,b) => a.localeCompare(b,'tr'));

export default function KnowledgeLibrary() {
  const [mode, setMode] = useState<LibraryMode>('guides');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sourceId, setSourceId] = useState('all');
  const [crop, setCrop] = useState('all');
  const [kind, setKind] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const guideResults = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr-TR');
    return guideArticles.filter((article) => {
      if (category !== 'all' && article.category !== category) return false;
      if (!needle) return true;
      return [article.title, article.summary, article.category, ...article.tags]
        .join(' ').toLocaleLowerCase('tr-TR').includes(needle);
    });
  }, [query, category]);

  const dictionaryEntries = useMemo(
    () => searchKnowledge(knowledgeEntries, query, sourceId, crop, kind),
    [query, sourceId, crop, kind],
  );
  const selectedGuide = guideResults.find((article) => article.id === selectedId);
  const selectedEntry = dictionaryEntries.find((entry) => entry.id === selectedId);
  const source = knowledgeSources.find((item) => item.id === sourceId);

  const switchMode = (next: LibraryMode) => {
    setMode(next); setSelectedId(null); setQuery('');
  };

  return <section className="tp-knowledge" aria-labelledby="knowledge-heading">
    <header>
      <p className="tp-knowledge-eyebrow">BİLGİ REHBERİ</p>
      <h1 id="knowledge-heading">Türkçe bilgi kütüphanesi</h1>
      <p>Tarla, bitki, toprak, sulama ve tarım teknolojilerini anlaşılır Türkçe ile keşfet.</p>
    </header>

    <div className="tp-knowledge-filters" aria-label="Bilgi Rehberi görünümü">
      <button type="button" aria-pressed={mode === 'guides'} onClick={() => switchMode('guides')}>Rehber konuları</button>
      <button type="button" aria-pressed={mode === 'dictionary'} onClick={() => switchMode('dictionary')}>Hastalık sözlüğü</button>
      <label className="tp-knowledge-search">Bilgi ara
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={mode === 'guides' ? 'Örn. azot, NDVI, sulama, pH…' : 'Örn. domates, karaleke, yaprak küfü…'} />
      </label>
      {mode === 'guides' ? <label>Kategori<select value={category} onChange={(event) => setCategory(event.target.value)}>
        <option value="all">Tüm konular</option>
        {guideCategories.map((item) => <option key={item} value={item}>{item}</option>)}
      </select></label> : <>
        <label>Kaynak<select value={sourceId} onChange={(event) => setSourceId(event.target.value)}>
          <option value="all">Tüm kaynaklar</option>
          {knowledgeSources.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>
        <label>Ürün<select value={crop} onChange={(event) => setCrop(event.target.value)}>
          <option value="all">Tüm ürünler</option>
          {crops.map((item) => <option key={item} value={item}>{item}</option>)}
        </select></label>
        <label>Konu<select value={kind} onChange={(event) => setKind(event.target.value)}>
          <option value="all">Tüm konular</option>
          {Object.entries(kindLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select></label>
      </>}
    </div>

    {mode === 'guides' ? <>
      <p role="status" className="tp-knowledge-count">{guideResults.length} rehber konusu</p>
      {guideResults.length === 0 ? <div className="tp-library-empty"><h2>Aramana uygun rehber konusu bulunamadı</h2><p>Farklı bir sözcük deneyebilir veya filtreleri temizleyebilirsin.</p><button type="button" onClick={() => { setQuery(''); setCategory('all'); }}>Filtreleri temizle</button></div> : <div className="tp-knowledge-grid">
        {guideResults.map((article) => <article key={article.id}>
          <span className="tp-knowledge-badge">{article.category} · Rehber</span>
          <h2>{article.title}</h2>
          <p>{article.summary}</p>
          <button type="button" aria-expanded={selectedGuide?.id === article.id} aria-controls={`guide-${article.id}`} onClick={() => setSelectedId(selectedGuide?.id === article.id ? null : article.id)}>{selectedGuide?.id === article.id ? 'Kapat' : 'Bilgiyi aç'}</button>
          <div id={`guide-${article.id}`} hidden={selectedGuide?.id !== article.id} className="tp-knowledge-detail">
            {article.sections.map((section) => <section key={section.title}><h3>{section.title}</h3><p>{section.text}</p></section>)}
            <p><strong>Not:</strong> Bu içerik genel bilgilendirme amaçlıdır; kesin teşhis, doz veya reçete değildir. Tarla uygulamalarında yerel koşullar, analizler, yürürlükteki etiket ve resmî teknik bilgiler esas alınmalıdır.</p>
          </div>
        </article>)}
      </div>}
    </> : <>
      {source && <aside className="tp-knowledge-notice"><strong>{source.name} · {source.status}</strong><p>{source.limitation}</p></aside>}
      <p role="status" className="tp-knowledge-count">{dictionaryEntries.length} sözlük kaydı</p>
      <div className="tp-knowledge-grid">
        {dictionaryEntries.map((entry) => <article key={entry.id}>
          <span className="tp-knowledge-badge">{kindLabels[entry.kind]} · Sözlük</span>
          <h2>{entry.titleTr}</h2><p>{entry.crops.join(' · ')}</p>
          <button type="button" aria-expanded={selectedEntry?.id === entry.id} aria-controls={`entry-${entry.id}`} onClick={() => setSelectedId(selectedEntry?.id === entry.id ? null : entry.id)}>{selectedEntry?.id === entry.id ? 'Kapat' : 'Kısa bilgiyi aç'}</button>
          <div id={`entry-${entry.id}`} hidden={selectedEntry?.id !== entry.id} className="tp-knowledge-detail">
            <p>{entry.summaryTr}</p>
            {entry.scientificName && <p><strong>Bilimsel ad:</strong> <i>{entry.scientificName}</i></p>}
            {entry.symptomsTr.length > 0 && <><h3>Belirtiler</h3><ul>{entry.symptomsTr.map((text) => <li key={text}>{text}</li>)}</ul></>}
            {entry.observationTr.length > 0 && <><h3>Sahada gözlem</h3><ul>{entry.observationTr.map((text) => <li key={text}>{text}</li>)}</ul></>}
            <p><strong>Not:</strong> Veri seti etiketi tek başına teşhis veya mücadele talimatı değildir.</p>
            <details className="tp-knowledge-sources"><summary>Kaynak ve lisans bilgisi</summary><p><strong>Kaynak adı:</strong> {entry.originalTitle}</p><p>{entry.attribution}</p><a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">Özgün kayıt ↗</a>{' · '}<a href={entry.licenseUrl} target="_blank" rel="noopener noreferrer">{entry.license}</a></details>
          </div>
        </article>)}
      </div>
    </>}

    <details className="tp-knowledge-sources"><summary>Kaynaklar ve içerik kapsamı ({knowledgeSources.length})</summary>{knowledgeSources.map((item) => <article key={item.id}><h2>{item.name}</h2><p>{item.description}</p><strong>{item.status}</strong><p>{item.limitation}</p><small>{item.license} · Kaynak kontrolü: {item.checkedAt}</small><a href={item.url} target="_blank" rel="noopener noreferrer">Kaynağı aç ↗</a></article>)}</details>
  </section>;
}
