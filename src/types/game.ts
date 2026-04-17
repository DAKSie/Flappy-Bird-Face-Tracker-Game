export type DifficultyKey = 'easy' | 'normal' | 'hard'

export interface DifficultyValues {
  key: DifficultyKey
  label: string
  gravity: number
  jumpImpulse: number
  gapSize: number
  pipeSpeed: number
  pipeSpacing: number
  birdRadius: number
}

export interface BirdState {
  x: number
  y: number
  velocity: number
}

export interface PipeState {
  id: number
  x: number
  gapTop: number
  gapBottom: number
  passed: boolean
}

export type GameStatus = 'menu' | 'playing' | 'game-over'

export interface GameWorld {
  status: GameStatus
  score: number
  bird: BirdState
  pipes: PipeState[]
  pipeDistance: number
  nextPipeId: number
  pendingJump: boolean
  elapsed: number
}
