import type { DifficultyKey, GameStatus } from '../types/game'
import type { VisionStatus } from '../types/vision'

interface DifficultyOption {
  key: DifficultyKey
  label: string
}

interface MenuProps {
  playerName: string
  onPlayerNameChange: (nextName: string) => void
  difficulty: DifficultyKey
  difficulties: DifficultyOption[]
  onDifficultyChange: (difficulty: DifficultyKey) => void
  devices: MediaDeviceInfo[]
  selectedDeviceId: string
  onSelectDevice: (deviceId: string) => void
  isCameraLoading: boolean
  cameraError: string | null
  hasCameraStream: boolean
  onToggleCamera: () => void
  gameStatus: GameStatus
  onStartRound: () => void
  onBackToMenu: () => void
  visionStatus: VisionStatus
}

const visionLabels: Record<VisionStatus, string> = {
  idle: 'Idle',
  loading: 'Loading',
  ready: 'Tracking',
  error: 'Error',
}

export const Menu = ({
  playerName,
  onPlayerNameChange,
  difficulty,
  difficulties,
  onDifficultyChange,
  devices,
  selectedDeviceId,
  onSelectDevice,
  isCameraLoading,
  cameraError,
  hasCameraStream,
  onToggleCamera,
  gameStatus,
  onStartRound,
  onBackToMenu,
  visionStatus,
}: MenuProps) => {
  const canStartRound =
    hasCameraStream &&
    visionStatus === 'ready' &&
    playerName.trim().length > 0 &&
    !isCameraLoading

  const startLabel = gameStatus === 'game-over' ? 'Play Again' : 'Start Run'

  return (
    <section className="control-panel">
      <h2>Flight Setup</h2>

      <label className="field-group" htmlFor="player-name">
        <span>Player Name</span>
        <input
          id="player-name"
          type="text"
          value={playerName}
          onChange={(event) => onPlayerNameChange(event.target.value)}
          maxLength={24}
          placeholder="Type your pilot name"
        />
      </label>

      <label className="field-group" htmlFor="difficulty-select">
        <span>Difficulty</span>
        <select
          id="difficulty-select"
          value={difficulty}
          onChange={(event) => onDifficultyChange(event.target.value as DifficultyKey)}
          disabled={gameStatus === 'playing'}
        >
          {difficulties.map((entry) => (
            <option key={entry.key} value={entry.key}>
              {entry.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field-group" htmlFor="camera-select">
        <span>Camera Device</span>
        <select
          id="camera-select"
          value={selectedDeviceId}
          onChange={(event) => onSelectDevice(event.target.value)}
          disabled={isCameraLoading || hasCameraStream || devices.length === 0}
        >
          {devices.length === 0 ? (
            <option value="">No camera detected</option>
          ) : (
            devices.map((device, index) => (
              <option key={device.deviceId || String(index)} value={device.deviceId}>
                {device.label || `Camera ${index + 1}`}
              </option>
            ))
          )}
        </select>
      </label>

      <div className="status-grid">
        <div>
          <span className="status-label">Camera</span>
          <strong>{hasCameraStream ? 'Active' : 'Inactive'}</strong>
        </div>
        <div>
          <span className="status-label">Vision</span>
          <strong>{visionLabels[visionStatus]}</strong>
        </div>
      </div>

      {cameraError ? <p className="error-text">{cameraError}</p> : null}

      <div className="button-row">
        <button
          type="button"
          className="button-primary"
          onClick={onToggleCamera}
          disabled={isCameraLoading}
        >
          {hasCameraStream ? 'Stop Camera' : isCameraLoading ? 'Starting...' : 'Start Camera'}
        </button>
        <button
          type="button"
          className="button-secondary"
          onClick={onStartRound}
          disabled={!canStartRound}
        >
          {startLabel}
        </button>
      </div>

      <button
        type="button"
        className="button-ghost"
        onClick={onBackToMenu}
        disabled={gameStatus === 'menu'}
      >
        Back To Menu
      </button>
    </section>
  )
}
