import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import { finishBoot } from '../store'

const LOG = [
  'MCR-01 power on',
  'genlock · tri-level sync ........ OK',
  'router 16x16 · sources 1–8 ....... OK',
  'multiviewer · layout 2+8 ......... OK',
  'playout automation ............... READY',
  'python · apps script · n8n ....... READY',
]

export default function Boot() {
  const { t } = useT()
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const reduce =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches && !location.search.includes('forceboot')
    const timers = reduce
      ? [window.setTimeout(finishBoot, 600)]
      : [
          window.setTimeout(() => setPhase(1), 900),
          window.setTimeout(() => setPhase(2), 2250),
          window.setTimeout(finishBoot, 2900),
        ]
    const skip = () => finishBoot()
    window.addEventListener('keydown', skip)
    window.addEventListener('pointerdown', skip)
    return () => {
      timers.forEach(clearTimeout)
      window.removeEventListener('keydown', skip)
      window.removeEventListener('pointerdown', skip)
    }
  }, [])

  return (
    <div className={`boot phase-${phase}`} role="status" aria-label={t.booting}>
      {phase === 0 && (
        <div className="boot-bars" aria-hidden="true">
          <div className="boot-bars-top">
            {['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'].map((c) => (
              <span key={c} style={{ background: c }} />
            ))}
          </div>
          <div className="boot-ident">
            <strong>ARIEL GRELA · MCR-01</strong>
            <span>1 kHz · −18 dBFS</span>
          </div>
        </div>
      )}
      {phase >= 1 && (
        <div className="boot-log">
          <div className="boot-title">{t.booting}…</div>
          {LOG.map((l, i) => (
            <div key={l} className="boot-line" style={{ animationDelay: `${i * 0.17}s` }}>
              <span className="boot-prompt">›</span> {l}
            </div>
          ))}
          {phase === 2 && <div className="boot-acquired">● {t.signal}</div>}
        </div>
      )}
      <div className="boot-skip">{t.skip}</div>
    </div>
  )
}
