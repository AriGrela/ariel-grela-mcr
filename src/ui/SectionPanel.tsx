import { useEffect, useRef } from 'react'
import { tr } from '../data/cv'
import { useT } from '../i18n'
import { SECTIONS, sectionById } from '../sections'
import { backToMultiviewer, take, useStore } from '../store'
import { Icon, Timecode } from './common'
import { SectionContent } from './Content'

export default function SectionPanel() {
  const { t, lang } = useT()
  const onAir = useStore((s) => s.onAir)
  const open = useStore((s) => s.panelOpen)
  const closeRef = useRef<HTMLButtonElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) closeRef.current?.focus({ preventScroll: true })
  }, [open])
  useEffect(() => {
    bodyRef.current?.scrollTo(0, 0)
  }, [onAir])

  if (!open || !onAir) return null
  const sec = sectionById(onAir)
  const idx = SECTIONS.indexOf(sec)
  const prev = SECTIONS[(idx + SECTIONS.length - 1) % SECTIONS.length]
  const next = SECTIONS[(idx + 1) % SECTIONS.length]

  return (
    <div className="panel-wrap" role="dialog" aria-modal="true" aria-labelledby="panel-title">
      <div className="panel" style={{ ['--accent' as string]: sec.accent }}>
        <header className="panel-head">
          <div className="panel-umd">
            <span className="umd-num">{sec.key}</span>
            <span className="umd-src">{sec.src}</span>
            <h2 id="panel-title">{tr(sec.label, lang)}</h2>
          </div>
          <div className="panel-meta">
            <span className="onair-pill on">{t.onAir}</span>
            <Timecode />
            <button ref={closeRef} type="button" className="btn btn-ghost panel-close" onClick={backToMultiviewer}>
              <Icon name="close" /> <span className="hide-sm">{t.back}</span> <kbd className="hide-sm">ESC</kbd>
            </button>
          </div>
        </header>

        <div className="panel-body signal-lock" key={onAir} ref={bodyRef}>
          <SectionContent id={onAir} />
        </div>

        <footer className="panel-foot">
          <button type="button" className="btn btn-ghost" onClick={() => take(prev.id)} aria-label={`${t.prev}: ${tr(prev.label, lang)}`}>
            ‹ <span className="hide-sm">{tr(prev.label, lang)}</span>
          </button>
          <div className="mini-deck" role="group" aria-label="Switcher">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`deck-key ${s.id === onAir ? 'pgm' : ''}`}
                onClick={() => take(s.id)}
                title={tr(s.label, lang)}
                aria-current={s.id === onAir}
              >
                <b>{s.key}</b>
                <span>{tr(s.label, lang)}</span>
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => take(next.id)} aria-label={`${t.next}: ${tr(next.label, lang)}`}>
            <span className="hide-sm">{tr(next.label, lang)}</span> ›
          </button>
        </footer>
      </div>
    </div>
  )
}
