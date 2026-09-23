import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cv, fmtMonth, tr, type Lang } from '../data/cv'
import { strings } from '../i18n'
import { SECTIONS, isSectionId } from '../sections'
import { backToMultiviewer, getState, setLang, take } from '../store'
import { cvHref } from './common'

interface Line {
  id: number
  kind: 'in' | 'out' | 'err' | 'ok'
  body: ReactNode
}

const COMMANDS = [
  'help',
  'whoami',
  'about',
  'experience',
  'live',
  'projects',
  'skills',
  'education',
  'contact',
  'cv',
  'git log',
  'neofetch',
  'onair',
  'lang',
  'ls',
  'date',
  'clear',
  'exit',
  'sudo hire ariel',
]

function help(lang: Lang): ReactNode {
  const rows: [string, string, string][] = [
    ['whoami', 'quién soy', 'who I am'],
    ['about', 'perfil completo', 'full profile'],
    ['experience', 'historial laboral', 'work history'],
    ['live', 'finales de esports', 'esports finals'],
    ['projects', 'proyectos', 'projects'],
    ['skills', 'stack técnico', 'tech stack'],
    ['education', 'formación', 'education'],
    ['git log', 'la carrera como commits', 'career as commits'],
    ['neofetch', 'specs del operador', 'operator specs'],
    ['onair <1-8>', 'sacar una sección al aire', 'put a section on air'],
    ['contact · cv', 'contacto y descarga del CV', 'contact & CV download'],
    ['lang es|en', 'cambiar idioma', 'switch language'],
    ['clear · exit', 'limpiar · salir', 'clear · quit'],
  ]
  return (
    <div className="term-table">
      {rows.map(([c, es, en]) => (
        <div key={c} className="term-row">
          <span className="term-cmd">{c}</span>
          <span>{lang === 'es' ? es : en}</span>
        </div>
      ))}
      <div className="term-dim">{lang === 'es' ? 'Tip: Tab autocompleta, ↑/↓ historial.' : 'Tip: Tab autocompletes, ↑/↓ history.'}</div>
    </div>
  )
}

function neofetch(lang: Lang): ReactNode {
  const years = new Date().getFullYear() - 2022
  const art = [
    '   ▄▄▄▄▄▄▄▄▄▄▄   ',
    '  █ ▓▓ ▓▓ ▓▓ █  ',
    '  █ ▓▓ ▓▓ ▓▓ █  ',
    '  █▄▄▄▄▄▄▄▄▄▄█  ',
    '   ● ● ● ● ●    ',
    '   [CUT][AUTO]  ',
  ]
  const info: [string, string][] = [
    ['OS', 'MCR-OS 1.0 (broadcast ⟷ code)'],
    ['Host', 'GRUP MEDIAPRO · Disney Streaming LATAM'],
    ['Uptime', `${years}+ ${lang === 'es' ? 'años en vivo' : 'years live'}`],
    ['Shell', 'Python · SQL · Apps Script · Java'],
    ['Automation', 'n8n · Apps Script · Companion'],
    ['AI', lang === 'es' ? 'desarrollo asistido (Cursor) · chatbots' : 'AI-assisted dev (Cursor) · chatbots'],
    ['Playout', lang === 'es' ? '60+ eventos/mes' : '60+ events/month'],
    ['Locale', 'es-AR · en (B2)'],
  ]
  return (
    <div className="neofetch">
      <pre aria-hidden="true">{art.join('\n')}</pre>
      <div>
        <div className="term-accent">ariel@mcr-01</div>
        <div className="term-dim">────────────</div>
        {info.map(([k, v]) => (
          <div key={k}>
            <span className="term-accent">{k}</span>: {v}
          </div>
        ))}
      </div>
    </div>
  )
}

function gitLog(lang: Lang): ReactNode {
  const hash = (s: string) => {
    let h = 0
    for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0
    return h.toString(16).padStart(7, '0').slice(0, 7)
  }
  return (
    <div>
      {cv.experience.map((e, i) => (
        <div key={e.id}>
          <span className="term-warn">* {hash(e.id)}</span>
          {i === 0 && <span className="term-accent"> (HEAD → main)</span>} feat: {tr(e.role, lang)} @ {e.org}{' '}
          <span className="term-dim">({fmtMonth(e.start, lang, e.yearOnly)})</span>
        </div>
      ))}
      <div>
        <span className="term-warn">* {hash('utn')}</span> chore: {lang === 'es' ? 'estudiando Programación en UTN' : 'studying Programming at UTN'}{' '}
        <span className="term-dim">(2024 → 2026)</span>
      </div>
    </div>
  )
}

