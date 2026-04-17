import type { LeaderboardEntry } from '../utils/scoreboard'

interface ScoreboardProps {
  entries: LeaderboardEntry[]
  isLoading: boolean
  error: string | null
}

export const Scoreboard = ({ entries, isLoading, error }: ScoreboardProps) => (
  <section className="scoreboard-panel">
    <h2>Leaderboard</h2>
    {isLoading ? <p className="status-text">Loading scores...</p> : null}
    {error ? <p className="error-text">{error}</p> : null}
    {!isLoading && !error && entries.length === 0 ? (
      <p className="status-text">No scores yet.</p>
    ) : null}
    {entries.length > 0 ? (
      <ol>
        {entries.map((entry) => (
          <li key={`${entry.playerName}-${entry.bestScore}-${entry.updatedAt}`}>
            <span>{entry.playerName}</span>
            <strong>{entry.bestScore}</strong>
          </li>
        ))}
      </ol>
    ) : null}
  </section>
)
