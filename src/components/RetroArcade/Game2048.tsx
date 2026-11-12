import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const GRID_SIZE = 4;
const BOARD_SIZE = 380;
const TILE_GAP = 10;
const TILE_SIZE = (BOARD_SIZE - (GRID_SIZE + 1) * TILE_GAP) / GRID_SIZE;

const TILE_COLORS: Record<number, { bg: string; text: string }> = {
  2: { bg: '#EEE4DA', text: '#776E65' },
  4: { bg: '#EDE0C8', text: '#776E65' },
  8: { bg: '#F2B179', text: '#F9F6F2' },
  16: { bg: '#F59563', text: '#F9F6F2' },
  32: { bg: '#F67C5F', text: '#F9F6F2' },
  64: { bg: '#F65E3B', text: '#F9F6F2' },
  128: { bg: '#EDCF72', text: '#F9F6F2' },
  256: { bg: '#EDCC61', text: '#F9F6F2' },
  512: { bg: '#EDC850', text: '#F9F6F2' },
  1024: { bg: '#EDC53F', text: '#F9F6F2' },
  2048: { bg: '#EDC22E', text: '#F9F6F2' },
};

interface Game2048Props {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  remoteEvent?: { eventType: string; key?: string } | null;
}

export const Game2048: React.FC<Game2048Props> = ({ onScoreUpdate, onGameOver, remoteEvent }) => {
  const [board, setBoard] = useState<number[][]>([
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  const addRandomTile = useCallback((grid: number[][]): number[][] => {
    const emptyCells: { r: number; c: number }[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] === 0) emptyCells.push({ r, c });
      }
    }
    if (emptyCells.length === 0) return grid;

    const chosen = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const val = Math.random() < 0.9 ? 2 : 4;

    const newGrid = grid.map((row) => [...row]);
    newGrid[chosen.r][chosen.c] = val;
    return newGrid;
  }, []);

  const initGame = useCallback(() => {
    let grid = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    grid = addRandomTile(grid);
    grid = addRandomTile(grid);
    setBoard(grid);
    setScore(0);
    setGameOver(false);
    setWon(false);
    onScoreUpdate?.(0);
  }, [addRandomTile, onScoreUpdate]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const slideRow = (row: number[]): { newRow: number[]; scoreGained: number } => {
    const nonZero = row.filter((val) => val !== 0);
    const newRow: number[] = [];
    let scoreGained = 0;

    for (let i = 0; i < nonZero.length; i++) {
      if (i < nonZero.length - 1 && nonZero[i] === nonZero[i + 1]) {
        const merged = nonZero[i] * 2;
        newRow.push(merged);
        scoreGained += merged;
        i++;
      } else {
        newRow.push(nonZero[i]);
      }
    }

    while (newRow.length < GRID_SIZE) {
      newRow.push(0);
    }

    return { newRow, scoreGained };
  };

  const move = useCallback(
    (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
      if (gameOver) return;

      let changed = false;
      let totalGained = 0;
      let newGrid: number[][] = [];

      if (dir === 'LEFT' || dir === 'RIGHT') {
        newGrid = board.map((row) => {
          const targetRow = dir === 'RIGHT' ? [...row].reverse() : [...row];
          const { newRow, scoreGained } = slideRow(targetRow);
          const finalRow = dir === 'RIGHT' ? newRow.reverse() : newRow;

          for (let c = 0; c < GRID_SIZE; c++) {
            if (row[c] !== finalRow[c]) changed = true;
          }
          totalGained += scoreGained;
          return finalRow;
        });
      } else {
        // Kolon bazlı (UP / DOWN)
        newGrid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
        for (let c = 0; c < GRID_SIZE; c++) {
          const col = [board[0][c], board[1][c], board[2][c], board[3][c]];
          const targetCol = dir === 'DOWN' ? [...col].reverse() : [...col];
          const { newRow, scoreGained } = slideRow(targetCol);
          const finalCol = dir === 'DOWN' ? newRow.reverse() : newRow;

          for (let r = 0; r < GRID_SIZE; r++) {
            newGrid[r][c] = finalCol[r];
            if (board[r][c] !== finalCol[r]) changed = true;
          }
          totalGained += scoreGained;
        }
      }

      if (changed) {
        const withTile = addRandomTile(newGrid);
        setBoard(withTile);
        const nextScore = score + totalGained;
        setScore(nextScore);
        if (nextScore > highScore) setHighScore(nextScore);
        onScoreUpdate?.(nextScore);

        // 2048 ulaşıldı mı?
        if (withTile.some((r) => r.some((v) => v === 2048))) {
          setWon(true);
          onGameOver?.(nextScore + 2048);
        }

        // Oyun bitti mi kontrolü
        let hasMoves = false;
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            if (withTile[r][c] === 0) hasMoves = true;
            if (c < GRID_SIZE - 1 && withTile[r][c] === withTile[r][c + 1]) hasMoves = true;
            if (r < GRID_SIZE - 1 && withTile[r][c] === withTile[r + 1][c]) hasMoves = true;
          }
        }
        if (!hasMoves) {
          setGameOver(true);
          onGameOver?.(nextScore);
        }
      }
    },
    [board, gameOver, addRandomTile, score, highScore, onScoreUpdate]
  );

  // Kumanda Olayları
  useEffect(() => {
    if (!remoteEvent) return;
    const type = (remoteEvent.eventType || '').toLowerCase();

    if (type === 'select' || type === 'playpause') {
      if (gameOver || won) {
        initGame();
      }
      return;
    }

    if (type === 'up') move('UP');
    else if (type === 'down') move('DOWN');
    else if (type === 'left') move('LEFT');
    else if (type === 'right') move('RIGHT');
  }, [remoteEvent, move, gameOver, won, initGame]);

  return (
    <View style={styles.container}>
      {/* Skor Barı */}
      <View style={styles.scoreRow}>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>SKOR</Text>
          <Text style={styles.scoreVal}>{score}</Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>EN YÜKSEK</Text>
          <Text style={[styles.scoreVal, { color: '#F59E0B' }]}>{highScore}</Text>
        </View>
      </View>

      {/* 4x4 Izgara Tahtası */}
      <View style={styles.board}>
        {board.map((row, r) => (
          <View key={`r-${r}`} style={styles.row}>
            {row.map((val, c) => {
              const tileStyle = TILE_COLORS[val] || { bg: 'rgba(255, 255, 255, 0.08)', text: '#FFF' };
              return (
                <View
                  key={`c-${r}-${c}`}
                  style={[
                    styles.cell,
                    val > 0 && { backgroundColor: tileStyle.bg },
                  ]}
                >
                  {val > 0 && (
                    <Text
                      style={[
                        styles.cellText,
                        { color: tileStyle.text },
                        val >= 100 && val < 1000 ? { fontSize: 20 } : val >= 1000 ? { fontSize: 16 } : { fontSize: 26 },
                      ]}
                    >
                      {val}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        ))}

        {/* Game Over veya Kazanma Katmanı */}
        {(gameOver || won) && (
          <View style={styles.overlay}>
            <Text style={styles.overlayTitle}>{won ? 'TEBRİKLER! 2048!' : 'HAMLE KALMADI'}</Text>
            <Text style={styles.overlayScore}>Toplam Skor: {score}</Text>
            <View style={styles.pressOkBadge}>
              <Text style={styles.pressOkText}>[OK] YENİ OYUN</Text>
            </View>
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
  scoreRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  scoreBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    minWidth: 110,
  },
  scoreLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scoreVal: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    backgroundColor: '#1E1710',
    borderColor: '#F59E0B',
    borderWidth: 3,
    borderRadius: 12,
    padding: TILE_GAP,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cell: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellText: {
    fontWeight: '900',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 23, 16, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  overlayTitle: {
    color: '#F59E0B',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  overlayScore: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16,
  },
  pressOkBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  pressOkText: {
    color: '#1E1710',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
