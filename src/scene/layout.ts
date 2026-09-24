import { SECTIONS, type SectionId } from '../sections'
import type { DecoId } from './screens'

export interface Placement {
  pos: [number, number, number]
  rotY: number
  w: number
  h: number
}

type Vec3 = [number, number, number]

/** Everything in the room that moves between the landscape and the phone (portrait) arrangement. */
export interface Layout {
  portrait: boolean
  sources: Record<SectionId, Placement>
  /** Preview monitor; the phone layout drops it (there is no hover on touch). */
  pvw: Placement | null
  pgm: Placement
  decos: { id: DecoId; p: Placement }[]
  sign: { pos: Vec3; w: number; h: number }
  trims: { x: number; y: number; h: number }
  strip: { y: number; w: number }
  console: {
    pos: Vec3
    tilt: number
    width: number
    depth: number
    /** Source key position (x, z) on the console top, by index 0-7. */
    key: (i: number) => [number, number]
    /** The program bus row (red keys) only fits the wide console. */
    bus: ((i: number) => [number, number]) | null
    cut: [number, number]
    auto: [number, number]
    tbar: number
    stripX: number
    stripW: number
  }
  desk: { pos: Vec3; w: number; d: number; bodyPos: Vec3; bodyW: number }
  floorY: number
}

/** Slight curve so the wall wraps around the operator's chair. */
const curve = (x: number) => ({ z: x * x * 0.035, rotY: -x * 0.045 })

const SRC_W = 1.6
const SRC_H = 0.9
const BIG_W = 3.4
const BIG_H = BIG_W * (9 / 16)

/* ------------------------------------------------------------------ */
/* Landscape: 2 big monitors over a 4 x 2 multiviewer, wings on the sides */
/* ------------------------------------------------------------------ */

const xs = [-2.61, -0.87, 0.87, 2.61]
const rows = [1.52, 0.52]

const WING_X = 5.15
const WING_Z = 1.0
const WING_ROT = 0.52
const wingYs = [3.02, 1.96, 0.9]
const DECO_W = 1.72
const DECO_H = DECO_W * (9 / 16)

const landscape: Layout = {
  portrait: false,
  sources: Object.fromEntries(
    SECTIONS.map((s, i) => {
      const x = xs[i % 4]
      const y = rows[Math.floor(i / 4)]
      const c = curve(x)
      return [s.id, { pos: [x, y, c.z], rotY: c.rotY, w: SRC_W, h: SRC_H } satisfies Placement]
    }),
  ) as Record<SectionId, Placement>,
  pvw: { pos: [-1.78, 3.08, curve(-1.78).z], rotY: curve(-1.78).rotY, w: BIG_W, h: BIG_H },
  pgm: { pos: [1.78, 3.08, curve(1.78).z], rotY: curve(1.78).rotY, w: BIG_W, h: BIG_H },
  decos: [
    ...(['scope', 'vector', 'audio'] as DecoId[]).map((id, i) => ({
      id,
      p: { pos: [-WING_X, wingYs[i], WING_Z] as Vec3, rotY: WING_ROT, w: DECO_W, h: DECO_H },
    })),
    ...(['clocks', 'schedule', 'regions'] as DecoId[]).map((id, i) => ({
      id,
      p: { pos: [WING_X, wingYs[i], WING_Z] as Vec3, rotY: -WING_ROT, w: DECO_W, h: DECO_H },
    })),
  ],
  sign: { pos: [0, 4.5, 0.05], w: 1.3, h: 0.325 },
  trims: { x: 3.95, y: 2.0, h: 4.4 },
  strip: { y: -0.12, w: 7.6 },
  console: {
    pos: [0, -0.18, 2.85],
    tilt: 0.24,
    width: 5.6,
    depth: 1.35,
    key: (i) => [-2.35 + i * 0.47, 0.12],
    bus: (i) => [-2.35 + i * 0.47, -0.38],
    cut: [1.62, -0.3],
    auto: [1.62, 0.2],
    tbar: 2.3,
    stripX: -0.5,
    stripW: 4.3,
  },
  desk: { pos: [0, -0.3, 2.95], w: 10, d: 1.9, bodyPos: [0, -0.68, 3.1], bodyW: 9.8 },
  floorY: -1.03,
}

/* ------------------------------------------------------------------ */
/* Portrait (phones): program monitor on top, 2 x 4 sources, compact switcher */
/* ------------------------------------------------------------------ */

const P_SRC_W = 1.72
const P_SRC_H = P_SRC_W * (9 / 16)
const P_BIG_W = 3.5
const pxs = [-0.9, 0.9]
const pys = [3.08, 2.06, 1.04, 0.02]

const portrait: Layout = {
  portrait: true,
  sources: Object.fromEntries(
    SECTIONS.map((s, i) => [
      s.id,
      { pos: [pxs[i % 2], pys[Math.floor(i / 2)], 0], rotY: 0, w: P_SRC_W, h: P_SRC_H } satisfies Placement,
    ]),
  ) as Record<SectionId, Placement>,
  pvw: null,
  pgm: { pos: [0, 4.72, 0], rotY: 0, w: P_BIG_W, h: P_BIG_W * (9 / 16) },
  decos: [],
  sign: { pos: [0, 6.03, 0.05], w: 1.1, h: 0.275 },
  trims: { x: 2.15, y: 2.6, h: 6.6 },
  strip: { y: -0.6, w: 3.9 },
  console: {
    pos: [0, -1.05, 1.45],
    tilt: 0.55,
    width: 3.8,
    depth: 1.25,
    key: (i) => [-1.58 + (i % 4) * 0.47, i < 4 ? -0.24 : 0.26],
    bus: null,
    cut: [0.78, -0.22],
    auto: [0.78, 0.26],
    tbar: 1.5,
    stripX: -0.2,
    stripW: 3.2,
  },
  desk: { pos: [0, -1.18, 1.55], w: 4.6, d: 1.8, bodyPos: [0, -1.6, 1.7], bodyW: 4.5 },
  floorY: -1.95,
}

export const getLayout = (isPortrait: boolean): Layout => (isPortrait ? portrait : landscape)

/** Every decorative screen that may exist in either layout (their canvases are created once). */
export const ALL_DECOS = landscape.decos
