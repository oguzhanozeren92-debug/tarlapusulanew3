import PestGuideScreenLegacy, { type PestGuideScreenProps } from './PestGuideScreenLegacy';
import './PestGuideShellOverride.css';

/**
 * Bilgi Rehberi içerik deneyimini korur; navigasyonu diğer TarlaPusula
 * ekranlarıyla aynı GlobalPusulaBand + AppDrawer kabuğuna bırakır.
 */
export default function PestGuideScreen(props: PestGuideScreenProps) {
  return <PestGuideScreenLegacy {...props} />;
}

export * from './PestGuideScreenLegacy';