function run(raw: string, lang: Lang, clear: () => void): { kind: Line['kind']; body: ReactNode } | null {
  const input = raw.trim().replace(/\s+/g, ' ')
  const [cmd, ...args] = input.toLowerCase().split(' ')
  const es = lang === 'es'
  const t = strings(lang)
  const goto = (id: (typeof SECTIONS)[number]['id']) => {
    window.setTimeout(() => take(id), 350)
    return { kind: 'ok' as const, body: `${t.onAir} → ${tr(SECTIONS.find((s) => s.id === id)!.label, lang)}` }
  }
  switch (cmd) {
    case '':
      return null
    case 'help':
    case '?':
    case 'man':
      return { kind: 'out', body: help(lang) }
    case 'whoami':
      return {
        kind: 'out',
        body: (
          <div>
            <div className="term-accent">{cv.person.name}</div>
            <div>{tr(cv.person.title, lang)}</div>
            <div className="term-dim">{tr(cv.person.tagline, lang)}</div>
          </div>
        ),
      }
    case 'about':
    case 'perfil':
      return goto('profile')
    case 'experience':
    case 'exp':
    case 'experiencia':
      return goto('experience')
    case 'live':
    case 'events':
    case 'eventos':
      return goto('live')
    case 'projects':
    case 'proyectos':
      return goto('projects')
    case 'skills':
    case 'stack':
      return {
        kind: 'out',
        body: (
          <div>
            {cv.skills.map((g) => (
              <div key={g.id}>
                <span className="term-accent">{tr(g.group, lang)}</span>: {g.items.map((it) => tr(it, lang)).join(', ')}
              </div>
            ))}
          </div>
        ),
      }
    case 'education':
    case 'edu':
    case 'formacion':
      return goto('education')
    case 'contact':
    case 'contacto':
      return {
        kind: 'out',
        body: (
          <div>
            <div>
              email ··· <a href={`mailto:${cv.person.email}`}>{cv.person.email}</a>
            </div>
            <div>
              linkedin · <a href={cv.person.linkedin} target="_blank" rel="noreferrer">in/arielgrela</a>
            </div>
            <div>
              github ·· <a href={cv.person.github} target="_blank" rel="noreferrer">AriGrela</a>
            </div>
          </div>
        ),
      }
    case 'cv':
    case 'resume': {
      const a = document.createElement('a')
      a.href = cvHref(lang)
      a.download = ''
      a.click()
      return { kind: 'ok', body: es ? '✔ Descargando CV…' : '✔ Downloading CV…' }
    }
    case 'git':
      if (args[0] === 'log') return { kind: 'out', body: gitLog(lang) }
      if (args[0] === 'status')
        return { kind: 'out', body: es ? 'En la rama main. Abierto a nuevas oportunidades.' : 'On branch main. Open to new opportunities.' }
      return { kind: 'err', body: es ? 'Probá: git log · git status' : 'Try: git log · git status' }
    case 'neofetch':
      return { kind: 'out', body: neofetch(lang) }
    case 'onair':
    case 'take': {
      const a = args[0] ?? ''
      const byNum = SECTIONS.find((s) => String(s.key) === a)
      const byId = SECTIONS.find((s) => s.id === a || tr(s.label, lang).toLowerCase() === a)
      const target = byNum ?? byId
      if (target && isSectionId(target.id)) return goto(target.id)
      return { kind: 'err', body: es ? 'Uso: onair <1-8 | perfil | experience …>' : 'Usage: onair <1-8 | profile | experience …>' }
    }
    case 'lang':
      if (args[0] === 'es' || args[0] === 'en') {
        setLang(args[0])
        return { kind: 'ok', body: args[0] === 'es' ? '✔ Idioma: español' : '✔ Language: English' }
      }
      return { kind: 'err', body: 'lang es | lang en' }
    case 'ls':
      return {
        kind: 'out',
        body: (
          <div className="term-ls">
            {SECTIONS.map((s) => (
              <span key={s.id}>
                {s.key}_{s.id}/
              </span>
            ))}
            <span>cv.pdf</span>
          </div>
        ),
      }
    case 'cat':
      return { kind: 'out', body: es ? 'Usá los comandos: about, experience, projects…' : 'Use the commands: about, experience, projects…' }
    case 'date':
      return { kind: 'out', body: new Date().toString() }
    case 'echo':
      return { kind: 'out', body: raw.trim().slice(5) }
    case 'clear':
    case 'cls':
      clear()
      return null
    case 'exit':
    case 'quit':
      window.setTimeout(backToMultiviewer, 200)
      return { kind: 'ok', body: es ? 'Volviendo al multiviewer…' : 'Back to the multiviewer…' }
    case 'sudo':
      if (input.toLowerCase().includes('hire'))
        return {
          kind: 'ok',
          body: (
            <div>
              <div>[sudo] {es ? 'verificando permisos…' : 'checking permissions…'} ✔</div>
              <div className="term-accent">{es ? '¡Excelente decisión! 🎬' : 'Excellent decision! 🎬'}</div>
              <div>
                {es ? 'Escribime a ' : 'Reach me at '}
                <a href={`mailto:${cv.person.email}?subject=${encodeURIComponent(es ? 'Propuesta laboral' : 'Job opportunity')}`}>{cv.person.email}</a>
              </div>
            </div>
          ),
        }
      return { kind: 'err', body: es ? 'Permiso denegado. Probá: sudo hire ariel' : 'Permission denied. Try: sudo hire ariel' }
    case 'rm':
      return { kind: 'err', body: es ? 'Buen intento. Esta señal no se corta. 😉' : 'Nice try. This signal never drops. 😉' }
    default:
      return { kind: 'err', body: `${cmd}: ${es ? 'comando no encontrado. Escribí help' : 'command not found. Type help'}` }
  }
}

