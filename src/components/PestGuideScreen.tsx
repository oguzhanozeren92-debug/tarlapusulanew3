import AppBottomNav from '../features/app-shell/components/AppBottomNav';
import KnowledgeLibrary from '../features/knowledge/components/KnowledgeLibrary';
import type { Field, Screen } from '../types';
import '../pages/Home/HomeScreen.css';
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
 * Alt navigasyon uygulamanın ortak AppBottomNav bileşenini kullanır.
 */
export default function PestGuideScreen({ setScreen }: PestGuideScreenProps) {
  const navigate = (screen: Screen) => setScreen?.(screen);

  return (
    <div className="tp-knowledge-page">
      <main className="tp-knowledge-canvas" aria-label="Bilgi Rehberi">
        <KnowledgeLibrary />
      </main>

      <AppBottomNav
        activeScreen="pestGuideHub"
        onHome={() => navigate('home')}
        onWeather={() => navigate('weatherHub')}
        onAi={() => navigate('aiAnalysis')}
        onCalendar={() => navigate('calendar')}
        onFields={() => navigate('home')}
      />
    </div>
  );
}
