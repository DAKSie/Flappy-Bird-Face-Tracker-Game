import { useEffect, useRef } from 'react'

export const useGameLoop = (
  enabled: boolean,
  onFixedUpdate: (dt: number) => void,
  fixedDelta = 1 / 60,
): void => {
  const updateRef = useRef(onFixedUpdate)
  updateRef.current = onFixedUpdate

  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    let rafId = 0
    let last = performance.now()
    let accumulator = 0

    const frame = (now: number): void => {
      const frameDt = Math.min((now - last) / 1000, 0.1)
      last = now
      accumulator += frameDt

      while (accumulator >= fixedDelta) {
        updateRef.current(fixedDelta)
        accumulator -= fixedDelta
      }

      rafId = window.requestAnimationFrame(frame)
    }

    rafId = window.requestAnimationFrame(frame)

    return () => {
      window.cancelAnimationFrame(rafId)
    }
  }, [enabled, fixedDelta])
}
