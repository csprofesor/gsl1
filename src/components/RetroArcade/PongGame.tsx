import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const COURT_W = 680;
const COURT_H = 420;
const PADDLE_W = 14;
const PADDLE_H = 80;
const BALL_SIZE = 14;
const WINNING_SCORE = 7;

interface PongGameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  remoteEvent?: { eventType: string; key?: string } | null;
}

export const PongGame: React.FC<PongGameProps> = ({ onScoreUpdate, onGameOver, remoteEvent }) => {
  const [playerY, setPlayerY] = useState((COURT_H - PADDLE_H) / 2);
  const [aiY, setAiY] = useState((COURT_H - PADDLE_H) / 2);
  const [ball, setBall] = useState({ x: COURT_W / 2, y: COURT_H / 2 });
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [winner, setWinner] = useState<'PLAYER' | 'AI' | null>(null);

  const ballVelRef = useRef({ vx: 6, vy: 3 });
  const ballPosRef = useRef({ x: COURT_W / 2, y: COURT_H / 2 });
  const playerYRef = useRef((COURT_H - PADDLE_H) / 2);
  const aiYRef = useRef((COURT_H - PADDLE_H) / 2);

  const resetBall = useCallback((directionToPlayer = false) => {
    ballPosRef.current = { x: COURT_W / 2, y: COURT_H / 2 };
    setBall({ x: COURT_W / 2, y: COURT_H / 2 });
    const angle = (Math.random() * 0.8 - 0.4);
    const speed = 6;
    ballVelRef.current = {
      vx: directionToPlayer ? -speed : speed,
      vy: speed * angle,
    };
  }, []);

  const startGame = useCallback(() => {
    setPlayerScore(0);
    setAiScore(0);
    setWinner(null);
    setIsPlaying(true);
    resetBall(false);
    onScoreUpdate?.(0);
  }, [resetBall, onScoreUpdate]);

  // Kumanda Tuşları
  useEffect(() => {
    if (!remoteEvent) return;
    const type = (remoteEvent.eventType || '').toLowerCase();

    if (type === 'select' || type === 'playpause') {
      if (!isPlaying || winner) {
        startGame();
      }
      return;
    }

    if (!isPlaying || winner) return;

    const step = 34;
    if (type === 'up') {
      const nextY = Math.max(0, playerYRef.current - step);
      playerYRef.current = nextY;
      setPlayerY(nextY);
    } else if (type === 'down') {
      const nextY = Math.min(COURT_H - PADDLE_H, playerYRef.current + step);
      playerYRef.current = nextY;
      setPlayerY(nextY);
    }
  }, [remoteEvent, isPlaying, winner, startGame]);

  // Oyun Döngüsü (Fizik & AI)
  useEffect(() => {
    if (!isPlaying || winner) return;

    const timer = setInterval(() => {
      // 1. Top Hareketi
      let { x, y } = ballPosRef.current;
      let { vx, vy } = ballVelRef.current;

      x += vx;
      y += vy;

      // Üst ve Alt Duvar Çarpması
      if (y <= 0) {
        y = 0;
        vy = -vy;
      } else if (y >= COURT_H - BALL_SIZE) {
        y = COURT_H - BALL_SIZE;
        vy = -vy;
      }

      // 2. AI Raketi Hareketi (Akıllı Takip)
      const aiCenter = aiYRef.current + PADDLE_H / 2;
      const targetY = y;
      const aiSpeed = 4.2;
      if (aiCenter < targetY - 10) {
        aiYRef.current = Math.min(COURT_H - PADDLE_H, aiYRef.current + aiSpeed);
      } else if (aiCenter > targetY + 10) {
        aiYRef.current = Math.max(0, aiYRef.current - aiSpeed);
      }
      setAiY(aiYRef.current);

      // 3. Oyuncu Raketi Çarpışması (Sol taraf)
      const paddleLeft = 20;
      const paddleRight = paddleLeft + PADDLE_W;
      if (
        x <= paddleRight &&
        x + BALL_SIZE >= paddleLeft &&
        y + BALL_SIZE >= playerYRef.current &&
        y <= playerYRef.current + PADDLE_H
      ) {
        x = paddleRight;
        // Çarpma noktasına göre açı ver
        const hitOffset = (y + BALL_SIZE / 2 - (playerYRef.current + PADDLE_H / 2)) / (PADDLE_H / 2);
        const speed = Math.min(11, Math.sqrt(vx * vx + vy * vy) + 0.3);
        vx = Math.abs(speed * Math.cos(hitOffset * 0.7));
        vy = speed * Math.sin(hitOffset * 0.7);
      }

      // 4. AI Raketi Çarpışması (Sağ taraf)
      const aiPaddleLeft = COURT_W - 20 - PADDLE_W;
      const aiPaddleRight = aiPaddleLeft + PADDLE_W;
      if (
        x + BALL_SIZE >= aiPaddleLeft &&
        x <= aiPaddleRight &&
        y + BALL_SIZE >= aiYRef.current &&
        y <= aiYRef.current + PADDLE_H
      ) {
        x = aiPaddleLeft - BALL_SIZE;
        const hitOffset = (y + BALL_SIZE / 2 - (aiYRef.current + PADDLE_H / 2)) / (PADDLE_H / 2);
        const speed = Math.min(11, Math.sqrt(vx * vx + vy * vy) + 0.3);
        vx = -Math.abs(speed * Math.cos(hitOffset * 0.7));
        vy = speed * Math.sin(hitOffset * 0.7);
      }

      // 5. Gol Kontrolü
      if (x < 0) {
        // AI Sayı Aldı
        const nextAiScore = aiScore + 1;
        setAiScore(nextAiScore);
        if (nextAiScore >= WINNING_SCORE) {
          setWinner('AI');
          setIsPlaying(false);
          onGameOver?.(playerScore * 100);
        } else {
          resetBall(false);
        }
        return;
      } else if (x > COURT_W) {
        // Oyuncu Sayı Aldı
        const nextPlayerScore = playerScore + 1;
        setPlayerScore(nextPlayerScore);
        onScoreUpdate?.(nextPlayerScore * 100);
        if (nextPlayerScore >= WINNING_SCORE) {
          setWinner('PLAYER');
          setIsPlaying(false);
          onGameOver?.(nextPlayerScore * 100 + 500); // Kazanma bonusu
        } else {
          resetBall(true);
        }
        return;
      }

      ballPosRef.current = { x, y };
      ballVelRef.current = { vx, vy };
      setBall({ x, y });
    }, 16);

    return () => clearInterval(timer);
  }, [isPlaying, winner, playerScore, aiScore, resetBall, onScoreUpdate]);

  return (
    <View style={styles.container}>
      {/* Skor Tabelası */}
      <View style={styles.scoreboard}>
        <View style={styles.playerScoreBox}>
          <Text style={styles.scoreName}>SİZ (KUMANDA)</Text>
          <Text style={styles.scoreNum}>{playerScore}</Text>
        </View>
        <Text style={styles.scoreDivider}>:</Text>
        <View style={styles.playerScoreBox}>
          <Text style={[styles.scoreName, { color: '#F87171' }]}>TV YAPAY ZEKA</Text>
          <Text style={[styles.scoreNum, { color: '#F87171' }]}>{aiScore}</Text>
        </View>
      </View>

      {/* Tenis Sahası */}
      <View style={styles.court}>
        {/* Orta Kesikli Çizgi */}
        <View style={styles.centerNet} />

        {/* Oyuncu Raketi */}
        <View style={[styles.paddle, styles.playerPaddle, { top: playerY }]} />

        {/* TV AI Raketi */}
        <View style={[styles.paddle, styles.aiPaddle, { top: aiY }]} />

        {/* Top */}
        <View style={[styles.ball, { left: ball.x, top: ball.y }]} />

        {/* Başlangıç / Kazanan Katmanı */}
        {(!isPlaying || winner) && (
          <View style={styles.overlay}>
            <Text style={styles.overlayTitle}>
              {winner === 'PLAYER'
                ? 'TEBRİKLER! KAZANDINIZ!'
                : winner === 'AI'
                ? 'TV YAPAY ZEKA KAZANDI'
                : 'RETRO PONG TV'}
            </Text>
            <View style={styles.pressOkBadge}>
              <Text style={styles.pressOkText}>[OK] TUŞUNA BASIN</Text>
            </View>
            <Text style={styles.overlayHint}>
              Kumandanızın [YUKARI] ve [AŞAĞI] tuşlarıyla raketinizi kontrol edin. İlk {WINNING_SCORE} sayıya ulaşan kazanır!
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
  scoreboard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginBottom: 10,
  },
  playerScoreBox: {
    alignItems: 'center',
  },
  scoreName: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scoreNum: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  scoreDivider: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 28,
    fontWeight: '900',
  },
  court: {
    width: COURT_W,
    height: COURT_H,
    backgroundColor: '#0F172A',
    borderColor: '#38BDF8',
    borderWidth: 3,
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  centerNet: {
    position: 'absolute',
    left: COURT_W / 2 - 1,
    top: 0,
    bottom: 0,
    width: 2,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  paddle: {
    position: 'absolute',
    width: PADDLE_W,
    height: PADDLE_H,
    borderRadius: 4,
  },
  playerPaddle: {
    left: 20,
    backgroundColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  aiPaddle: {
    right: 20,
    backgroundColor: '#F87171',
    shadowColor: '#F87171',
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  ball: {
    position: 'absolute',
    width: BALL_SIZE,
    height: BALL_SIZE,
    backgroundColor: '#FACC15',
    borderRadius: 2,
    shadowColor: '#FACC15',
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.90)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  overlayTitle: {
    color: '#38BDF8',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 12,
  },
  pressOkBadge: {
    backgroundColor: '#38BDF8',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  pressOkText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  overlayHint: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 420,
    lineHeight: 18,
  },
});
