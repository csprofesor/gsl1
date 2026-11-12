import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  BackHandler,
  ScrollView,
  Image,
} from 'react-native';
import { RetroGameId, RETRO_GAMES_LIST, RetroGameInfo } from './types';
import { SnakeGame } from './SnakeGame';
import { PongGame } from './PongGame';
import { SpaceGame } from './SpaceGame';
import { BrickGame } from './BrickGame';
import { Game2048 } from './Game2048';
import { SystemIcons, GlossyIcons } from '../../assets/icons';

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

  const activeGame = RETRO_GAMES_LIST.find((g) => g.id === selectedGameId) || RETRO_GAMES_LIST[0];

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
      onClose();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* Üst Bar: Başlık, Seçili Oyun, Kapat Butonu */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={GlossyIcons.apps}
              style={{ width: 34, height: 34, marginRight: 12 }}
              resizeMode="contain"
            />
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.headerTitle}>GS RETRO ARCADE SALONU</Text>
                <View style={[styles.badge, { backgroundColor: activeGame.accent }]}>
                  <Text style={styles.badgeText}>{activeGame.badge}</Text>
                </View>
              </View>
              <Text style={styles.headerSubtitle}>
                {activeGame.title} • {activeGame.subtitle} ({activeGame.year})
              </Text>
            </View>
          </View>

          {/* Çıkış Butonu */}
          <FocusableItem
            style={styles.closeBtn}
            focusedStyle={styles.closeBtnFocused}
            onPress={onClose}
          >
            {() => (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.closeBtnText}>Oyundan Çık [GERİ]</Text>
              </View>
            )}
          </FocusableItem>
        </View>

        {/* Ana Oyun & Yan Panel Gövdesi */}
        <View style={styles.body}>
          {/* Sol / Merkez: Oyun Sahnesi */}
          <View style={styles.gameStage}>
            {selectedGameId === 'snake' && (
              <SnakeGame onScoreUpdate={setCurrentScore} remoteEvent={remoteEvent} />
            )}
            {selectedGameId === 'pong' && (
              <PongGame onScoreUpdate={setCurrentScore} remoteEvent={remoteEvent} />
            )}
            {selectedGameId === 'space' && (
              <SpaceGame onScoreUpdate={setCurrentScore} remoteEvent={remoteEvent} />
            )}
            {selectedGameId === 'brick' && (
              <BrickGame onScoreUpdate={setCurrentScore} remoteEvent={remoteEvent} />
            )}
            {selectedGameId === '2048' && (
              <Game2048 onScoreUpdate={setCurrentScore} remoteEvent={remoteEvent} />
            )}
          </View>

          {/* Sağ Panel: Oyun Seçici & Kumanda Rehberi */}
          <View style={styles.sidePanel}>
            {/* Kumanda İpuçları Kutusu */}
            <View style={styles.controlsCard}>
              <Text style={styles.controlsCardTitle}>TV KUMANDASI KONTROLLERİ</Text>
              <View style={styles.controlRow}>
                <Text style={styles.controlKey}>▲/▼/◄/►</Text>
                <Text style={styles.controlDesc}>{activeGame.controls.dpad}</Text>
              </View>
              <View style={styles.controlRow}>
                <Text style={styles.controlKey}>[OK]</Text>
                <Text style={styles.controlDesc}>{activeGame.controls.ok}</Text>
              </View>
              <View style={styles.controlRow}>
                <Text style={styles.controlKey}>[GERİ]</Text>
                <Text style={styles.controlDesc}>Oyundan Çıkış / Duraklat</Text>
              </View>
            </View>

            {/* Diğer Retro Oyunlar Listesi */}
            <Text style={styles.otherGamesTitle}>DİĞER RETRO OYUNLAR</Text>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {RETRO_GAMES_LIST.map((game) => {
                const isCurrent = game.id === selectedGameId;
                return (
                  <FocusableItem
                    key={game.id}
                    style={[
                      styles.gameListItem,
                      isCurrent && { borderColor: game.accent, backgroundColor: 'rgba(255, 255, 255, 0.12)' },
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
        </View>
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
    paddingBottom: 16,
    marginBottom: 16,
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
    width: 290,
    gap: 14,
  },
  controlsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 14,
  },
  controlsCardTitle: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 10,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  controlKey: {
    color: '#FACC15',
    fontSize: 11,
    fontWeight: '900',
    width: 72,
  },
  controlDesc: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  otherGamesTitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 6,
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
});
