import { NativeModules, Platform } from 'react-native';

const { TVAppManager } = NativeModules;

const DREAMLO_PUBLIC_KEY = '6af649308f40bb08a4d6b2d2';
const DREAMLO_PRIVATE_KEY = 'kAEpK3Ltfke2IFgv8NPFtwSygxwtbGq0utazsDw3dtsQ';
const PLAYER_NAME_KEY = 'gs_tv_arcade_player_name';

let cachedPlayerName = '';

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  gameId: string;
  date: string;
}

export const getStoredPlayerName = async (): Promise<string> => {
  if (cachedPlayerName) return cachedPlayerName;
  try {
    if (Platform.OS === 'android' && TVAppManager && TVAppManager.getSetting) {
      const saved = await TVAppManager.getSetting(PLAYER_NAME_KEY, '');
      if (saved && typeof saved === 'string' && saved.trim().length > 0) {
        cachedPlayerName = saved.trim();
        return cachedPlayerName;
      }
    }
  } catch {}
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const defaultName = `GS_Oyuncu_${randomSuffix}`;
  cachedPlayerName = defaultName;
  savePlayerName(defaultName).catch(() => {});
  return defaultName;
};

export const savePlayerName = async (name: string): Promise<void> => {
  try {
    const cleanName = name.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 14);
    if (cleanName.length > 0) {
      cachedPlayerName = cleanName;
      if (Platform.OS === 'android' && TVAppManager && TVAppManager.saveSetting) {
        await TVAppManager.saveSetting(PLAYER_NAME_KEY, cleanName);
      }
    }
  } catch {}
};

export const fetchLeaderboard = async (gameId?: string): Promise<LeaderboardEntry[]> => {
  try {
    const response = await fetch(`http://dreamlo.com/lb/${DREAMLO_PUBLIC_KEY}/json`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return [];

    const data = await response.json();
    const rawEntries = data?.dreamlo?.leaderboard?.entry;
    if (!rawEntries) return [];

    const list: any[] = Array.isArray(rawEntries) ? rawEntries : [rawEntries];

    // Belirli bir oyun filtrelenmişse o oyunu seç, yoksa tümünü al
    const filtered = gameId
      ? list.filter((item) => (item.text || '').toLowerCase() === gameId.toLowerCase())
      : list;

    // Skora göre büyükten küçüğe sırala
    filtered.sort((a, b) => (parseInt(b.score, 10) || 0) - (parseInt(a.score, 10) || 0));

    return filtered.slice(0, 10).map((item, index) => ({
      rank: index + 1,
      name: item.name || 'Bilinmeyen Oyuncu',
      score: parseInt(item.score, 10) || 0,
      gameId: item.text || 'genel',
      date: item.date || '',
    }));
  } catch {
    return [];
  }
};

export const submitGameScore = async (
  playerName: string,
  score: number,
  gameId: string
): Promise<{ success: boolean; rank?: number }> => {
  if (score <= 0) return { success: false };
  try {
    const safeName = playerName.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 14) || 'Oyuncu';
    const safeGameId = gameId.toLowerCase();

    const url = `http://dreamlo.com/lb/${DREAMLO_PRIVATE_KEY}/add/${encodeURIComponent(
      safeName
    )}/${score}/0/${encodeURIComponent(safeGameId)}`;

    const res = await fetch(url, { method: 'GET' });
    if (res.ok) {
      const currentList = await fetchLeaderboard(safeGameId);
      const myRank = currentList.findIndex((e) => e.name === safeName && e.score === score) + 1;
      return { success: true, rank: myRank > 0 ? myRank : undefined };
    }
    return { success: false };
  } catch {
    return { success: false };
  }
};
