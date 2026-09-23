import { SECTIONS, type SectionId } from '../sections'
import type { DecoId } from './screens'

export interface Placement {
  pos: [number, number, number]
  rotY: number
  w: number
  h: number
}

/** Slight curve so the wall wraps around the operator's chair. */
const curve = (x: number) => ({ z: x * x * 0.035, rotY: -x * 0.045 })

const SRC_W = 1.6
const SRC_H = 0.9
const BIG_W = 3.4
const BIG_H = BIG_W * (9 / 16)

const xs = [-2.61, -0.87, 0.87, 2.61]
const rows = [1.52, 0.52]

export const SOURCE_PLACEMENTS = Object.fromEntries(
  SECTIONS.map((s, i) => {
    const x = xs[i % 4]
    const y = rows[Math.floor(i / 4)]
    const c = curve(x)
    return [s.id, { pos: [x, y, c.z], rotY: c.rotY, w: SRC_W, h: SRC_H } satisfies Placement]
  }),
) as Record<SectionId, Placement>

export const PVW_PLACEMENT: Placement = {
  pos: [-1.78, 3.08, curve(-1.78).z],
  rotY: curve(-1.78).rotY,
  w: BIG_W,
  h: BIG_H,
}
export const PGM_PLACEMENT: Placement = {
  pos: [1.78, 3.08, curve(1.78).z],
  rotY: curve(1.78).rotY,
  w: BIG_W,
  h: BIG_H,
}

const WING_X = 5.15
const WING_Z = 1.0
const WING_ROT = 0.52
const wingYs = [3.02, 1.96, 0.9]
const DECO_W = 1.72
const DECO_H = DECO_W * (9 / 16)

export const DECO_PLACEMENTS: { id: DecoId; p: Placement }[] = [
  ...(['scope', 'vector', 'audio'] as DecoId[]).map((id, i) => ({
    id,
    p: { pos: [-WING_X, wingYs[i], WING_Z] as [number, number, number], rotY: WING_ROT, w: DECO_W, h: DECO_H },
  })),
  ...(['clocks', 'schedule', 'regions'] as DecoId[]).map((id, i) => ({
    id,
    p: { pos: [WING_X, wingYs[i], WING_Z] as [number, number, number], rotY: -WING_ROT, w: DECO_W, h: DECO_H },
  })),
]

export const CONSOLE = {
  pos: [0, -0.18, 2.85] as [number, number, number],
  tilt: 0.24,
  width: 5.6,
  depth: 1.35,
}
