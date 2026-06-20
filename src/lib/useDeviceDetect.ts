import { useEffect, useState } from 'react'

export type DeviceKind = 'android' | 'ios' | 'desktop'

function detectDevice(): DeviceKind {
  const ua = navigator.userAgent || (navigator as any).vendor || ''

  if (/android/i.test(ua)) return 'android'

  // iOS rileva anche iPad su iPadOS 13+ che si finge "Mac" ma ha touch
  const isIOSClassic = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
  const isIPadOS13Plus = ua.includes('Macintosh') && navigator.maxTouchPoints > 1
  if (isIOSClassic || isIPadOS13Plus) return 'ios'

  return 'desktop'
}

function detectStandalone(): boolean {
  const isStandaloneDisplay = window.matchMedia('(display-mode: standalone)').matches
  const isIOSStandalone = (navigator as any).standalone === true
  return isStandaloneDisplay || isIOSStandalone
}

export function useDeviceDetect() {
  const [device, setDevice] = useState<DeviceKind>('desktop')
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    setDevice(detectDevice())
    setIsStandalone(detectStandalone())
  }, [])

  return { device, isStandalone }
}
