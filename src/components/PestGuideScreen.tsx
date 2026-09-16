import type { Field, Screen } from '../types';
import './PestGuideScreen.css';

export interface PestGuideScreenProps {
  fields: Field[];
  selectedFieldId?: string;
  screen?: Screen | string;
  desktopMenuItems?: Array<{
    screen: Screen | string;
    icon?: string;
    label: string;
    badge?: string;
  }>;
  sideMenuOpen?: boolean;
  setScreen?: (screen: Screen) => void;
  setSideMenuOpen?: (open: boolean) => void;
}

/**
 * Bilgi Rehberi temiz başlangıç yüzeyi.
 * Üst navigasyon ve drawer App.tsx içindeki ortak TarlaPusula kabuğundan gelir.
 * Eski rehber içeriği PestGuideScreenLegacy.tsx içinde yedek olarak korunur.
 */
export default function PestGuideScreen({
  setScreen,
  setSideMenuOpen,
}: PestGuideScreenProps) {
  const navigate = (screen: Screen) => setScreen?.(screen);

  return (
    <div className="tp-knowledge-page">
      <main className="tp-knowledge-canvas" aria-label="Bilgi Rehberi">
        <div className="tp-knowledge-empty" aria-hidden="true" />
      </main>

      <nav className="tp-knowledge-bottom-nav" aria-label="Ana menü">
        <button type="button" onClick={() => navigate('home')}>
          <span aria-hidden="true">⌂</span>
          <small>Ana Sayfa</small>
        </button>
        <button type="button" onClick={() => navigate('home')}>
          <span aria-hidden="true">▱</span>
          <small>Tarlalarım</small>
        </button>
        <button
          type="button"
          className="tp-knowledge-ai"
          onClick={() => navigate('aiAnalysis')}
        >
          <b aria-hidden="true">✦</b>
          <small>Pusula AI</small>
        </button>
        <button type="button" onClick={() => navigate('calendar')}>
          <span aria-hidden="true">□</span>
          <small>Takvim</small>
        </button>
        <button type="button" onClick={() => setSideMenuOpen?.(true)}>
          <span aria-hidden="true">•••</span>
          <small>Daha Fazla</small>
        </button>
      </nav>
    </div>
  );
}
