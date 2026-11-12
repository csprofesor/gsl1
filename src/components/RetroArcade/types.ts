export type RetroGameId = 'snake' | 'pong' | 'space' | '2048' | 'brick';

export interface RetroGameInfo {
  id: RetroGameId;
  title: string;
  subtitle: string;
  category: string;
  year: string;
  badge: string;
  color: string;
  accent: string;
  description: string;
  controls: {
    dpad: string;
    ok: string;
    back: string;
  };
}

export const RETRO_GAMES_LIST: RetroGameInfo[] = [
  {
    id: 'snake',
    title: 'Retro Snake 97',
    subtitle: 'Nostaljik Yılan Oyunu',
    category: 'Arcade / Klasik',
    year: '1997',
    badge: 'KLASİK',
    color: '#064E3B',
    accent: '#10B981',
    description: 'Yön tuşlarıyla yılanı yönetin, yemleri toplayarak büyüyün. Duvarlara ve kendinize çarpmayın!',
    controls: {
      dpad: 'Yukarı / Aşağı / Sol / Sağ: Yılanı Yönlendir',
      ok: 'Başlat / Yeniden Oyna',
      back: 'Çıkış / Duraklat',
    },
  },
  {
    id: 'pong',
    title: 'Retro Pong TV',
    subtitle: 'TV Tenis Şampiyonası',
    category: 'Retro Spor / AI',
    year: '1972',
    badge: 'ARCADE',
    color: '#1E1B4B',
    accent: '#6366F1',
    description: 'Tarihin ilk video oyunu! Yukarı ve Aşağı tuşlarıyla raketinizi kontrol edin, yapay zekayı alt edin.',
    controls: {
      dpad: 'Yukarı / Aşağı: Raketi Hareket Ettir',
      ok: 'Topu Servis Et / Başlat',
      back: 'Çıkış',
    },
  },
  {
    id: 'space',
    title: 'Space Defender',
    subtitle: 'Retro Galaksi Savunması',
    category: 'Uzay Vurucu / Shooter',
    year: '1980',
    badge: 'SHOOTER',
    color: '#4C1D95',
    accent: '#8B5CF6',
    description: 'Dünyayı istilacı uzaylı filolarından koruyun. Sol ve Sağ ile manevra yapın, [OK] ile ateş edin!',
    controls: {
      dpad: 'Sol / Sağ: Gemiyi Hareket Ettir',
      ok: 'Lazer Ateşle / Başlat',
      back: 'Çıkış',
    },
  },
  {
    id: 'brick',
    title: 'Brick Breaker TV',
    subtitle: 'Tuğla Kırma Efsanesi',
    category: 'Refleks / Arcade',
    year: '1976',
    badge: 'POPÜLER',
    color: '#831010',
    accent: '#EF4444',
    description: 'Topu paletinizle sektirin, tavandaki tüm renkli tuğlaları kırarak en yüksek skora ulaşın.',
    controls: {
      dpad: 'Sol / Sağ: Paleti Kaydır',
      ok: 'Topu Fırlat / Başlat',
      back: 'Çıkış',
    },
  },
  {
    id: '2048',
    title: 'Retro 2048 TV',
    subtitle: 'Nostaljik Sayı Birleştirme',
    category: 'Mantık / Bulmaca',
    year: '2014',
    badge: 'MANTIK',
    color: '#78350F',
    accent: '#F59E0B',
    description: 'Karoları D-Pad ile kaydırın, aynı sayıları birleştirerek efsanevi 2048 karosuna ulaşın!',
    controls: {
      dpad: 'Yukarı / Aşağı / Sol / Sağ: Karoları Kaydır',
      ok: 'Yeni Oyun',
      back: 'Çıkış',
    },
  },
];
