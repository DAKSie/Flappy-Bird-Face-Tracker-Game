import type { DifficultyKey, DifficultyValues } from '../types/game'

export const GAME_WIDTH = 520
export const GAME_HEIGHT = 500
export const GROUND_HEIGHT = 80
export const BIRD_X = 130
export const BIRD_START_Y = 220
export const PIPE_WIDTH = 86
export const PIPE_SPAWN_X = GAME_WIDTH + 90
export const ZONE_START_Y = 120
export const ZONE_END_Y = 240
export const VISION_WIDTH = 640
export const VISION_HEIGHT = 480
export const CENTROID_SMOOTHING_ALPHA = 0.26
export const VISION_TARGET_FPS = 60
export const TRACKER_TARGET_FPS = 60
export const VISION_LOST_TIMEOUT_MS = 1000

export const DIFFICULTY_PRESETS: Record<DifficultyKey, DifficultyValues> = {
  easy: {
    key: 'easy',
    label: 'Easy',
    gravity: 940,
    jumpImpulse: 355,
    gapSize: 220,
    pipeSpeed: 185,
    pipeSpacing: 300,
    birdRadius: 17,
  },
  normal: {
    key: 'normal',
    label: 'Normal',
    gravity: 1050,
    jumpImpulse: 385,
    gapSize: 190,
    pipeSpeed: 210,
    pipeSpacing: 275,
    birdRadius: 17,
  },
  hard: {
    key: 'hard',
    label: 'Hard',
    gravity: 1180,
    jumpImpulse: 415,
    gapSize: 165,
    pipeSpeed: 242,
    pipeSpacing: 252,
    birdRadius: 16,
  },
}

export const DEFAULT_DIFFICULTY: DifficultyKey = 'normal'
