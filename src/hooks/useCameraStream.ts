import { useCallback, useEffect, useState } from 'react'

interface UseCameraStreamResult {
  devices: MediaDeviceInfo[]
  selectedDeviceId: string
  setSelectedDeviceId: (deviceId: string) => void
  stream: MediaStream | null
  isLoading: boolean
  error: string | null
  isActive: boolean
  refreshDevices: () => Promise<void>
  startCamera: () => Promise<void>
  stopCamera: () => void
}

const CAMERA_UNAVAILABLE = 'Camera access is unavailable in this browser.'

export const useCameraStream = (): UseCameraStreamResult => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshDevices = useCallback(async (): Promise<void> => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setDevices([])
      return
    }

    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = allDevices.filter((device) => device.kind === 'videoinput')
      setDevices(videoDevices)
      setSelectedDeviceId((current) => {
        if (current && videoDevices.some((device) => device.deviceId === current)) {
          return current
        }
        return videoDevices[0]?.deviceId ?? ''
      })
    } catch (unknownError) {
      const message =
        unknownError instanceof Error
          ? unknownError.message
          : 'Unable to enumerate camera devices.'
      setError(message)
    }
  }, [])

  const stopCamera = useCallback((): void => {
    setStream((current) => {
      if (current) {
        current.getTracks().forEach((track) => track.stop())
      }
      return null
    })
  }, [])

  const startCamera = useCallback(async (): Promise<void> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(CAMERA_UNAVAILABLE)
      return
    }

    setError(null)
    setIsLoading(true)

    stopCamera()

    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 60, max: 60 },
        },
        audio: false,
      })

      setStream(nextStream)
      const [firstTrack] = nextStream.getVideoTracks()
      const selectedFromTrack = firstTrack?.getSettings().deviceId
      if (selectedFromTrack) {
        setSelectedDeviceId(selectedFromTrack)
      }
      await refreshDevices()
    } catch (unknownError) {
      const message =
        unknownError instanceof Error
          ? unknownError.message
          : 'Unable to start camera stream.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [refreshDevices, selectedDeviceId, stopCamera])

  useEffect(() => {
    void refreshDevices()
    if (!navigator.mediaDevices?.addEventListener) {
      return undefined
    }

    const handleDeviceChange = (): void => {
      void refreshDevices()
    }

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
    }
  }, [refreshDevices])

  useEffect(
    () => () => {
      stopCamera()
    },
    [stopCamera],
  )

  return {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    stream,
    isLoading,
    error,
    isActive: stream !== null,
    refreshDevices,
    startCamera,
    stopCamera,
  }
}
