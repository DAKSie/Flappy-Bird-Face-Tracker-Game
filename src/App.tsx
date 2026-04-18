import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CameraPreview } from './components/CameraPreview'
import { GameCanvas } from './components/GameCanvas'
import { Menu } from './components/Menu'
import { Scoreboard } from './components/Scoreboard'
import {
  CENTROID_SMOOTHING_ALPHA,
  DEFAULT_DIFFICULTY,
  DIFFICULTY_PRESETS,
  JUMP_COOLDOWN_MS,
  ZONE_END_Y,
  ZONE_START_Y,
} from './config/game'
import { useGameContext } from './context/GameContext'
import { useCameraStream } from './hooks/useCameraStream'
import { useGameLoop } from './hooks/useGameLoop'
import { useVisionWorker } from './hooks/useVisionWorker'
import type { DifficultyKey, GameWorld } from './types/game'
import { createInitialWorld, createPlayingWorld, stepWorld } from './utils/physics'
import './styles/Game.css'

const statusLabelFromWorld = (world: GameWorld): string => {
  if (world.status === 'playing') {
    return 'Running'
  }
  if (world.status === 'game-over') {
    return 'Game Over'
  }
  return 'Menu'
}

function App() {
  const {
    playerName,
    setPlayerName,
    leaderboard,
    isLoadingLeaderboard,
    leaderboardError,
    saveScore,
  } = useGameContext()

  const [difficultyKey, setDifficultyKey] =
    useState<DifficultyKey>(DEFAULT_DIFFICULTY)
  const difficulty = DIFFICULTY_PRESETS[difficultyKey]

  const {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    stream,
    isLoading: isCameraLoading,
    error: cameraError,
    isActive: hasCameraStream,
    startCamera,
    stopCamera,
  } = useCameraStream()

  const [world, setWorld] = useState<GameWorld>(() => createInitialWorld(difficulty))

  const worldRef = useRef(world)
  const queuedJumpRef = useRef(false)
  const lastJumpTimeRef = useRef<number>(-Infinity)
  const scoreSavedRef = useRef(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    worldRef.current = world
  }, [world])

  useEffect(() => {
    if (worldRef.current.status !== 'menu') {
      return
    }
    const resetWorld = createInitialWorld(difficulty)
    worldRef.current = resetWorld
    setWorld(resetWorld)
  }, [difficulty])

  const queueJump = useCallback((): void => {
    if (worldRef.current.status === 'playing') {
      const now = performance.now()
      if (now - lastJumpTimeRef.current < JUMP_COOLDOWN_MS) {
        return
      }
      lastJumpTimeRef.current = now
      queuedJumpRef.current = true
    }
  }, [])

  const vision = useVisionWorker({
    videoRef,
    enabled: hasCameraStream,
    zoneStartY: ZONE_START_Y,
    zoneEndY: ZONE_END_Y,
    smoothingAlpha: CENTROID_SMOOTHING_ALPHA,
    onJump: queueJump,
  })

  const updateWorld = useCallback(
    (dt: number): void => {
      const current = worldRef.current
      if (current.status !== 'playing') {
        return
      }

      const nextWorld = stepWorld(current, difficulty, dt, queuedJumpRef.current)
      queuedJumpRef.current = false
      worldRef.current = nextWorld
      setWorld(nextWorld)
    },
    [difficulty],
  )

  useGameLoop(world.status === 'playing', updateWorld)

  const startRound = useCallback((): void => {
    const playWorld = createPlayingWorld(difficulty)
    scoreSavedRef.current = false
    queuedJumpRef.current = true
    lastJumpTimeRef.current = performance.now()
    worldRef.current = playWorld
    setWorld(playWorld)
  }, [difficulty])

  const backToMenu = useCallback((): void => {
    const menuWorld = createInitialWorld(difficulty)
    scoreSavedRef.current = false
    queuedJumpRef.current = false
    lastJumpTimeRef.current = -Infinity
    worldRef.current = menuWorld
    setWorld(menuWorld)
  }, [difficulty])

  const toggleCamera = useCallback((): void => {
    if (hasCameraStream) {
      stopCamera()
      return
    }
    void startCamera()
  }, [hasCameraStream, startCamera, stopCamera])

  useEffect(() => {
    if (world.status !== 'game-over' || scoreSavedRef.current) {
      return
    }
    scoreSavedRef.current = true
    void saveScore(world.score)
  }, [saveScore, world.score, world.status])

  const difficultyOptions = useMemo(
    () =>
      (Object.keys(DIFFICULTY_PRESETS) as DifficultyKey[]).map((key) => ({
        key,
        label: DIFFICULTY_PRESETS[key].label,
      })),
    [],
  )

  return (
    <div className="app-shell">
      <header className="top-strip">
        <div className="branding">
          <h1>Flappy Face</h1>
          <p>Jump in real life and cross the trigger band to flap in game.</p>
        </div>
        <div className="top-meta">
          <span>Pilot {playerName.trim() || 'Unset'}</span>
          <span>Mode {statusLabelFromWorld(world)}</span>
          <span>Score {world.score}</span>
          <span>Vision {hasCameraStream ? vision.status : 'idle'}</span>
        </div>
      </header>

      <main className="main-grid">
        <div className="left-column">
          <Menu
            playerName={playerName}
            onPlayerNameChange={setPlayerName}
            difficulty={difficultyKey}
            difficulties={difficultyOptions}
            onDifficultyChange={setDifficultyKey}
            devices={devices}
            selectedDeviceId={selectedDeviceId}
            onSelectDevice={setSelectedDeviceId}
            isCameraLoading={isCameraLoading}
            cameraError={cameraError}
            hasCameraStream={hasCameraStream}
            onToggleCamera={toggleCamera}
            gameStatus={world.status}
            onStartRound={startRound}
            onBackToMenu={backToMenu}
            visionStatus={vision.status}
          />

          <CameraPreview
            videoRef={videoRef}
            stream={stream}
            smoothedCentroid={vision.smoothedCentroid}
            zoneStartY={ZONE_START_Y}
            zoneEndY={ZONE_END_Y}
            isInZone={vision.isInZone}
          />
        </div>

        <div className="center-column">
          <GameCanvas world={world} difficultyLabel={difficulty.label} />
          <section className="readout-panel">
            <span>Difficulty {difficulty.label}</span>
            <span>
              Jump Zone {ZONE_START_Y}-{ZONE_END_Y}px
            </span>
            <span>
              Centroid{' '}
              {vision.smoothedCentroid
                ? `${Math.round(vision.smoothedCentroid.x)}, ${Math.round(vision.smoothedCentroid.y)}`
                : 'Not detected'}
            </span>
          </section>
        </div>

        <aside className="right-column">
          <Scoreboard
            entries={leaderboard}
            isLoading={isLoadingLeaderboard}
            error={leaderboardError}
          />
        </aside>
      </main>
    </div>
  )
}

export default App
