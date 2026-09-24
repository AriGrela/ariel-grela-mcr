import { useEffect, useState } from 'react'
import { cv } from '../data/cv'
import { useT } from '../i18n'

export function Timecode({ className = '' }: { className?: string }) {
  const [tc, setTc] = useState('00:00:00:00')
  useEffect(() => {
    const pad = (n: number) => String(n).padStart(2, '0')
    const id = window.setInterval(() => {
      const d = new Date()
      const f = Math.floor((d.getMilliseconds() / 1000) * 30)
      setTc(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}:${pad(f)}`)
    }, 1000 / 15)
    return () => clearInterval(id)
  }, [])
  return (
    <span className={`timecode ${className}`} aria-hidden="true">
      {tc}
    </span>
  )
}

export const cvHref = (lang: 'es' | 'en') => `/cv/Ariel_Grela_CV_${lang.toUpperCase()}.pdf`

type IconName = 'download' | 'linkedin' | 'github' | 'mail' | 'arrow' | 'close' | 'copy' | 'check' | 'print' | 'play'

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  switch (name) {
    case 'download':
      return (
        <svg {...p}>
          <path d="M12 3v12m0 0-5-5m5 5 5-5M4 21h16" />
        </svg>
      )
    case 'linkedin':
      return (
        <svg {...p} fill="currentColor" stroke="none">
          <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm6.5 0h3.8v1.5h.06c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.77 2.65 4.77 6.1v5.45h-4v-4.83c0-1.15-.02-2.63-1.6-2.63-1.61 0-1.85 1.25-1.85 2.55v4.91h-4v-11Z" />
        </svg>
      )
    case 'github':
      return (
        <svg {...p} fill="currentColor" stroke="none">
          <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.58 9.58 0 0 1 5 0c1.91-1.3 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
        </svg>
      )
    case 'mail':
      return (
        <svg {...p}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      )
    case 'arrow':
      return (
        <svg {...p}>
          <path d="M5 12h14m0 0-6-6m6 6-6 6" />
        </svg>
      )
    case 'close':
      return (
        <svg {...p}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      )
    case 'copy':
      return (
        <svg {...p}>
          <rect x="8" y="8" width="12" height="12" rx="2" />
          <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
        </svg>
      )
    case 'check':
      return (
        <svg {...p}>
          <path d="m5 12 5 5L20 7" />
        </svg>
      )
    case 'print':
      return (
        <svg {...p}>
          <path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z" />
        </svg>
      )
    case 'play':
      return (
        <svg {...p} fill="currentColor" stroke="none">
          <path d="M8 5v14l11-7z" />
        </svg>
      )
  }
}

/** Primary calls to action, reused on the HUD, the 2D view and the contact panel. */
export function CtaRow({ compact = false }: { compact?: boolean }) {
  const { t, lang } = useT()
  return (
    <div className={`cta-row ${compact ? 'compact' : ''}`}>
      <a className="btn btn-primary" href={cvHref(lang)} download aria-label={t.downloadCv}>
        <Icon name="download" /> <span className="btn-label">{t.downloadCv}</span>
      </a>
      <a className="btn" href={cv.person.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn">
        <Icon name="linkedin" /> {!compact && 'LinkedIn'}
      </a>
      <a className="btn" href={cv.person.github} target="_blank" rel="noreferrer" aria-label="GitHub">
        <Icon name="github" /> {!compact && 'GitHub'}
      </a>
      <a className="btn" href={`mailto:${cv.person.email}`} aria-label={t.email}>
        <Icon name="mail" /> {!compact && t.email}
      </a>
    </div>
  )
}

export function CopyEmail() {
  const { t } = useT()
  const [done, setDone] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cv.person.email)
      setDone(true)
      window.setTimeout(() => setDone(false), 1600)
    } catch {
      window.location.href = `mailto:${cv.person.email}`
    }
  }
  return (
    <button type="button" className="btn btn-ghost" onClick={copy}>
      <Icon name={done ? 'check' : 'copy'} /> {done ? t.copied : t.copy}
    </button>
  )
}
