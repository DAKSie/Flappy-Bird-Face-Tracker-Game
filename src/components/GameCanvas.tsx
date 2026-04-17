import { useEffect, useRef } from 'react'
import { GAME_HEIGHT, GAME_WIDTH, GROUND_HEIGHT, PIPE_WIDTH } from '../config/game'
import type { GameWorld } from '../types/game'

interface GameCanvasProps {
  world: GameWorld
  difficultyLabel: string
}

const drawScene = (
  context: CanvasRenderingContext2D,
  world: GameWorld,
  difficultyLabel: string,
): void => {
  context.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

  const sky = context.createLinearGradient(0, 0, 0, GAME_HEIGHT)
  sky.addColorStop(0, '#EED9B9')
  sky.addColorStop(0.6, '#E8BE83')
  sky.addColorStop(1, '#D53E0F')
  context.fillStyle = sky
  context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

  const stripeOffset = (world.elapsed * 90) % GAME_WIDTH
  context.fillStyle = 'rgba(94, 0, 6, 0.13)'
  for (let x = -GAME_WIDTH; x < GAME_WIDTH * 2; x += 110) {
    context.fillRect(x - stripeOffset, 0, 42, GAME_HEIGHT - GROUND_HEIGHT)
  }

  context.fillStyle = '#9B0F06'
  world.pipes.forEach((pipe) => {
    context.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.gapTop)
    context.fillRect(
      pipe.x,
      pipe.gapBottom,
      PIPE_WIDTH,
      GAME_HEIGHT - GROUND_HEIGHT - pipe.gapBottom,
    )

    context.fillStyle = '#5E0006'
    context.fillRect(pipe.x - 8, pipe.gapTop - 20, PIPE_WIDTH + 16, 20)
    context.fillRect(pipe.x - 8, pipe.gapBottom, PIPE_WIDTH + 16, 20)
    context.fillStyle = '#9B0F06'
  })

  context.fillStyle = '#5E0006'
  context.fillRect(0, GAME_HEIGHT - GROUND_HEIGHT, GAME_WIDTH, GROUND_HEIGHT)

  context.fillStyle = '#D53E0F'
  for (let x = 0; x < GAME_WIDTH; x += 36) {
    context.fillRect(x, GAME_HEIGHT - GROUND_HEIGHT + 18, 24, 10)
  }

  context.beginPath()
  context.fillStyle = '#EED9B9'
  context.arc(world.bird.x, world.bird.y, 18, 0, Math.PI * 2)
  context.fill()

  context.beginPath()
  context.fillStyle = '#9B0F06'
  context.arc(world.bird.x - 8, world.bird.y - 5, 5, 0, Math.PI * 2)
  context.fill()

  context.beginPath()
  context.fillStyle = '#D53E0F'
  context.ellipse(world.bird.x - 3, world.bird.y + 5, 10, 7, 0.25, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = '#5E0006'
  context.font = '600 28px "Bungee", sans-serif'
  context.textAlign = 'left'
  context.fillText(`Score ${world.score}`, 20, 44)

  context.textAlign = 'right'
  context.font = '600 16px "Space Grotesk", sans-serif'
  context.fillText(`Difficulty ${difficultyLabel}`, GAME_WIDTH - 20, 42)

  if (world.status === 'menu') {
    context.fillStyle = 'rgba(94, 0, 6, 0.62)'
    context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
    context.fillStyle = '#EED9B9'
    context.textAlign = 'center'
    context.font = '600 34px "Bungee", sans-serif'
    context.fillText('READY', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20)
    context.font = '600 18px "Space Grotesk", sans-serif'
    context.fillText('Start camera and launch a run.', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 22)
  }

  if (world.status === 'game-over') {
    context.fillStyle = 'rgba(94, 0, 6, 0.7)'
    context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
    context.fillStyle = '#EED9B9'
    context.textAlign = 'center'
    context.font = '600 34px "Bungee", sans-serif'
    context.fillText('GAME OVER', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20)
    context.font = '600 18px "Space Grotesk", sans-serif'
    context.fillText(
      `Final score ${world.score}`,
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 22,
    )
  }
}

export const GameCanvas = ({ world, difficultyLabel }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    drawScene(context, world, difficultyLabel)
  }, [difficultyLabel, world])

  return (
    <section className="game-panel">
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        aria-label="Flappy Bird gameplay"
      />
    </section>
  )
}
