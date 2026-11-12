import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const GAME_W = 680;
const GAME_H = 430;
const PADDLE_W = 90;
const PADDLE_H = 14;
const BALL_SIZE = 12;
const BRICK_ROWS = 4;
const BRICK_COLS = 8;
const BRICK_H = 18;
const BRICK_PAD = 6;
const BRICK_W = (GAME_W - (BRICK_COLS + 1) * BRICK_PAD) / BRICK_COLS;

const ROW_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6'];

type Brick = { id: number; x: number; y: number; alive: boolean; color: string; points: number };

interface BrickGameProps {
  onScoreUpdate?: (score: number) => void;
  remoteEvent?: { eventType: string; key?: string } | null;
}

export const BrickGame: React.FC<BrickGameProps> = ({ onScoreUpdate, remoteEvent }) => {
  const [paddleX, setPaddleX] = useState((GAME_W - PADDLE_W) / 2);
  const [ball, setBall] = useState({ x: GAME_W / 2, y: GAME_H - 50 });
  const [bricks, setBricks] = useState<Brick[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ballAttached, setBallAttached] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  const paddleXRef = useRef((GAME_W - PADDLE_W) / 2);
  const ballPosRef = useRef({ x: GAME_W / 2, y: GAME_H - 50 });
  const ballVelRef = useRef({ vx: 4, vy: -5 });
  const ballAttachedRef = useRef(true);

  const initBricks = useCallback(() => {
    const list: Brick[] = [];
    let id = 0;
    const startY = 40;
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        list.push({
          id: id++,
          x: BRICK_PAD + c * (BRICK_W + BRICK_PAD),
          y: startY + r * (BRICK_H + BRICK_PAD),
          alive: true,
          color: ROW_COLORS[r],
          points: (BRICK_ROWS - r) * 20,
        });
      }
    }
    setBricks(list);
  }, []);

  const resetBallOnPaddle = useCallback(() => {
    ballAttachedRef.current = true;
    setBallAttached(true);
    const initialBall = {
      x: paddleXRef.current + PADDLE_W / 2 - BALL_SIZE / 2,
      y: GAME_H - 34 - BALL_SIZE,
    };
    ballPosRef.current = initialBall;
    setBall(initialBall);
    ballVelRef.current = { vx: 4, vy: -5 };
  }, []);

  const startGame = useCallback(() => {
    paddleXRef.current = (GAME_W - PADDLE_W) / 2;
    setPaddleX(paddleXRef.current);
    setScore(0);
    setLives(3);
    setGameOver(false);
    setGameWon(false);
    setIsPlaying(true);
    initBricks();
    resetBallOnPaddle();
    onScoreUpdate?.(0);
  }, [initBricks, resetBallOnPaddle, onScoreUpdate]);

  // Kumanda Tuşları
  useEffect(() => {
    if (!remoteEvent) return;
    const type = (remoteEvent.eventType || '').toLowerCase();

    if (type === 'select' || type === 'playpause') {
      if (!isPlaying || gameOver || gameWon) {
        startGame();
        return;
      }
      if (ballAttachedRef.current) {
        ballAttachedRef.current = false;
        setBallAttached(false);
      }
      return;
    }

    if (!isPlaying || gameOver || gameWon) return;

    const step = 32;
    if (type === 'left') {
      const nextX = Math.max(12, paddleXRef.current - step);
      paddleXRef.current = nextX;
      setPaddleX(nextX);
      if (ballAttachedRef.current) {
        const nb = { x: nextX + PADDLE_W / 2 - BALL_SIZE / 2, y: GAME_H - 34 - BALL_SIZE };
        ballPosRef.current = nb;
        setBall(nb);
      }
    } else if (type === 'right') {
      const nextX = Math.min(GAME_W - PADDLE_W - 12, paddleXRef.current + step);
      paddleXRef.current = nextX;
      setPaddleX(nextX);
      if (ballAttachedRef.current) {
        const nb = { x: nextX + PADDLE_W / 2 - BALL_SIZE / 2, y: GAME_H - 34 - BALL_SIZE };
        ballPosRef.current = nb;
        setBall(nb);
      }
    }
  }, [remoteEvent, isPlaying, gameOver, gameWon, startGame]);

  // Fizik Döngüsü
  useEffect(() => {
    if (!isPlaying || gameOver || gameWon) return;

    const timer = setInterval(() => {
      if (ballAttachedRef.current) return;

      let { x, y } = ballPosRef.current;
      let { vx, vy } = ballVelRef.current;

      x += vx;
      y += vy;

      // Duvar Çarpışmaları (Sol, Sağ, Tavan)
      if (x <= 6) {
        x = 6;
        vx = Math.abs(vx);
      } else if (x >= GAME_W - BALL_SIZE - 6) {
        x = GAME_W - BALL_SIZE - 6;
        vx = -Math.abs(vx);
      }
      if (y <= 6) {
        y = 6;
        vy = Math.abs(vy);
      }

      // Palet Çarpışması
      const paddleY = GAME_H - 34;
      if (
        y + BALL_SIZE >= paddleY &&
        y <= paddleY + PADDLE_H &&
        x + BALL_SIZE >= paddleXRef.current &&
        x <= paddleXRef.current + PADDLE_W &&
        vy > 0
      ) {
        y = paddleY - BALL_SIZE;
        // Paletin neresine çarptıysa ona göre açı ver
        const offset = (x + BALL_SIZE / 2 - (paddleXRef.current + PADDLE_W / 2)) / (PADDLE_W / 2);
        const speed = 7;
        vx = speed * offset * 0.9;
        vy = -Math.abs(speed * Math.cos(offset * 0.6));
      }

      // Tuğla Çarpışmaları
      setBricks((prevBricks) => {
        let earnedPoints = 0;
        let bounced = false;

        const updated = prevBricks.map((brick) => {
          if (!brick.alive || bounced) return brick;

          if (
            x + BALL_SIZE >= brick.x &&
            x <= brick.x + BRICK_W &&
            y + BALL_SIZE >= brick.y &&
            y <= brick.y + BRICK_H
          ) {
            bounced = true;
            vy = -vy;
            earnedPoints += brick.points;
            return { ...brick, alive: false };
          }
          return brick;
        });

        if (earnedPoints > 0) {
          setScore((s) => {
            const nextScore = s + earnedPoints;
            onScoreUpdate?.(nextScore);
            return nextScore;
          });
        }

        // Bütün tuğlalar bitti mi?
        if (updated.length > 0 && updated.every((b) => !b.alive)) {
          setGameWon(true);
          setIsPlaying(false);
        }

        return updated;
      });

      // Top düştü mü?
      if (y > GAME_H) {
        setLives((l) => {
          const nextL = l - 1;
          if (nextL <= 0) {
            setGameOver(true);
            setIsPlaying(false);
          } else {
            resetBallOnPaddle();
          }
          return nextL;
        });
        return;
      }

      ballPosRef.current = { x, y };
      ballVelRef.current = { vx, vy };
      setBall({ x, y });
    }, 16);

    return () => clearInterval(timer);
  }, [isPlaying, gameOver, gameWon, resetBallOnPaddle, onScoreUpdate]);

  return (
    <View style={styles.container}>
      {/* Üst Bilgi */}
      <View style={styles.infoRow}>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>SKOR</Text>
          <Text style={styles.infoVal}>{score}</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>TOPLAR</Text>
          <Text style={[styles.infoVal, { color: '#EF4444' }]}>{'● '.repeat(lives)}</Text>
        </View>
      </View>

      {/* Oyun Sahası */}
      <View style={styles.field}>
        {/* Tuğlalar */}
        {bricks.map(
          (b) =>
            b.alive && (
              <View
                key={b.id}
                style={[
                  styles.brick,
                  {
                    left: b.x,
                    top: b.y,
                    backgroundColor: b.color,
                  },
                ]}
              />
            )
        )}

        {/* Palet */}
        <View style={[styles.paddle, { left: paddleX }]} />

        {/* Top */}
        <View style={[styles.ball, { left: ball.x, top: ball.y }]} />

        {/* Overlay */}
        {(!isPlaying || gameOver || gameWon) && (
          <View style={styles.overlay}>
            <Text style={styles.overlayTitle}>
              {gameWon ? 'TEBRİKLER! TÜM TUĞLALAR KIRILDI!' : gameOver ? 'OYUN BİTTİ' : 'BRICK BREAKER TV'}
            </Text>
            {gameOver && <Text style={styles.overlayScore}>Toplam Skor: {score}</Text>}
            <View style={styles.pressOkBadge}>
              <Text style={styles.pressOkText}>[OK] TUŞUNA BASIN</Text>
            </View>
            <Text style={styles.overlayHint}>
              Kumanda [SOL] ve [SAĞ] tuşlarıyla paleti kontrol edin. Topu fırlatmak için [OK] tuşuna basın.
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: GAME_W,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  infoBox: {
    alignItems: 'center',
  },
  infoLabel: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  infoVal: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  field: {
    width: GAME_W,
    height: GAME_H,
    backgroundColor: '#1C0A0A',
    borderColor: '#EF4444',
    borderWidth: 3,
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#EF4444',
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  brick: {
    position: 'absolute',
    width: BRICK_W,
    height: BRICK_H,
    borderRadius: 3,
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  paddle: {
    position: 'absolute',
    bottom: 24,
    width: PADDLE_W,
    height: PADDLE_H,
    backgroundColor: '#F87171',
    borderRadius: 6,
    shadowColor: '#F87171',
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  ball: {
    position: 'absolute',
    width: BALL_SIZE,
    height: BALL_SIZE,
    backgroundColor: '#FFFFFF',
    borderRadius: BALL_SIZE / 2,
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 10, 10, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  overlayTitle: {
    color: '#F87171',
    fontSize: 26,
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
    backgroundColor: '#EF4444',
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
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 440,
    lineHeight: 18,
  },
});
