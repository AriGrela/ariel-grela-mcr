import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import { toggleFullscreen, toggleHud, useStore } from '../store'

function useFullscreen() {
  const [on, setOn] = useState(() => !!document.fullscreenElement)
  useEffect(() => {
    const sync = () => setOn(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])
  return on
}

/** Two hardware-style keys in the corner of the control room: panels on/off and full screen. */
export default function ControlKeys() {
  const { t } = useT()
  const hudHidden = useStore((s) => s.hudHidden)
  const panelOpen = useStore((s) => s.panelOpen)
  const fullscreen = useFullscreen()
  const canFullscreen = !!document.fullscreenEnabled
  if (panelOpen) return null

  return (
    <div className="control-keys" role="group" aria-label="Control">
      <button
        type="button"
        className={`ckey ${hudHidden ? '' : 'on'}`}
        onClick={toggleHud}
        aria-pressed={!hudHidden}
        title={hudHidden ? t.hudShow : t.hudHide}
        aria-label={hudHidden ? t.hudShow : t.hudHide}
      >
        <span className="ckey-led" aria-hidden="true" />
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M8 5v14M16 5v14" />
        </svg>
        HUD
      </button>
      {canFullscreen && (
        <button
          type="button"
          className={`ckey alert ${fullscreen ? 'on' : ''}`}
          onClick={toggleFullscreen}
          aria-pressed={fullscreen}
          title={fullscreen ? t.fsExit : t.fsEnter}
          aria-label={fullscreen ? t.fsExit : t.fsEnter}
        >
          <span className="ckey-led" aria-hidden="true" />
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {fullscreen ? (
              <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
            ) : (
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            )}
          </svg>
          FULL
        </button>
      )}
    </div>
  )
}
