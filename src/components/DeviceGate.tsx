import { useState } from 'react'
import { Smartphone, Share, SquarePlus, X, Download } from 'lucide-react'
import { useDeviceDetect } from '../lib/useDeviceDetect'

// 👉 Modifica questo link quando l'app Android sarà pubblicata su Google Play
const ANDROID_APP_URL = 'https://play.google.com/store/apps/details?id=com.tuonome.wave'

export default function DeviceGate({ children }: { children: React.ReactNode }) {
  const { device, isStandalone } = useDeviceDetect()
  const [dismissed, setDismissed] = useState(false)

  // Su desktop, o se l'app è già stata aggiunta alla home / installata, niente schermata
  if (device === 'desktop' || isStandalone || dismissed) {
    return <>{children}</>
  }

  if (device === 'android') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink px-6 text-center">
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-5 top-5 rounded-full border border-line p-2 text-mist active:scale-95"
          aria-label="Continua nel browser"
        >
          <X size={18} />
        </button>

        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-surface2 ring-1 ring-line">
          <Smartphone className="text-signal" size={36} />
        </div>

        <h1 className="font-display text-2xl font-semibold text-white">
          Vivi Wave al meglio sull'app
        </h1>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-mist">
          Hai un dispositivo Android. Scarica l'app per un feed più fluido, notifiche e upload
          più veloci.
        </p>

        <a
          href={ANDROID_APP_URL}
          className="mt-8 flex w-full max-w-xs items-center justify-center gap-2 rounded-full bg-signal py-3.5 font-semibold text-ink active:scale-[0.98]"
        >
          <Download size={18} />
          Scarica l'app
        </a>

        <button
          onClick={() => setDismissed(true)}
          className="mt-4 text-sm text-mist underline underline-offset-4"
        >
          Continua nel browser
        </button>
      </div>
    )
  }

  // iOS: niente App Store per ora, mostriamo come aggiungere alla home (PWA)
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-ink px-6 pb-10 pt-16 text-center">
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-5 top-5 rounded-full border border-line p-2 text-mist active:scale-95"
        aria-label="Continua nel browser"
      >
        <X size={18} />
      </button>

      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-surface2 ring-1 ring-line">
          <SquarePlus className="text-flare" size={36} />
        </div>
        <h1 className="font-display text-2xl font-semibold text-white">
          Aggiungi Wave alla Home
        </h1>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-mist">
          Su iPhone, Wave funziona meglio come app: aggiungila alla schermata Home per aprirla a
          schermo intero, senza barra del browser.
        </p>

        <ol className="mt-8 w-full max-w-xs space-y-4 text-left">
          <li className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface2 text-xs font-semibold text-signal">
              1
            </span>
            <span className="flex items-center gap-2 text-sm text-white">
              Tocca l'icona <Share size={16} className="text-signal" /> Condividi in basso
            </span>
          </li>
          <li className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface2 text-xs font-semibold text-signal">
              2
            </span>
            <span className="flex items-center gap-2 text-sm text-white">
              Scegli <SquarePlus size={16} className="text-signal" /> "Aggiungi a Home"
            </span>
          </li>
          <li className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface2 text-xs font-semibold text-signal">
              3
            </span>
            <span className="text-sm text-white">Conferma "Aggiungi" in alto a destra</span>
          </li>
        </ol>
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="text-sm text-mist underline underline-offset-4"
      >
        Continua nel browser
      </button>
    </div>
  )
}
