import { useEffect } from 'react'
import type { RefObject } from 'react'
import { VISION_HEIGHT, VISION_WIDTH } from '../config/game'
import type { Centroid } from '../types/vision'

interface CameraPreviewProps {
  videoRef: RefObject<HTMLVideoElement | null>
  stream: MediaStream | null
  smoothedCentroid: Centroid | null
  zoneStartY: number
  zoneEndY: number
  isInZone: boolean
}

export const CameraPreview = ({
  videoRef,
  stream,
  smoothedCentroid,
  zoneStartY,
  zoneEndY,
  isInZone,
}: CameraPreviewProps) => {
  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) {
      return
    }
    videoElement.srcObject = stream
    return () => {
      videoElement.srcObject = null
    }
  }, [stream, videoRef])

  const hasStream = stream !== null
  const zoneTopPercent = (zoneStartY / VISION_HEIGHT) * 100
  const zoneHeightPercent = ((zoneEndY - zoneStartY) / VISION_HEIGHT) * 100
  const centroidXPercent = smoothedCentroid
    ? (smoothedCentroid.x / VISION_WIDTH) * 100
    : 50
  const centroidYPercent = smoothedCentroid
    ? (smoothedCentroid.y / VISION_HEIGHT) * 100
    : 50

  return (
    <section className="camera-panel">
      <h3>Tracking Preview</h3>
      <div className="camera-frame">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={hasStream ? '' : 'is-muted'}
        />
        {hasStream ? (
          <div
            className="zone-band"
            style={{
              top: `${zoneTopPercent}%`,
              height: `${zoneHeightPercent}%`,
            }}
          />
        ) : null}
        {smoothedCentroid ? (
          <div
            className={isInZone ? 'centroid-dot in-zone' : 'centroid-dot'}
            style={{
              left: `${centroidXPercent}%`,
              top: `${centroidYPercent}%`,
            }}
          />
        ) : null}
        {!hasStream ? (
          <div className="camera-overlay">Start the camera to enable face tracking.</div>
        ) : null}
      </div>
    </section>
  )
}
