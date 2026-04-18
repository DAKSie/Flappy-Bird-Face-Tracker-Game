import {
  BIRD_START_Y,
  BIRD_X,
  GAME_HEIGHT,
  GROUND_HEIGHT,
  PIPE_SPAWN_X,
  PIPE_WIDTH,
} from '../config/game'
import type { DifficultyValues, GameWorld, PipeState } from '../types/game'

const TOP_MARGIN = 72
const BOTTOM_MARGIN = 72

const createPipe = (
  id: number,
  difficulty: DifficultyValues,
  random: () => number,
): PipeState => {
  const maxGapCenter =
    GAME_HEIGHT - GROUND_HEIGHT - BOTTOM_MARGIN - difficulty.gapSize / 2
  const minGapCenter = TOP_MARGIN + difficulty.gapSize / 2
  const gapCenter = minGapCenter + (maxGapCenter - minGapCenter) * random()

  return {
    id,
    x: PIPE_SPAWN_X,
    gapTop: gapCenter - difficulty.gapSize / 2,
    gapBottom: gapCenter + difficulty.gapSize / 2,
    passed: false,
  }
}

const hasPipeCollision = (
  world: GameWorld,
  difficulty: DifficultyValues,
): boolean => {
  const birdLeft = world.bird.x - difficulty.birdRadius
  const birdRight = world.bird.x + difficulty.birdRadius
  const birdTop = world.bird.y - difficulty.birdRadius
  const birdBottom = world.bird.y + difficulty.birdRadius

  return world.pipes.some((pipe) => {
    const pipeLeft = pipe.x
    const pipeRight = pipe.x + PIPE_WIDTH
    const overlapsX = birdRight > pipeLeft && birdLeft < pipeRight
    if (!overlapsX) {
      return false
    }
    return birdTop < pipe.gapTop || birdBottom > pipe.gapBottom
  })
}

export const createInitialWorld = (difficulty: DifficultyValues): GameWorld => ({
  status: 'menu',
  score: 0,
  bird: {
    x: BIRD_X,
    y: BIRD_START_Y,
    velocity: 0,
  },
  pipes: [createPipe(0, difficulty, Math.random)],
  pipeDistance: 0,
  nextPipeId: 1,
  pendingJump: false,
  elapsed: 0,
})

export const createPlayingWorld = (difficulty: DifficultyValues): GameWorld => ({
  ...createInitialWorld(difficulty),
  status: 'playing',
})

export const stepWorld = (
  current: GameWorld,
  difficulty: DifficultyValues,
  dt: number,
  jumpQueued: boolean,
  random: () => number = Math.random,
): GameWorld => {
  if (current.status !== 'playing') {
    return current
  }

  let velocity = current.bird.velocity + difficulty.gravity * dt
  if (current.pendingJump || jumpQueued) {
    velocity = -difficulty.jumpImpulse
  }

  const birdY = current.bird.y + velocity * dt

  let pipes = current.pipes
    .map((pipe) => ({ ...pipe, x: pipe.x - difficulty.pipeSpeed * dt }))
    .filter((pipe) => pipe.x + PIPE_WIDTH > -32)

  let pipeDistance = current.pipeDistance + difficulty.pipeSpeed * dt
  let nextPipeId = current.nextPipeId

  if (pipeDistance >= difficulty.pipeSpacing) {
    pipeDistance -= difficulty.pipeSpacing
    pipes = [...pipes, createPipe(nextPipeId, difficulty, random)]
    nextPipeId += 1
  }

  let score = current.score
  pipes = pipes.map((pipe) => {
    if (!pipe.passed && pipe.x + PIPE_WIDTH < current.bird.x - difficulty.birdRadius) {
      score += difficulty.scoreMultiplier
      return { ...pipe, passed: true }
    }
    return pipe
  })

  const nextWorld: GameWorld = {
    ...current,
    score,
    bird: {
      ...current.bird,
      y: birdY,
      velocity,
    },
    pipes,
    pipeDistance,
    nextPipeId,
    pendingJump: false,
    elapsed: current.elapsed + dt,
  }

  const hitCeiling = birdY - difficulty.birdRadius <= 0
  const hitGround = birdY + difficulty.birdRadius >= GAME_HEIGHT - GROUND_HEIGHT

  if (hitCeiling || hitGround || hasPipeCollision(nextWorld, difficulty)) {
    return {
      ...nextWorld,
      status: 'game-over',
    }
  }

  return nextWorld
}
