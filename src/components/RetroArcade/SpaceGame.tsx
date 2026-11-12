import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const GAME_W = 680;
const GAME_H = 430;
const SHIP_W = 38;
const SHIP_H = 26;
const ALIEN_W = 28;
const ALIEN_H = 20;

type Bullet = { id: number; x: number; y: number };
type Alien = { id: number; x: number; y: number; alive: boolean; row: number };

interface SpaceGameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  remoteEvent?: { eventType: string; key?: string } | null;
}

export const SpaceGame: React.FC<SpaceGameProps> = ({ onScoreUpdate, onGameOver, remoteEvent }) => {
  const [shipX, setShipX] = useState((GAME_W - SHIP_W) / 2);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [aliens, setAliens] = useState<Alien[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const shipXRef = useRef((GAME_W - SHIP_W) / 2);
  const alienDirRef = useRef(1); // 1: sağ, -1: sol
  const alienStepDownRef = useRef(false);
  const bulletIdRef = useRef(0);

  const spawnAliens = useCallback((currentWave = 1) => {
    const rows = 3;
    const cols = 8;
    const startX = 60;
    const startY = 40;
    const spacingX = 65;
    const spacingY = 38;

    const list: Alien[] = [];
    let id = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        list.push({
          id: id++,
          x: startX + c * spacingX,
          y: startY + r * spacingY,
          alive: true,
          row: r,
        });
      }
    }
    setAliens(list);
    alienDirRef.current = 1;
  }, []);

  const startGame = useCallback(() => {
    shipXRef.current = (GAME_W - SHIP_W) / 2;
    setShipX(shipXRef.current);
    setBullets([]);
    setScore(0);
    setLives(3);
    setWave(1);
    setGameOver(false);
    setIsPlaying(true);
    spawnAliens(1);
    onScoreUpdate?.(0);
  }, [spawnAliens, onScoreUpdate]);

  // Kumanda Tuşları
  useEffect(() => {
    if (!remoteEvent) return;
    const type = (remoteEvent.eventType || '').toLowerCase();

    if (type === 'select' || type === 'playpause') {
      if (!isPlaying || gameOver) {
        startGame();
        return;
      }
      // Oyun içindeyken OK = Ateş et
      const bulletX = shipXRef.current + SHIP_W / 2 - 2;
      const bulletY = GAME_H - SHIP_H - 14;
      setBullets((prev) => {
        if (prev.length >= 4) return prev; // max 4 mermi
        return [...prev, { id: bulletIdRef.current++, x: bulletX, y: bulletY }];
      });
      return;
    }

    if (!isPlaying || gameOver) return;

    const step = 28;
    if (type === 'left') {
      const nextX = Math.max(16, shipXRef.current - step);
      shipXRef.current = nextX;
      setShipX(nextX);
    } else if (type === 'right') {
      const nextX = Math.min(GAME_W - SHIP_W - 16, shipXRef.current + step);
      shipXRef.current = nextX;
      setShipX(nextX);
    }
  }, [remoteEvent, isPlaying, gameOver, startGame]);

  // Oyun Döngüsü
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    let tick = 0;
    const timer = setInterval(() => {
      tick++;

      // 1. Mermileri yukarı taşı & çarpışma kontrolü
      setBullets((prevBullets) => {
        const nextBullets: Bullet[] = [];
        prevBullets.forEach((b) => {
          const nextY = b.y - 12;
          if (nextY > 0) {
            nextBullets.push({ ...b, y: nextY });
          }
        });
        return nextBullets;
      });

      // 2. Mermi ile Uzaylı Çarpışması
      setAliens((prevAliens) => {
        let hitOccurred = false;
        let pointsToAdd = 0;

        const updated = prevAliens.map((alien) => {
          if (!alien.alive) return alien;

          // Mermi bu uzaylıya çarptı mı?
          let hit = false;
          setBullets((curBullets) => {
            const filtered = curBullets.filter((b) => {
              const collide =
                b.x >= alien.x &&
                b.x <= alien.x + ALIEN_W &&
                b.y >= alien.y &&
                b.y <= alien.y + ALIEN_H;
              if (collide) {
                hit = true;
                hitOccurred = true;
              }
              return !collide;
            });
            return hit ? filtered : curBullets;
          });

          if (hit) {
            pointsToAdd += (3 - alien.row) * 15;
            return { ...alien, alive: false };
          }
          return alien;
        });

        if (pointsToAdd > 0) {
          setScore((s) => {
            const nextScore = s + pointsToAdd;
            onScoreUpdate?.(nextScore);
            return nextScore;
          });
        }

        // Bütün uzaylılar öldü mü? Yeni dalga!
        if (updated.length > 0 && updated.every((a) => !a.alive)) {
          setWave((w) => {
            const nextW = w + 1;
            spawnAliens(nextW);
            return nextW;
          });
        }

        return updated;
      });

      // 3. Uzaylı Hareketi (her 12 tickte bir)
      if (tick % 14 === 0) {
        setAliens((prevAliens) => {
          const livingAliens = prevAliens.filter((a) => a.alive);
          if (livingAliens.length === 0) return prevAliens;

          let hitWall = false;
          livingAliens.forEach((a) => {
            if (
              (alienDirRef.current === 1 && a.x + ALIEN_W >= GAME_W - 24) ||
              (alienDirRef.current === -1 && a.x <= 24)
            ) {
              hitWall = true;
            }
          });

          if (hitWall) {
            alienDirRef.current = -alienDirRef.current;
            alienStepDownRef.current = true;
          }

          const dx = alienDirRef.current * 14;
          const dy = alienStepDownRef.current ? 16 : 0;
          alienStepDownRef.current = false;

          let reachedBottom = false;
          const moved = prevAliens.map((a) => {
            const ny = a.y + dy;
            if (a.alive && ny + ALIEN_H >= GAME_H - SHIP_H - 10) {
              reachedBottom = true;
            }
            return {
              ...a,
              x: a.x + dx,
              y: ny,
            };
          });

          if (reachedBottom) {
            setGameOver(true);
            setIsPlaying(false);
            onGameOver?.(score);
          }

          return moved;
        });
      }
    }, 24);

    return () => clearInterval(timer);
  }, [isPlaying, gameOver, spawnAliens, onScoreUpdate]);

  return (
    <View style={styles.container}>
      {/* Üst Bilgi Barı */}
      <View style={styles.infoBar}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>SKOR</Text>
          <Text style={styles.statValue}>{score}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>DALGA</Text>
          <Text style={[styles.statValue, { color: '#A78BFA' }]}>WAVE {wave}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>CAN</Text>
          <Text style={[styles.statValue, { color: '#F43F5E' }]}>{'▲ '.repeat(lives)}</Text>
        </View>
      </View>

      {/* Uzay Sahası */}
      <View style={styles.spaceArena}>
        {/* Uzaylılar */}
        {aliens.map(
          (alien) =>
            alien.alive && (
              <View
                key={alien.id}
                style={[
                  styles.alien,
                  {
                    left: alien.x,
                    top: alien.y,
                    backgroundColor:
                      alien.row === 0 ? '#F43F5E' : alien.row === 1 ? '#FBBF24' : '#34D399',
                  },
                ]}
              >
                {/* Göz noktaları */}
                <View style={styles.alienEye} />
                <View style={styles.alienEye} />
              </View>
            )
        )}

        {/* Mermiler */}
        {bullets.map((b) => (
          <View key={b.id} style={[styles.bullet, { left: b.x, top: b.y }]} />
        ))}

        {/* Uzay Gemisi */}
        <View style={[styles.ship, { left: shipX }]}>
          <View style={styles.shipNose} />
        </View>

        {/* Oyun Başlangıç / Game Over */}
        {(!isPlaying || gameOver) && (
          <View style={styles.overlay}>
            <Text style={styles.overlayTitle}>
              {gameOver ? 'GALAKSİ DÜŞTÜ!' : 'SPACE DEFENDER'}
            </Text>
            {gameOver && <Text style={styles.overlayScore}>Toplam Skor: {score}</Text>}
            <View style={styles.pressOkBadge}>
              <Text style={styles.pressOkText}>[OK] TUŞUNA BASIN</Text>
            </View>
            <Text style={styles.overlayHint}>
              Kumanda [SOL] ve [SAĞ] ile gemiyi hareket ettirin. Ateş etmek için [OK] tuşuna basın!
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: GAME_W,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  spaceArena: {
    width: GAME_W,
    height: GAME_H,
    backgroundColor: '#090514',
    borderColor: '#8B5CF6',
    borderWidth: 3,
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  alien: {
    position: 'absolute',
    width: ALIEN_W,
    height: ALIEN_H,
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  alienEye: {
    width: 4,
    height: 4,
    backgroundColor: '#090514',
    borderRadius: 2,
  },
  bullet: {
    position: 'absolute',
    width: 4,
    height: 12,
    backgroundColor: '#38BDF8',
    borderRadius: 2,
    shadowColor: '#38BDF8',
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  ship: {
    position: 'absolute',
    bottom: 12,
    width: SHIP_W,
    height: SHIP_H,
    backgroundColor: '#8B5CF6',
    borderRadius: 4,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  shipNose: {
    position: 'absolute',
    top: -6,
    width: 6,
    height: 8,
    backgroundColor: '#C4B5FD',
    borderRadius: 2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 5, 20, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  overlayTitle: {
    color: '#A78BFA',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 10,
  },
  overlayScore: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
  },
  pressOkBadge: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  pressOkText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  overlayHint: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 440,
    lineHeight: 18,
  },
});
