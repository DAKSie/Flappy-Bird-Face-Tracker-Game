export interface Centroid {
  x: number
  y: number
}

export interface VisionInitMessage {
  type: 'init'
}

export interface VisionProcessMessage {
  type: 'process'
  imageData: ImageData
}

export type VisionWorkerInMessage = VisionInitMessage | VisionProcessMessage

export interface VisionReadyMessage {
  type: 'ready'
}

export interface VisionResultMessage {
  type: 'result'
  centroid: Centroid | null
  timestamp: number
}

export interface VisionErrorMessage {
  type: 'error'
  error: string
}

export type VisionWorkerOutMessage =
  | VisionReadyMessage
  | VisionResultMessage
  | VisionErrorMessage

export type VisionStatus = 'idle' | 'loading' | 'ready' | 'error'
