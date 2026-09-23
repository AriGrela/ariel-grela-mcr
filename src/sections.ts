import type { L10n } from './data/cv'

export type SectionId =
  | 'profile'
  | 'experience'
  | 'live'
  | 'projects'
  | 'skills'
  | 'education'
  | 'terminal'
  | 'contact'

export interface Section {
  id: SectionId
  key: number
  label: L10n
  /** Source name shown on the under-monitor display, like a real multiviewer. */
  src: string
  accent: string
  blurb: L10n
}

export const SECTIONS: Section[] = [
  {
    id: 'profile',
    key: 1,
    label: { es: 'Perfil', en: 'Profile' },
    src: 'CAM 1',
    accent: '#ffb000',
    blurb: { es: 'Quién soy y qué busco', en: 'Who I am and what I’m after' },
  },
  {
    id: 'experience',
    key: 2,
    label: { es: 'Experiencia', en: 'Experience' },
    src: 'PLAYOUT',
    accent: '#ff3b3b',
    blurb: { es: 'Rundown de mi carrera', en: 'My career rundown' },
  },
  {
    id: 'projects',
    key: 3,
    label: { es: 'Proyectos', en: 'Projects' },
    src: 'MEDIA BIN',
    accent: '#35d0ff',
    blurb: { es: 'Automatización, IA e implementación', en: 'Automation, AI & implementation' },
  },
  {
    id: 'skills',
    key: 4,
    label: { es: 'Stack', en: 'Stack' },
    src: 'RACK',
    accent: '#8b7bff',
    blurb: { es: 'Código, IA y broadcast', en: 'Code, AI & broadcast' },
  },
  {
    id: 'live',
    key: 5,
    label: { es: 'En vivo', en: 'Live events' },
    src: 'OB VAN',
    accent: '#ff4fa3',
    blurb: { es: 'Finales de esports LVP', en: 'LVP esports finals' },
  },
  {
    id: 'education',
    key: 6,
    label: { es: 'Formación', en: 'Education' },
    src: 'ARCHIVE',
    accent: '#20e070',
    blurb: { es: 'UTN, UNLa y certificaciones', en: 'UTN, UNLa & certifications' },
  },
  {
    id: 'terminal',
    key: 7,
    label: { es: 'Terminal', en: 'Terminal' },
    src: 'DEV',
    accent: '#39ff88',
    blurb: { es: 'El lado programador', en: 'The developer side' },
  },
  {
    id: 'contact',
    key: 8,
    label: { es: 'Contacto', en: 'Contact' },
    src: 'RETURN',
    accent: '#ffffff',
    blurb: { es: 'Hablemos', en: 'Let’s talk' },
  },
]

export const sectionById = (id: SectionId) => SECTIONS.find((s) => s.id === id)!
export const isSectionId = (v: string): v is SectionId => SECTIONS.some((s) => s.id === v)
