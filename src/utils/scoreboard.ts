import { child, db, get, ref, set } from '../firebase/config'

export interface LeaderboardEntry {
  playerName: string
  bestScore: number
  updatedAt: number
}

const normalizePlayerName = (playerName: string): string =>
  playerName.trim().replace(/[.#$\[\]/]/g, '_').slice(0, 24)

export const savePlayerScore = async (
  playerName: string,
  score: number,
): Promise<void> => {
  const normalizedPlayerName = normalizePlayerName(playerName)
  if (!normalizedPlayerName) {
    return
  }

  const scoreRef = ref(db, `scores/${normalizedPlayerName}`)
  const snapshot = await get(scoreRef)
  const currentBest = snapshot.exists()
    ? Number((snapshot.val() as { bestScore?: number }).bestScore ?? 0)
    : 0

  if (score > currentBest) {
    await set(scoreRef, {
      playerName: normalizedPlayerName,
      bestScore: score,
      updatedAt: Date.now(),
    })
  }
}

export const getLeaderboard = async (limit = 10): Promise<LeaderboardEntry[]> => {
  const dbRef = ref(db)
  const snapshot = await get(child(dbRef, 'scores'))

  if (!snapshot.exists()) {
    return []
  }

  const rawScores = snapshot.val() as Record<string, Partial<LeaderboardEntry>>
  return Object.values(rawScores)
    .map(
      (entry): LeaderboardEntry => ({
        playerName: String(entry.playerName ?? 'Player'),
        bestScore: Number(entry.bestScore ?? 0),
        updatedAt: Number(entry.updatedAt ?? 0),
      }),
    )
    .filter((entry) => Number.isFinite(entry.bestScore))
    .sort(
      (a, b) =>
        b.bestScore - a.bestScore ||
        b.updatedAt - a.updatedAt ||
        a.playerName.localeCompare(b.playerName),
    )
    .slice(0, limit)
}
