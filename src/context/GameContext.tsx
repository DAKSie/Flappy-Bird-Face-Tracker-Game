import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { getLeaderboard, savePlayerScore } from '../utils/scoreboard'
import type { LeaderboardEntry } from '../utils/scoreboard'

interface GameContextValue {
  playerName: string
  setPlayerName: (nextName: string) => void
  leaderboard: LeaderboardEntry[]
  isLoadingLeaderboard: boolean
  leaderboardError: string | null
  refreshLeaderboard: () => Promise<void>
  saveScore: (score: number) => Promise<void>
}

interface GameProviderProps {
  children: ReactNode
}

const PLAYER_STORAGE_KEY = 'flappy-bird-player-name'

const GameContext = createContext<GameContextValue | undefined>(undefined)

export const GameProvider = ({ children }: GameProviderProps) => {
  const [playerName, setPlayerNameState] = useState('')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false)
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null)

  useEffect(() => {
    const storedPlayerName = window.localStorage.getItem(PLAYER_STORAGE_KEY)
    if (storedPlayerName) {
      setPlayerNameState(storedPlayerName)
    }
  }, [])

  const setPlayerName = useCallback((nextName: string): void => {
    setPlayerNameState(nextName)
    window.localStorage.setItem(PLAYER_STORAGE_KEY, nextName)
  }, [])

  const refreshLeaderboard = useCallback(async (): Promise<void> => {
    setIsLoadingLeaderboard(true)
    setLeaderboardError(null)

    try {
      const nextLeaderboard = await getLeaderboard(10)
      setLeaderboard(nextLeaderboard)
    } catch (unknownError) {
      const message =
        unknownError instanceof Error
          ? unknownError.message
          : 'Unable to fetch leaderboard data.'
      setLeaderboardError(message)
    } finally {
      setIsLoadingLeaderboard(false)
    }
  }, [])

  const saveScore = useCallback(
    async (score: number): Promise<void> => {
      if (!playerName.trim()) {
        return
      }
      await savePlayerScore(playerName, score)
      await refreshLeaderboard()
    },
    [playerName, refreshLeaderboard],
  )

  useEffect(() => {
    void refreshLeaderboard()
  }, [refreshLeaderboard])

  const value = useMemo<GameContextValue>(
    () => ({
      playerName,
      setPlayerName,
      leaderboard,
      isLoadingLeaderboard,
      leaderboardError,
      refreshLeaderboard,
      saveScore,
    }),
    [
      isLoadingLeaderboard,
      leaderboard,
      leaderboardError,
      playerName,
      refreshLeaderboard,
      saveScore,
      setPlayerName,
    ],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export const useGameContext = (): GameContextValue => {
  const contextValue = useContext(GameContext)
  if (!contextValue) {
    throw new Error('useGameContext must be used within GameProvider.')
  }
  return contextValue
}
