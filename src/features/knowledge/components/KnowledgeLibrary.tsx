import { useMemo, useState } from 'react';
import { knowledgeSources } from '../data/sources.ts';
import { knowledgeEntries, searchKnowledge } from '../services/catalog.ts';
import type { KnowledgeKind } from '../types.ts';
import './KnowledgeLibrary.css';

const kindLabels: Record<KnowledgeKind, string> = {
  growing: 'Yetiştirme', disease: 'Hastalık', pest: 'Zararlı', healthy: 'Sağlıklı örnek',
};
const crops = [...new Set(knowledgeEntries.flatMap((entry) => entry.crops))].sort((a, b) => a.localeCompare(b, 'tr'));

export default function KnowledgeLibrary() {
  const [query, setQuery] = useState('');
  const [sourceId, setSourceId] = useState('all');
  const [crop, setCrop] = useState('all');
  const [kind, setKind] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const entries = useMemo(() => searchKnowledge(knowledgeEntries, query, sourceId, crop, kind), [query, sourceId, crop, kind]);
  const selected = entries.find((entry) => entry.id === selectedId);
  const source = knowledgeSources.find((item) => item.id === sourceId);

  return <section className="tp-knowledge" aria-labelledby="knowledge-heading">
    <header>
      <p className="tp-knowledge-eyebrow">BİLGİ REHBERİ</p>
      <h1 id="knowledge-heading">Türkçe bilgi kütüphanesi</h1>
      <p>Bitki ve hastalık adlarını ara, kaynaklarını incele.</p>
    </header>
    <div className="tp-knowledge-filters">
      <label className="tp-knowledge-search">Bilgi ara
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Örn. domates, mildiyö, yaprak küfü…" />
      </label>
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
    </div>
    {source && <aside className="tp-knowledge-notice">
      <strong>{source.name} · {source.status}</strong>
      <p>{source.limitation}</p>
      <a href={source.url} target="_blank" rel="noopener noreferrer">Kaynağı incele ↗</a>
    </aside>}
    <p role="status" className="tp-knowledge-count">{entries.length} kayıt · {entries.filter((entry) => entry.contentType === 'article').length} rehber metni · {entries.filter((entry) => entry.contentType === 'label').length} sözlük etiketi</p>
    {entries.length === 0 ? <div className="tp-knowledge-empty">
      <h2>{source && !knowledgeEntries.some((entry) => entry.sourceId === source.id) ? 'Bu kaynaktan henüz Türkçe içerik aktarılmadı' : 'Aramana uygun kayıt bulunamadı'}</h2>
      <p>{source?.limitation ?? 'Başka bir sözcük deneyebilir veya filtreleri temizleyebilirsin.'}</p>
      <button type="button" onClick={() => { setQuery(''); setSourceId('all'); setCrop('all'); setKind('all'); }}>Filtreleri temizle</button>
    </div> : <div className="tp-knowledge-grid">
      {entries.map((entry) => <article key={entry.id}>
        <span className="tp-knowledge-badge">{kindLabels[entry.kind]} · {entry.contentType === 'label' ? 'Sözlük etiketi' : 'Rehber'}</span>
        <h2>{entry.titleTr}</h2>
        <p>{entry.crops.join(' · ')}</p>
        <button type="button" aria-expanded={selected?.id === entry.id} aria-controls={`detail-${entry.id}`} onClick={() => setSelectedId(selected?.id === entry.id ? null : entry.id)}>
          {selected?.id === entry.id ? 'Detayı kapat' : 'Bilgiyi aç'}
        </button>
        <div id={`detail-${entry.id}`} hidden={selected?.id !== entry.id} className="tp-knowledge-detail">
          <p>{entry.summaryTr}</p>
          {entry.scientificName && <p><strong>Bilimsel ad:</strong> <i>{entry.scientificName}</i></p>}
          {entry.symptomsTr.length > 0 && <><h3>Belirtiler</h3><ul>{entry.symptomsTr.map((text) => <li key={text}>{text}</li>)}</ul></>}
          {entry.observationTr.length > 0 && <><h3>Sahada gözlem</h3><ul>{entry.observationTr.map((text) => <li key={text}>{text}</li>)}</ul></>}
          <p className="tp-knowledge-original"><strong>Kaynak adı:</strong> {entry.originalTitle}</p>
          <p>{entry.translation === 'reviewed' ? `Türkçe içerik kontrolü: ${entry.reviewedBy} · ${entry.reviewedAt}` : 'Türkçe etiket çevirisi; uzman incelemesi yapılmadı.'}</p>
          <p>{entry.attribution}</p>
          <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">Özgün kaydı aç ↗</a>
          {' · '}<a href={entry.licenseUrl} target="_blank" rel="noopener noreferrer">{entry.license}</a>
        </div>
      </article>)}
    </div>}
    <details className="tp-knowledge-sources">
      <summary>Kaynaklar ve içerik kapsamı ({knowledgeSources.length})</summary>
      {knowledgeSources.map((item) => <article key={item.id}>
        <h2>{item.name}</h2>
        <p>{item.description}</p>
        <strong>{item.status} · {knowledgeEntries.filter((entry) => entry.sourceId === item.id).length} kayıt</strong>
        <p>{item.limitation}</p>
        <small>{item.license} · Kaynak kontrolü: {item.checkedAt}</small>
        <a href={item.url} target="_blank" rel="noopener noreferrer">Kaynağı aç ↗</a>
      </article>)}
    </details>
  </section>;
}
