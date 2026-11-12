import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const GRID_COLS = 26;
const GRID_ROWS = 16;
const CELL_SIZE = 26;
const BOARD_W = GRID_COLS * CELL_SIZE;
const BOARD_H = GRID_ROWS * CELL_SIZE;

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface SnakeGameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  remoteEvent?: { eventType: string; key?: string } | null;
}

export const SnakeGame: React.FC<SnakeGameProps> = ({ onScoreUpdate, onGameOver, remoteEvent }) => {
  const [snake, setSnake] = useState<Point[]>([
    { x: 8, y: 8 },
    { x: 7, y: 8 },
    { x: 6, y: 8 },
  ]);
  const [food, setFood] = useState<Point>({ x: 18, y: 8 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(130);

  const directionRef = useRef<Direction>('RIGHT');
  const nextDirectionRef = useRef<Direction>('RIGHT');

  const generateFood = useCallback((currentSnake: Point[]): Point => {
    let newFood: Point;
    let collision = true;
    while (collision) {
      newFood = {
        x: Math.floor(Math.random() * (GRID_COLS - 2)) + 1,
        y: Math.floor(Math.random() * (GRID_ROWS - 2)) + 1,
      };
      collision = currentSnake.some((p) => p.x === newFood.x && p.y === newFood.y);
    }
    return newFood!;
  }, []);

  const startGame = useCallback(() => {
    const initialSnake: Point[] = [
      { x: 8, y: 8 },
      { x: 7, y: 8 },
      { x: 6, y: 8 },
    ];
    setSnake(initialSnake);
    setFood(generateFood(initialSnake));
    directionRef.current = 'RIGHT';
    nextDirectionRef.current = 'RIGHT';
    setScore(0);
    setGameOver(false);
    setIsPlaying(true);
    setSpeed(130);
    onScoreUpdate?.(0);
  }, [generateFood, onScoreUpdate]);

  // Kumanda Olaylarını İşleme
  useEffect(() => {
    if (!remoteEvent) return;
    const type = (remoteEvent.eventType || '').toLowerCase();

    if (type === 'select' || type === 'playpause') {
      if (!isPlaying || gameOver) {
        startGame();
      }
      return;
    }

    if (!isPlaying || gameOver) return;

    if (type === 'up' && directionRef.current !== 'DOWN') {
      nextDirectionRef.current = 'UP';
    } else if (type === 'down' && directionRef.current !== 'UP') {
      nextDirectionRef.current = 'DOWN';
    } else if (type === 'left' && directionRef.current !== 'RIGHT') {
      nextDirectionRef.current = 'LEFT';
    } else if (type === 'right' && directionRef.current !== 'LEFT') {
      nextDirectionRef.current = 'RIGHT';
    }
  }, [remoteEvent, isPlaying, gameOver, startGame]);

  // Oyun Döngüsü
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const timer = setInterval(() => {
      setSnake((prevSnake) => {
        directionRef.current = nextDirectionRef.current;
        const head = prevSnake[0];
        let newHead: Point;

        switch (directionRef.current) {
          case 'UP':
            newHead = { x: head.x, y: head.y - 1 };
            break;
          case 'DOWN':
            newHead = { x: head.x, y: head.y + 1 };
            break;
          case 'LEFT':
            newHead = { x: head.x - 1, y: head.y };
            break;
          case 'RIGHT':
            newHead = { x: head.x + 1, y: head.y };
            break;
        }

        // Duvar çarpışma kontrolü
        if (
          newHead.x < 0 ||
          newHead.x >= GRID_COLS ||
          newHead.y < 0 ||
          newHead.y >= GRID_ROWS
        ) {
          setGameOver(true);
          setIsPlaying(false);
          onGameOver?.(score);
          return prevSnake;
        }

        // Kendi gövdesine çarpma kontrolü
        if (prevSnake.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
          setGameOver(true);
          setIsPlaying(false);
          onGameOver?.(score);
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Yem yeme kontrolü
        if (newHead.x === food.x && newHead.y === food.y) {
          setScore((s) => {
            const nextScore = s + 10;
            if (nextScore > highScore) setHighScore(nextScore);
            onScoreUpdate?.(nextScore);
            return nextScore;
          });
          setFood(generateFood(newSnake));
          setSpeed((sp) => Math.max(70, sp - 3));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, speed);

    return () => clearInterval(timer);
  }, [isPlaying, gameOver, food, speed, generateFood, highScore, onScoreUpdate]);

  return (
    <View style={styles.container}>
      {/* Oyun Alanı (CRT Yeşil Monitör Çerçevesi) */}
      <View style={styles.board}>
        {/* Yem */}
        <View
          style={[
            styles.food,
            {
              left: food.x * CELL_SIZE,
              top: food.y * CELL_SIZE,
            },
          ]}
        />

        {/* Yılan Segmentleri */}
        {snake.map((segment, index) => {
          const isHead = index === 0;
          return (
            <View
              key={`${segment.x}-${segment.y}-${index}`}
              style={[
                styles.segment,
                isHead ? styles.snakeHead : styles.snakeBody,
                {
                  left: segment.x * CELL_SIZE,
                  top: segment.y * CELL_SIZE,
                },
              ]}
            />
          );
        })}

        {/* Başlangıç / Game Over Katmanı */}
        {(!isPlaying || gameOver) && (
          <View style={styles.overlay}>
            <Text style={styles.overlayTitle}>
              {gameOver ? 'OYUN BİTTİ' : 'RETRO SNAKE 97'}
            </Text>
            {gameOver && <Text style={styles.overlayScore}>Toplam Skor: {score}</Text>}
            <View style={styles.pressOkBadge}>
              <Text style={styles.pressOkText}>[OK] TUŞUNA BASIN</Text>
            </View>
            <Text style={styles.overlayHint}>
              Kumanda yön tuşlarıyla yılanı yönetin, yemleri toplayın.
            </Text>
          </View>
        )}
      </View>

      {/* Canlı Skor & Bilgi Paneli */}
      <View style={styles.scoreRow}>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>SKOR</Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>EN YÜKSEK</Text>
          <Text style={[styles.scoreValue, { color: '#FBBF24' }]}>{highScore}</Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>UZUNLUK</Text>
          <Text style={styles.scoreValue}>{snake.length}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  board: {
    width: BOARD_W,
    height: BOARD_H,
    backgroundColor: '#051A10',
    borderColor: '#10B981',
    borderWidth: 3,
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  food: {
    position: 'absolute',
    width: CELL_SIZE - 4,
    height: CELL_SIZE - 4,
    backgroundColor: '#EF4444',
    borderRadius: CELL_SIZE / 2,
    margin: 2,
    shadowColor: '#EF4444',
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  segment: {
    position: 'absolute',
    width: CELL_SIZE - 2,
    height: CELL_SIZE - 2,
    margin: 1,
    borderRadius: 4,
  },
  snakeHead: {
    backgroundColor: '#34D399',
    borderColor: '#FFFFFF',
    borderWidth: 1.5,
  },
  snakeBody: {
    backgroundColor: '#10B981',
    opacity: 0.9,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 26, 16, 0.90)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlayTitle: {
    color: '#34D399',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  overlayScore: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16,
  },
  pressOkBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  pressOkText: {
    color: '#051A10',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  overlayHint: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 14,
  },
  scoreBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    minWidth: 90,
  },
  scoreLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scoreValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
});
