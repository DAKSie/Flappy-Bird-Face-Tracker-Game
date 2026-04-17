import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import {
  TRACKER_TARGET_FPS,
  VISION_HEIGHT,
  VISION_LOST_TIMEOUT_MS,
  VISION_TARGET_FPS,
  VISION_WIDTH,
} from '../config/game'
import type {
  Centroid,
  VisionStatus,
  VisionWorkerInMessage,
  VisionWorkerOutMessage,
} from '../types/vision'

interface UseVisionWorkerOptions {
  videoRef: RefObject<HTMLVideoElement | null>
  enabled: boolean
  zoneStartY: number
  zoneEndY: number
  smoothingAlpha: number
  onJump: () => void
}

interface UseVisionWorkerResult {
  status: VisionStatus
  error: string | null
  centroid: Centroid | null
  smoothedCentroid: Centroid | null
  isInZone: boolean
}

const blendCentroid = (
  previous: Centroid | null,
  current: Centroid,
  alpha: number,
): Centroid => {
  if (!previous) {
    return current
  }

  return {
    x: previous.x * (1 - alpha) + current.x * alpha,
    y: previous.y * (1 - alpha) + current.y * alpha,
  }
}

const isWithinZone = (y: number, startY: number, endY: number): boolean =>
  y >= startY && y <= endY

export const useVisionWorker = (
  options: UseVisionWorkerOptions,
): UseVisionWorkerResult => {
  const {
    videoRef,
    enabled,
    zoneStartY,
    zoneEndY,
    smoothingAlpha,
    onJump,
  } = options

  const [status, setStatus] = useState<VisionStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [centroid, setCentroid] = useState<Centroid | null>(null)
  const [smoothedCentroid, setSmoothedCentroid] = useState<Centroid | null>(null)
  const [isInZone, setIsInZone] = useState(false)

  const statusRef = useRef<VisionStatus>('idle')
  const smoothedRef = useRef<Centroid | null>(null)
  const wasInZoneRef = useRef<boolean | null>(null)
  const busyRef = useRef(false)
  const onJumpRef = useRef(onJump)
  const latestCentroidRef = useRef<Centroid | null>(null)
  const latestDetectionTimestampRef = useRef(0)

  onJumpRef.current = onJump

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    if (!enabled) {
      setStatus('idle')
      setError(null)
      setCentroid(null)
      setSmoothedCentroid(null)
      setIsInZone(false)
      smoothedRef.current = null
      wasInZoneRef.current = null
      busyRef.current = false
      latestCentroidRef.current = null
      latestDetectionTimestampRef.current = 0
      return undefined
    }

    const worker = new Worker(new URL('../workers/visionWorker.ts', import.meta.url), {
      type: 'module',
    })

    const frameCanvas = document.createElement('canvas')
    frameCanvas.width = VISION_WIDTH
    frameCanvas.height = VISION_HEIGHT
    const frameContext = frameCanvas.getContext('2d', { willReadFrequently: true })

    if (!frameContext) {
      setStatus('error')
      setError('Unable to prepare frame buffer for vision pipeline.')
      worker.terminate()
      return undefined
    }

    setStatus('loading')
    setError(null)

    let captureRafId = 0
    let trackerRafId = 0
    let lastCaptureTick = 0
    let lastTrackerTick = 0

    const captureInterval = 1000 / VISION_TARGET_FPS
    const trackerInterval = 1000 / TRACKER_TARGET_FPS
    let disposed = false

    worker.onmessage = (event: MessageEvent<VisionWorkerOutMessage>) => {
      if (disposed) {
        return
      }

      const message = event.data

      if (message.type === 'ready') {
        setStatus('ready')
        return
      }

      if (message.type === 'error') {
        busyRef.current = false
        setStatus('error')
        setError(message.error)
        return
      }

      if (message.type === 'result') {
        busyRef.current = false
        setCentroid(message.centroid)
        if (message.centroid) {
          latestCentroidRef.current = message.centroid
          latestDetectionTimestampRef.current = message.timestamp
        }
      }
    }

    worker.postMessage({ type: 'init' } satisfies VisionWorkerInMessage)

    const captureFrame = (now: number): void => {
      if (disposed) {
        return
      }

      if (now - lastCaptureTick < captureInterval) {
        captureRafId = window.requestAnimationFrame(captureFrame)
        return
      }

      lastCaptureTick = now

      const video = videoRef.current
      if (
        video &&
        statusRef.current === 'ready' &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        !busyRef.current
      ) {
        frameContext.drawImage(video, 0, 0, VISION_WIDTH, VISION_HEIGHT)
        const imageData = frameContext.getImageData(0, 0, VISION_WIDTH, VISION_HEIGHT)
        busyRef.current = true
        worker.postMessage({
          type: 'process',
          imageData,
        } satisfies VisionWorkerInMessage)
      }

      captureRafId = window.requestAnimationFrame(captureFrame)
    }

    const trackCentroid = (now: number): void => {
      if (disposed) {
        return
      }

      if (now - lastTrackerTick < trackerInterval) {
        trackerRafId = window.requestAnimationFrame(trackCentroid)
        return
      }

      lastTrackerTick = now

      const rawCentroid = latestCentroidRef.current
      const detectionAge =
        latestDetectionTimestampRef.current > 0
          ? Date.now() - latestDetectionTimestampRef.current
          : Number.POSITIVE_INFINITY

      if (!rawCentroid || detectionAge > VISION_LOST_TIMEOUT_MS) {
        latestCentroidRef.current = null
        setSmoothedCentroid(null)
        setIsInZone(false)
        smoothedRef.current = null
        wasInZoneRef.current = null
        trackerRafId = window.requestAnimationFrame(trackCentroid)
        return
      }

      const blended = blendCentroid(smoothedRef.current, rawCentroid, smoothingAlpha)

      smoothedRef.current = blended
      setSmoothedCentroid(blended)

      const inZone = isWithinZone(blended.y, zoneStartY, zoneEndY)
      setIsInZone(inZone)

      const previousInZone = wasInZoneRef.current
      if (previousInZone !== null && previousInZone !== inZone) {
        onJumpRef.current()
      }
      wasInZoneRef.current = inZone

      trackerRafId = window.requestAnimationFrame(trackCentroid)
    }

    captureRafId = window.requestAnimationFrame(captureFrame)
    trackerRafId = window.requestAnimationFrame(trackCentroid)

    return () => {
      disposed = true
      window.cancelAnimationFrame(captureRafId)
      window.cancelAnimationFrame(trackerRafId)
      worker.terminate()
    }
  }, [enabled, smoothingAlpha, videoRef, zoneEndY, zoneStartY])

  return {
    status,
    error,
    centroid,
    smoothedCentroid,
    isInZone,
  }
}