let nextId = 0

export default function Terminal() {
  const lang = getState().lang
  const t = strings(lang)
  const [lines, setLines] = useState<Line[]>(() => [
    { id: nextId++, kind: 'ok', body: t.termHello },
    { id: nextId++, kind: 'out', body: help(lang) },
  ])
  const [value, setValue] = useState('')
  const [hist, setHist] = useState<string[]>([])
  const [hIdx, setHIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true })
  }, [])
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' })
  }, [lines])

  const submit = (cmd = value) => {
    setValue('')
    setHIdx(-1)
    if (cmd.trim()) setHist((h) => [cmd, ...h].slice(0, 50))
    let cleared = false
    const res = run(cmd, getState().lang, () => {
      cleared = true
    })
    setLines((ls) => {
      const base: Line[] = cleared ? [] : [...ls, { id: nextId++, kind: 'in', body: cmd }]
      return res ? [...base, { id: nextId++, ...res }] : base
    })
  }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation()
    if (e.key === 'Enter') submit()
    else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const i = Math.min(hist.length - 1, hIdx + 1)
      if (i >= 0) {
        setHIdx(i)
        setValue(hist[i])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const i = hIdx - 1
      setHIdx(i)
      setValue(i >= 0 ? hist[i] : '')
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const match = COMMANDS.find((c) => c.startsWith(value.toLowerCase()) && value)
      if (match) setValue(match)
    } else if (e.key === 'Escape') {
      backToMultiviewer()
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      setLines([])
    }
  }

  return (
    <div className="terminal" onClick={() => inputRef.current?.focus()}>
      <div className="term-bar" aria-hidden="true">
        <i />
        <i />
        <i />
        <span>ariel@mcr-01: ~</span>
      </div>
      <div className="term-screen" role="log" aria-live="polite">
        {lines.map((l) => (
          <div key={l.id} className={`term-line ${l.kind}`}>
            {l.kind === 'in' ? (
              <>
                <span className="term-prompt">ariel@mcr-01:~$</span> {l.body}
              </>
            ) : (
              l.body
            )}
          </div>
        ))}
        <div className="term-input-row" ref={endRef}>
          <label htmlFor="term-input" className="term-prompt">
            ariel@mcr-01:~$
          </label>
          <input
            id="term-input"
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKey}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="Terminal"
          />
        </div>
      </div>
      <div className="term-quick">
        {['whoami', 'git log', 'neofetch', 'skills', 'sudo hire ariel'].map((c) => (
          <button
            key={c}
            type="button"
            className="chip chip-btn"
            onClick={(e) => {
              e.stopPropagation()
              submit(c)
              inputRef.current?.focus({ preventScroll: true })
            }}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}
