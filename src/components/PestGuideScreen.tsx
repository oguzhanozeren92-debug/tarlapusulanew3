import { useState } from 'react';
import PestGuideScreenLegacy, { type PestGuideScreenProps } from './PestGuideScreenLegacy';
import KnowledgeLibrary from '../features/knowledge/components/KnowledgeLibrary';
import './PestGuideShellOverride.css';

/**
 * Bilgi Rehberi içerik deneyimini korur; navigasyonu diğer TarlaPusula
 * ekranlarıyla aynı GlobalPusulaBand + AppDrawer kabuğuna bırakır.
 */
export default function PestGuideScreen(props: PestGuideScreenProps) {
  const [mode, setMode] = useState<'field' | 'library'>('field');
  return <>
    <nav className="tp-guide-mode" aria-label="Bilgi rehberi bölümleri">
      <button type="button" aria-pressed={mode === 'field'} onClick={() => setMode('field')}>Saha rehberi</button>
      <button type="button" aria-pressed={mode === 'library'} onClick={() => setMode('library')}>Bilgi kütüphanesi</button>
    </nav>
    <div hidden={mode !== 'field'}><PestGuideScreenLegacy {...props} /></div>
    <div hidden={mode !== 'library'}><KnowledgeLibrary /></div>
  </>;
}

export * from './PestGuideScreenLegacy';
