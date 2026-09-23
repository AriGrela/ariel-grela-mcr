import raw from './cv.json'

export type Lang = 'es' | 'en'
export type L10n = { es: string; en: string }
export type Text = string | L10n | null | undefined

export interface Experience {
  id: string
  role: L10n
  org: string
  via: string | L10n | null
  start: string
  end: string | null
  yearOnly?: boolean
  location: string
  tags: string[]
  bullets: { es: string[]; en: string[] }
}

export interface LiveEvent {
  id: string
  title: L10n
  game: string
  date: L10n
  mode: 'onsite' | 'online'
  venue: L10n
  facts: { es: string[]; en: string[] }
}

export interface Project {
  id: string
  title: L10n
  kind: L10n
  stack: string[]
  problem: L10n
  solution: L10n
  result: L10n | null
  url?: string
}

export interface Clip {
  id: string
  title: string
  kind: L10n
  year: string
  role: L10n
  url: string | null
}

export interface CV {
  person: {
    name: string
    shortName: string
    initials: string
    title: L10n
    tagline: L10n
    location: L10n
    email: string
    linkedin: string
    github: string
    site: string
    /** Short tags shown under the title: the developer half of the profile. */
    focus: (string | L10n)[]
  }
  about: { es: string[]; en: string[] }
  /** Shorter third-person summary used by the PDF résumé. */
  summary: { es: string[]; en: string[] }
  seeking: L10n
  stats: { value: string; label: L10n }[]
  competencies: { title: L10n; text: L10n }[]
  experience: Experience[]
  events: LiveEvent[]
  projects: Project[]
  clips: Clip[]
  skills: { id: string; group: L10n; items: (string | L10n)[] }[]
  education: {
    id: string
    title: L10n
    org: string
    period: L10n
    status: L10n
    detail: string | null
    state: 'progress' | 'done' | 'partial'
  }[]
  certifications: { id: string; title: L10n; org: string; date: L10n; detail: L10n }[]
  languages: { name: L10n; level: L10n; note?: L10n }[]
}

export const cv = raw as CV

/** Resolves a plain or localized value to the current language. */
export function tr(value: Text, lang: Lang): string {
  if (value == null) return ''
  return typeof value === 'string' ? value : value[lang]
}

const MONTHS: Record<Lang, string[]> = {
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}

export function fmtMonth(ym: string | null, lang: Lang, yearOnly = false): string {
  if (!ym) return lang === 'es' ? 'actualidad' : 'present'
  const [y, m] = ym.split('-').map(Number)
  return yearOnly ? String(y) : `${MONTHS[lang][m - 1]} ${y}`
}

/** "MM/YYYY" style timecode used in the rundown. */
export function tcMonth(ym: string | null, yearOnly = false): string {
  if (!ym) return '--/----'
  const [y, m] = ym.split('-')
  return yearOnly ? `··/${y}` : `${m}/${y}`
}

export function duration(start: string, end: string | null, lang: Lang): string {
  const [sy, sm] = start.split('-').map(Number)
  const now = new Date()
  const [ey, em] = end ? end.split('-').map(Number) : [now.getFullYear(), now.getMonth() + 1]
  const total = (ey - sy) * 12 + (em - sm) + 1
  const y = Math.floor(total / 12)
  const m = total % 12
  const yl = lang === 'es' ? 'a' : 'y'
  if (y && m) return `${y}${yl} ${m}m`
  if (y) return `${y}${yl}`
  return `${m}m`
}
