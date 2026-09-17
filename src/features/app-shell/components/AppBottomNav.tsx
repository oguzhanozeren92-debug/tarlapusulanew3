import { CalendarDays, CloudSun, House, MapPinned, Sparkles } from 'lucide-react';
import type { Screen } from '../../../types';

type AppBottomNavProps = {
  activeScreen?: Screen | string;
  onHome: () => void;
  onWeather: () => void;
  onAi: () => void;
  onCalendar: () => void;
  onFields: () => void;
};

/**
 * Uygulamanın tek alt navigasyonu.
 * Görsel sınıflar HomeScreen'deki onaylı tp-bottom tasarımını aynen kullanır.
 * Sayfalar kendi alt menülerini üretmek yerine bu bileşeni kullanmalıdır.
 */
export default function AppBottomNav({
  activeScreen,
  onHome,
  onWeather,
  onAi,
  onCalendar,
  onFields,
}: AppBottomNavProps) {
  const active = String(activeScreen ?? '');

  return (
    <nav className="tp-bottom" aria-label="Ana menü">
      <button className={active === 'home' ? 'active' : undefined} type="button" onClick={onHome}>
        <span className="tp-bottom-icon-shell">
          <House className="tp-bottom-line-icon" aria-hidden="true" strokeWidth={1.8} />
        </span>
        Ana Sayfa
      </button>

      <button className={active === 'weatherHub' ? 'active' : undefined} type="button" onClick={onWeather} aria-label="Hava Durumu">
        <span className="tp-bottom-icon-shell">
          <CloudSun className="tp-bottom-line-icon" aria-hidden="true" strokeWidth={1.8} />
        </span>
        Hava Durumu
      </button>

      <button className={`ai${active === 'aiAnalysis' ? ' active' : ''}`} type="button" onClick={onAi}>
        <span className="tp-bottom-ai-shell">
          <Sparkles className="tp-bottom-line-icon" aria-hidden="true" strokeWidth={1.8} />
        </span>
        Pusula AI
      </button>

      <button className={active === 'calendar' ? 'active' : undefined} type="button" onClick={onCalendar}>
        <span className="tp-bottom-icon-shell">
          <CalendarDays className="tp-bottom-line-icon" aria-hidden="true" strokeWidth={1.8} />
        </span>
        Takvim
      </button>

      <button type="button" onClick={onFields} aria-label="Tarlalarım listesini aç">
        <span className="tp-bottom-icon-shell">
          <MapPinned className="tp-bottom-line-icon" aria-hidden="true" strokeWidth={1.8} />
        </span>
        Tarlalarım
      </button>
    </nav>
  );
}
