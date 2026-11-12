import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  BackHandler,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { RetroGameId, RETRO_GAMES_LIST } from './types';
import { SnakeGame } from './SnakeGame';
import { PongGame } from './PongGame';
import { SpaceGame } from './SpaceGame';
import { BrickGame } from './BrickGame';
import { Game2048 } from './Game2048';
import { GlossyIcons } from '../../assets/icons';
import {
  fetchLeaderboard,
  submitGameScore,
  getStoredPlayerName,
  savePlayerName,
  LeaderboardEntry,
} from '../../services/leaderboardService';

const PRESET_NICKNAMES = [
  'GS_Efsane',
  'RetroKing',
  'ArcadeMaster',
  'MiBox_Pro',
  'TV_Sampiyonu',
  'PixelHero',
  'Galaksi_Krali',
  'HizliKobra',
  'KralOyuncu',
  'Bozkurt_TV',
  'Sonsuz_Skor',
  'RetroNinja',
];

interface RetroArcadeModalProps {
  visible: boolean;
  initialGameId?: RetroGameId;
  onClose: () => void;
  remoteEvent?: { eventType: string; key?: string } | null;
  FocusableItemComponent: any;
}

export const RetroArcadeModal: React.FC<RetroArcadeModalProps> = ({
  visible,
  initialGameId = 'snake',
  onClose,
  remoteEvent,
  FocusableItemComponent: FocusableItem,
}) => {
  const [selectedGameId, setSelectedGameId] = useState<RetroGameId>(initialGameId);
  const [currentScore, setCurrentScore] = useState(0);
  const [playerName, setPlayerName] = useState('GS_Oyuncu');
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'games'>('leaderboard');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLb, setLoadingLb] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeGame = RETRO_GAMES_LIST.find((g) => g.id === selectedGameId) || RETRO_GAMES_LIST[0];

  // Oyuncu Adını Yükle
  useEffect(() => {
    getStoredPlayerName().then((n) => setPlayerName(n));
  }, []);

  // Liderlik Tablosunu Çek
  const loadLeaderboardData = useCallback(async (gameId: string) => {
    setLoadingLb(true);
    const list = await fetchLeaderboard(gameId);
    setLeaderboard(list);
    setLoadingLb(false);
  }, []);

  useEffect(() => {
    if (visible) {
      loadLeaderboardData(selectedGameId);
    }
  }, [visible, selectedGameId, loadLeaderboardData]);

  useEffect(() => {
    if (visible && initialGameId) {
      setSelectedGameId(initialGameId);
      setCurrentScore(0);
    }
  }, [visible, initialGameId]);

  // Donanım Geri Tuşu
  useEffect(() => {
    if (!visible) return;
    const backAction = () => {
      if (nameModalOpen) {
        setNameModalOpen(false);
        return true;
      }
      onClose();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [visible, nameModalOpen, onClose]);

  // Oyun Bittiğinde Skoru Otomatik Gönder
  const handleGameOver = useCallback(
    async (finalScore: number) => {
      if (finalScore <= 0) return;

      setToastMessage(`🏆 Skorunuz buluta gönderiliyor: ${finalScore} Puan...`);
      const result = await submitGameScore(playerName, finalScore, selectedGameId);

      if (result.success) {
        const rankText = result.rank ? `Canlı Tabloda ${result.rank}. sıradasınız! 🌟` : 'Sıralamaya eklendi!';
        setToastMessage(`Tebrikler! ${finalScore} Puan ile ${rankText}`);
        loadLeaderboardData(selectedGameId);
      } else {
        setToastMessage(`Oyun bitti! Skorunuz: ${finalScore}`);
      }

      setTimeout(() => {
        setToastMessage(null);
      }, 5000);
    },
    [playerName, selectedGameId, loadLeaderboardData]
  );

  const handleSelectName = async (name: string) => {
    await savePlayerName(name);
    setPlayerName(name);
    setNameModalOpen(false);
    setToastMessage(`Oyuncu adınız "${name}" olarak güncellendi.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* Üst Bar: Başlık, Oyuncu Bilgisi, Kapat Butonu */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={GlossyIcons.apps}
              style={{ width: 34, height: 34, marginRight: 12 }}
              resizeMode="contain"
            />
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.headerTitle}>GS RETRO TV ARCADE</Text>
                <View style={[styles.badge, { backgroundColor: activeGame.accent }]}>
                  <Text style={styles.badgeText}>{activeGame.badge}</Text>
                </View>
              </View>
              <Text style={styles.headerSubtitle}>
                {activeGame.title} • {activeGame.subtitle}
              </Text>
            </View>
          </View>

          {/* Orta: Oyuncu Profili & Değiştir Butonu */}
          <FocusableItem
            style={styles.playerProfileBtn}
            focusedStyle={styles.playerProfileBtnFocused}
            onPress={() => setNameModalOpen(true)}
          >
            {() => (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.playerDot} />
                <Text style={styles.playerProfileLabel}>OYUNCU:</Text>
                <Text style={styles.playerProfileName}>{playerName}</Text>
                <Text style={styles.playerEditHint}>[Ad Değiştir]</Text>
              </View>
            )}
          </FocusableItem>

          {/* Çıkış Butonu */}
          <FocusableItem
            style={styles.closeBtn}
            focusedStyle={styles.closeBtnFocused}
            onPress={onClose}
          >
            {() => <Text style={styles.closeBtnText}>Oyundan Çık [GERİ]</Text>}
          </FocusableItem>
        </View>

        {/* Canlı Skor Kutlama Bildirimi */}
        {!!toastMessage && (
          <View style={styles.toastBanner}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}

        {/* Ana Oyun & Yan Panel Gövdesi */}
        <View style={styles.body}>
          {/* Sol / Merkez: Oyun Sahnesi */}
          <View style={styles.gameStage}>
            {selectedGameId === 'snake' && (
              <SnakeGame
                onScoreUpdate={setCurrentScore}
                onGameOver={handleGameOver}
                remoteEvent={remoteEvent}
              />
            )}
            {selectedGameId === 'pong' && (
              <PongGame
                onScoreUpdate={setCurrentScore}
                onGameOver={handleGameOver}
                remoteEvent={remoteEvent}
              />
            )}
            {selectedGameId === 'space' && (
              <SpaceGame
                onScoreUpdate={setCurrentScore}
                onGameOver={handleGameOver}
                remoteEvent={remoteEvent}
              />
            )}
            {selectedGameId === 'brick' && (
              <BrickGame
                onScoreUpdate={setCurrentScore}
                onGameOver={handleGameOver}
                remoteEvent={remoteEvent}
              />
            )}
            {selectedGameId === '2048' && (
              <Game2048
                onScoreUpdate={setCurrentScore}
                onGameOver={handleGameOver}
                remoteEvent={remoteEvent}
              />
            )}
          </View>

          {/* Sağ Panel: Liderlik Tablosu & Oyun Seçici */}
          <View style={styles.sidePanel}>
            {/* Sekme Butonları (Liderlik Tablosu vs Oyun Listesi) */}
            <View style={styles.tabBar}>
              <FocusableItem
                style={[
                  styles.tabBtn,
                  activeTab === 'leaderboard' && styles.tabBtnActive,
                ]}
                focusedStyle={{ borderColor: '#FFFFFF', transform: [{ scale: 1.04 }] }}
                onPress={() => setActiveTab('leaderboard')}
              >
                {() => (
                  <Text
                    style={[
                      styles.tabBtnText,
                      activeTab === 'leaderboard' && { color: '#FACC15', fontWeight: '900' },
                    ]}
                  >
                    CANLI SIRALAMA
                  </Text>
                )}
              </FocusableItem>

              <FocusableItem
                style={[
                  styles.tabBtn,
                  activeTab === 'games' && styles.tabBtnActive,
                ]}
                focusedStyle={{ borderColor: '#FFFFFF', transform: [{ scale: 1.04 }] }}
                onPress={() => setActiveTab('games')}
              >
                {() => (
                  <Text
                    style={[
                      styles.tabBtnText,
                      activeTab === 'games' && { color: '#38BDF8', fontWeight: '900' },
                    ]}
                  >
                    OYUN SEÇİCİ
                  </Text>
                )}
              </FocusableItem>
            </View>

            {/* SEKMELER İÇERİĞİ */}
            {activeTab === 'leaderboard' ? (
              <View style={{ flex: 1 }}>
                <View style={styles.lbHeaderRow}>
                  <Text style={styles.lbSubtitle}>TOP 10 ŞAMPİYONLAR ({activeGame.title})</Text>
                  <FocusableItem
                    style={styles.refreshBtn}
                    focusedStyle={{ borderColor: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.2)' }}
                    onPress={() => loadLeaderboardData(selectedGameId)}
                  >
                    {() => <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>Yenile</Text>}
                  </FocusableItem>
                </View>

                {loadingLb ? (
                  <View style={styles.centerLoading}>
                    <ActivityIndicator size="small" color="#FACC15" />
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 8 }}>
                      Canlı sıralama yükleniyor...
                    </Text>
                  </View>
                ) : leaderboard.length === 0 ? (
                  <View style={styles.emptyLb}>
                    <Text style={{ color: '#FACC15', fontSize: 28, marginBottom: 6 }}>🏆</Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                      Henüz Skor Kaydı Yok
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, textAlign: 'center', marginTop: 4 }}>
                      İlk oynayan siz olun ve adınızı 1. sıraya yazdırın!
                    </Text>
                  </View>
                ) : (
                  <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    {leaderboard.map((entry) => {
                      const isMe = entry.name.toLowerCase() === playerName.toLowerCase();
                      const medal =
                        entry.rank === 1
                          ? '🥇'
                          : entry.rank === 2
                          ? '🥈'
                          : entry.rank === 3
                          ? '🥉'
                          : `#${entry.rank}`;
                      return (
                        <View
                          key={`${entry.name}-${entry.score}-${entry.rank}`}
                          style={[
                            styles.lbRow,
                            isMe && styles.lbRowHighlight,
                          ]}
                        >
                          <Text style={styles.lbRank}>{medal}</Text>
                          <Text
                            style={[
                              styles.lbName,
                              isMe && { color: '#FACC15', fontWeight: '900' },
                            ]}
                            numberOfLines={1}
                          >
                            {entry.name}
                          </Text>
                          <Text style={styles.lbScore}>{entry.score.toLocaleString('tr-TR')}</Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}

                {/* Alt Kumanda İpucu */}
                <View style={styles.controlsMiniBox}>
                  <Text style={styles.controlsMiniTitle}>KONTROLLER</Text>
                  <Text style={styles.controlsMiniText}>▲/▼/◄/►: Yönlendir • [OK]: Başlat/Ateş</Text>
                </View>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                <Text style={styles.otherGamesTitle}>DİĞER RETRO OYUNLAR</Text>
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                  {RETRO_GAMES_LIST.map((game) => {
                    const isCurrent = game.id === selectedGameId;
                    return (
                      <FocusableItem
                        key={game.id}
                        style={[
                          styles.gameListItem,
                          isCurrent && {
                            borderColor: game.accent,
                            backgroundColor: 'rgba(255, 255, 255, 0.12)',
                          },
                        ]}
                        focusedStyle={{
                          borderColor: '#FFFFFF',
                          backgroundColor: game.accent,
                          transform: [{ scale: 1.04 }],
                        }}
                        onPress={() => setSelectedGameId(game.id)}
                      >
                        {() => (
                          <View style={styles.gameListItemContent}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.gameListTitle}>{game.title}</Text>
                              <Text style={styles.gameListCategory}>{game.category}</Text>
                            </View>
                            {isCurrent && (
                              <View style={[styles.activeDot, { backgroundColor: game.accent }]} />
                            )}
                          </View>
                        )}
                      </FocusableItem>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        {/* OYUNCU ADI SEÇME / DEĞİŞTİRME MODALI */}
        {nameModalOpen && (
          <View style={styles.nickModalOverlay}>
            <View style={styles.nickModalBox}>
              <Text style={styles.nickModalTitle}>OYUNCU ADINI SEÇİN</Text>
              <Text style={styles.nickModalDesc}>
                Liderlik tablosunda diğer TV kullanıcılarına karşı görünecek takma adınızı belirleyin:
              </Text>

              <View style={styles.nickGrid}>
                {PRESET_NICKNAMES.map((nick) => {
                  const isCurrent = nick.toLowerCase() === playerName.toLowerCase();
                  return (
                    <FocusableItem
                      key={nick}
                      style={[
                        styles.nickItem,
                        isCurrent && { borderColor: '#FACC15', backgroundColor: 'rgba(250, 204, 21, 0.15)' },
                      ]}
                      focusedStyle={{
                        backgroundColor: '#FACC15',
                        borderColor: '#FFFFFF',
                        transform: [{ scale: 1.06 }],
                      }}
                      onPress={() => handleSelectName(nick)}
                    >
                      {(isFocused: boolean) => (
                        <Text
                          style={[
                            styles.nickItemText,
                            isFocused ? { color: '#000', fontWeight: '900' } : isCurrent ? { color: '#FACC15', fontWeight: '900' } : null,
                          ]}
                        >
                          {nick}
                        </Text>
                      )}
                    </FocusableItem>
                  );
                })}
              </View>

              <FocusableItem
                style={styles.nickCloseBtn}
                focusedStyle={{ backgroundColor: '#EF4444', borderColor: '#FFFFFF' }}
                onPress={() => setNameModalOpen(false)}
              >
                {() => <Text style={styles.nickCloseText}>Vazgeç [GERİ]</Text>}
              </FocusableItem>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#07090E',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
    paddingBottom: 14,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  playerProfileBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1.2,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  playerProfileBtnFocused: {
    backgroundColor: 'rgba(250, 204, 21, 0.25)',
    borderColor: '#FACC15',
    transform: [{ scale: 1.05 }],
  },
  playerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  playerProfileLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    fontWeight: '800',
  },
  playerProfileName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  playerEditHint: {
    color: '#FACC15',
    fontSize: 10,
    fontWeight: '700',
  },
  closeBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.20)',
    borderColor: '#EF4444',
    borderWidth: 1.2,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeBtnFocused: {
    backgroundColor: '#EF4444',
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.05 }],
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  toastBanner: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  toastText: {
    color: '#07090E',
    fontSize: 13,
    fontWeight: '900',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    gap: 20,
  },
  gameStage: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  sidePanel: {
    width: 310,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: '#FFFFFF',
  },
  tabBtnText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10.5,
    fontWeight: '700',
  },
  lbHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  lbSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  refreshBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyLb: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  lbRowHighlight: {
    borderColor: '#FACC15',
    backgroundColor: 'rgba(250, 204, 21, 0.12)',
  },
  lbRank: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FACC15',
    width: 28,
  },
  lbName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  lbScore: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '900',
  },
  controlsMiniBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  controlsMiniTitle: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  controlsMiniText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 10,
    fontWeight: '600',
  },
  otherGamesTitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  gameListItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  gameListItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gameListTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  gameListCategory: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nickModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  nickModalBox: {
    width: 580,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FACC15',
    padding: 24,
    alignItems: 'center',
  },
  nickModalTitle: {
    color: '#FACC15',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  nickModalDesc: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 18,
  },
  nickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 20,
  },
  nickItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  nickItemText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  nickCloseBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  nickCloseText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
