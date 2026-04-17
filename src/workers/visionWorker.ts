import * as blazeface from '@tensorflow-models/blazeface'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
import * as tf from '@tensorflow/tfjs'
import type { Centroid, VisionWorkerInMessage, VisionWorkerOutMessage } from '../types/vision'

type WorkerScope = {
  postMessage: (message: VisionWorkerOutMessage) => void
  onmessage: ((event: MessageEvent<VisionWorkerInMessage>) => void) | null
}

const workerScope = self as unknown as WorkerScope

let detector: blazeface.BlazeFaceModel | null = null
let processing = false

const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.22.0/dist/'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isNumericPair = (value: unknown): value is [number, number] =>
  Array.isArray(value) &&
  value.length >= 2 &&
  typeof value[0] === 'number' &&
  typeof value[1] === 'number'

const toPoint = (value: unknown): [number, number] | null => {
  if (isNumericPair(value)) {
    return value
  }

  if (!isRecord(value)) {
    return null
  }

  if (typeof value.arraySync !== 'function') {
    return null
  }

  const arrayData = value.arraySync() as unknown
  if (isNumericPair(arrayData)) {
    return arrayData
  }

  return null
}

const resolveCentroid = (face: unknown): Centroid | null => {
  if (!isRecord(face)) {
    return null
  }

  const topLeft = toPoint(face.topLeft)
  const bottomRight = toPoint(face.bottomRight)

  if (topLeft && bottomRight) {
    return {
      x: (topLeft[0] + bottomRight[0]) / 2,
      y: (topLeft[1] + bottomRight[1]) / 2,
    }
  }

  if (!Array.isArray(face.landmarks) || face.landmarks.length === 0) {
    return null
  }

  const keypoints = face.landmarks
    .map((landmark) => toPoint(landmark))
    .filter((landmark): landmark is [number, number] => landmark !== null)

  if (keypoints.length === 0) {
    return null
  }

  const aggregate = keypoints.reduce(
    (running, point) => ({
      x: running.x + point[0],
      y: running.y + point[1],
    }),
    { x: 0, y: 0 },
  )

  return {
    x: aggregate.x / keypoints.length,
    y: aggregate.y / keypoints.length,
  }
}

const initializeDetector = async (): Promise<void> => {
  if (detector) {
    return
  }

  setWasmPaths(WASM_PATH)

  let hasWasmBackend = false
  try {
    hasWasmBackend = await tf.setBackend('wasm')
  } catch {
    hasWasmBackend = false
  }

  if (!hasWasmBackend) {
    await tf.setBackend('cpu')
  }

  await tf.ready()

  detector = await blazeface.load({
    maxFaces: 1,
    inputWidth: 128,
    inputHeight: 128,
    iouThreshold: 0.3,
    scoreThreshold: 0.75,
  })
}

workerScope.onmessage = async (event: MessageEvent<VisionWorkerInMessage>) => {
  const message = event.data

  if (message.type === 'init') {
    try {
      await initializeDetector()
      workerScope.postMessage({ type: 'ready' } satisfies VisionWorkerOutMessage)
    } catch (unknownError) {
      const errorMessage =
        unknownError instanceof Error
          ? unknownError.message
          : 'Failed to initialize vision detector.'
      workerScope.postMessage({
        type: 'error',
        error: errorMessage,
      } satisfies VisionWorkerOutMessage)
    }
    return
  }

  if (message.type === 'process') {
    if (!detector || processing) {
      return
    }

    processing = true

    try {
      const faces = await detector.estimateFaces(
        message.imageData,
        false,
        true,
        false,
      )
      const centroid = faces.length > 0 ? resolveCentroid(faces[0]) : null
      workerScope.postMessage({
        type: 'result',
        centroid,
        timestamp: Date.now(),
      } satisfies VisionWorkerOutMessage)
    } catch (unknownError) {
      const errorMessage =
        unknownError instanceof Error
          ? unknownError.message
          : 'Face detection failed for the current frame.'
      workerScope.postMessage({
        type: 'error',
        error: errorMessage,
      } satisfies VisionWorkerOutMessage)
    } finally {
      processing = false
    }
  }
}

export {}
