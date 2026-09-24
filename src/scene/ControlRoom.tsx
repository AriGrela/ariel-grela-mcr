import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import * as THREE from 'three'
import { tr } from '../data/cv'
import { SECTIONS, type SectionId } from '../sections'
import { backToMultiviewer, getState, setState, subscribe, take, useStore } from '../store'
import { CONSOLE, DECO_PLACEMENTS, PGM_PLACEMENT, PVW_PLACEMENT, SOURCE_PLACEMENTS, type Placement } from './layout'
import { gpuInfo } from '../gpu'
import { F, paintBars, paintDeco, paintKeyCap, paintSlate, paintSource, type DecoId, type Tally } from './screens'

const QS = new URLSearchParams(location.search)

/* ------------------------------------------------------------------ */
/* Canvas-backed textures                                              */
/* ------------------------------------------------------------------ */

// Debug switches: ?canvas=gpu uses GPU-backed 2D canvases, ?paint=off freezes the screens.
const GPU_CANVAS = QS.get('canvas') === 'gpu'
const PAINT_OFF = QS.get('paint') === 'off'

interface Surface {
  ctx: CanvasRenderingContext2D
  tex: THREE.CanvasTexture
  w: number
  h: number
}

/**
 * A 2D canvas used as a texture. `w`/`h` are the logical size the painters draw
 * in; `scale` shrinks the backing store (the monitors are small on screen).
 *
 * The canvas is kept in CPU memory (`willReadFrequently`). A GPU-backed 2D
 * canvas makes Chrome synchronise its rasteriser with WebGL on every upload:
 * that stalled the GPU (fans up, low fps, black browser tabs) and sometimes
 * uploaded half-drawn frames, which showed as stripes and broken text.
 */
function surface(w: number, h: number, scale = 1): Surface {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  const ctx = canvas.getContext('2d', { willReadFrequently: !GPU_CANVAS })!
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  // Mipmaps keep thin text and scanlines from shimmering into moiré when a
  // monitor is small on screen.
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.generateMipmaps = true
  tex.anisotropy = 4
  return { ctx, tex, w, h }
}

interface Surfaces {
  sources: Record<SectionId, Surface>
  slate: Surface
  bars: Surface
  deco: Record<DecoId, Surface>
  keys: Record<SectionId, Surface>
  sign: Surface
}

function createSurfaces(): Surfaces {
  const sources = Object.fromEntries(SECTIONS.map((s) => [s.id, surface(512, 288, 0.8)])) as Record<SectionId, Surface>
  const keys = Object.fromEntries(SECTIONS.map((s) => [s.id, surface(256, 256)])) as Record<SectionId, Surface>
  const deco = Object.fromEntries(DECO_PLACEMENTS.map((d) => [d.id, surface(384, 216, 0.75)])) as Record<DecoId, Surface>
  return {
    sources,
    keys,
    deco,
    slate: surface(1024, 576, 0.75),
    bars: surface(512, 288, 0.8),
    sign: surface(512, 128, 0.5),
  }
}

const tallyFor = (id: SectionId): Tally => {
  const s = getState()
  if (s.onAir === id) return 'pgm'
  if (s.preview === id || s.hover === id) return 'pvw'
  return null
}

interface Job {
  every: number
  last: number
  /** Painted again right away when this changes (e.g. the tally colour). */
  sig: () => string
  lastSig: string
  active: () => boolean
  run: (t: number) => void
}

/** Max canvases repainted (and uploaded to the GPU) per frame. */
const PAINT_BUDGET = 2

/**
 * Repaints the animated screens round-robin: a few per frame instead of all
 * of them at once, so texture uploads never spike into a dropped frame.
 * Sources refresh ~8 fps, engineering screens ~4 fps.
 */
function Painter({ sf }: { sf: Surfaces }) {
  const keySig = useRef('')
  const jobs = useMemo<Job[]>(() => {
    const job = (
      surf: Surface,
      every: number,
      paint: (t: number) => void,
      sig: () => string = () => getState().lang,
      active: () => boolean = () => true,
    ): Job => ({
      every: PAINT_OFF ? Infinity : every,
      last: -1,
      sig,
      lastSig: '',
      active,
      run: (t) => {
        paint(t)
        surf.tex.needsUpdate = true
      },
    })
    const ctxOf = (surf: Surface, t: number, tally: Tally) => ({
      ctx: surf.ctx,
      w: surf.w,
      h: surf.h,
      t,
      lang: getState().lang,
      tally,
    })
    return [
      ...SECTIONS.map((sec) =>
        job(
          sf.sources[sec.id],
          1 / 8,
          (t) => paintSource(sec.id, ctxOf(sf.sources[sec.id], t, tallyFor(sec.id))),
          () => `${getState().lang}|${tallyFor(sec.id)}`,
        ),
      ),
      job(sf.slate, 1 / 10, (t) => paintSlate(ctxOf(sf.slate, t, 'pgm')), undefined, () => !getState().onAir),
      job(
        sf.bars,
        1 / 8,
        (t) => paintBars(ctxOf(sf.bars, t, 'pvw')),
        undefined,
        () => !getState().hover && !getState().preview,
      ),
      ...DECO_PLACEMENTS.map((d) => job(sf.deco[d.id], 1 / 4, (t) => paintDeco(d.id, ctxOf(sf.deco[d.id], t, null)))),
    ]
  }, [sf])

  useFrame(({ clock }) => {
    const s = getState()
    const t = clock.elapsedTime
    const lang = s.lang
    const due: { job: Job; urgency: number }[] = []
    for (const j of jobs) {
      if (!j.active()) continue
      if (j.sig() !== j.lastSig) due.push({ job: j, urgency: Infinity })
      else if (t - j.last >= j.every) due.push({ job: j, urgency: t - j.last - j.every })
    }
    due.sort((x, y) => y.urgency - x.urgency)
    for (const { job } of due.slice(0, PAINT_BUDGET)) {
      job.run(t)
      job.last = t
      job.lastSig = job.sig()
    }

    // Key caps and the ON AIR sign only change with state.
    const sig = `${lang}|${s.onAir}|${s.preview}|${s.hover}|${document.fonts?.status}`
    if (sig !== keySig.current) {
      keySig.current = sig
      for (const sec of SECTIONS) {
        const k = sf.keys[sec.id]
        const lit = s.onAir === sec.id ? 'pgm' : s.preview === sec.id ? 'pvw' : s.hover === sec.id ? 'hover' : null
        paintKeyCap(k.ctx, k.w, k.h, String(sec.key), tr(sec.label, lang), lit, sec.accent)
        k.tex.needsUpdate = true
      }
      const g = sf.sign.ctx
      g.fillStyle = '#0a0000'
      g.fillRect(0, 0, 512, 128)
      g.strokeStyle = s.onAir ? '#ff4a4a' : '#3a0d0d'
      g.lineWidth = 8
      g.strokeRect(6, 6, 500, 116)
      g.fillStyle = s.onAir ? '#ff3030' : '#4a1212'
      g.font = `700 84px ${F.cond}`
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(lang === 'es' ? 'AL AIRE' : 'ON AIR', 256, 68)
      sf.sign.tex.needsUpdate = true
    }
  })
  return null
}

/* ------------------------------------------------------------------ */
/* Monitors                                                            */
/* ------------------------------------------------------------------ */

const LAMP_OFF = new THREE.Color('#1a1a1a')
const LAMP_RED = new THREE.Color(4, 0.25, 0.2)
const LAMP_GREEN = new THREE.Color(0.2, 3, 0.8)

function hoverHandlers(id: SectionId) {
  return {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      setState({ hover: id })
      document.body.style.cursor = 'pointer'
    },
    onPointerOut: () => {
      if (getState().hover === id) setState({ hover: null })
      document.body.style.cursor = ''
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      take(id)
    },
  }
}

function Monitor({
  p,
  map,
  id,
  lamp,
  onClick,
}: {
  p: Placement
  map: () => THREE.Texture
  id?: SectionId
  lamp?: () => Tally
  onClick?: () => void
}) {
  const screen = useRef<THREE.MeshBasicMaterial>(null)
  const lampMat = useRef<THREE.MeshBasicMaterial>(null)
  const bezel = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(() => {
    const m = map()
    if (screen.current && screen.current.map !== m) {
      screen.current.map = m
      screen.current.needsUpdate = true
    }
    if (lampMat.current && lamp) {
      const l = lamp()
      lampMat.current.color.copy(l === 'pgm' ? LAMP_RED : l === 'pvw' ? LAMP_GREEN : LAMP_OFF)
    }
    if (bezel.current && id) {
      const hot = getState().hover === id
      bezel.current.emissive.setRGB(hot ? 0.12 : 0, hot ? 0.14 : 0, hot ? 0.16 : 0)
    }
  })
  const handlers = id
    ? hoverHandlers(id)
    : onClick
      ? {
          onClick: (e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation()
            onClick()
          },
          onPointerOver: () => (document.body.style.cursor = 'pointer'),
          onPointerOut: () => (document.body.style.cursor = ''),
        }
      : {}
  return (
    <group position={p.pos} rotation-y={p.rotY}>
      {/* Bezel sits behind the screen; coplanar faces z-fought into stripes and missing text. */}
      <RoundedBox args={[p.w + 0.1, p.h + 0.1, 0.1]} radius={0.025} smoothness={2} position-z={-0.07}>
        <meshStandardMaterial ref={bezel} color="#0f1114" metalness={0.6} roughness={0.45} />
      </RoundedBox>
      <mesh {...handlers}>
        <planeGeometry args={[p.w, p.h]} />
        <meshBasicMaterial ref={screen} toneMapped={false} color="#e6e6e6" />
      </mesh>
      {lamp && (
        <mesh position={[p.w / 2 - 0.16, p.h / 2 + 0.035, 0.01]}>
          <boxGeometry args={[0.2, 0.025, 0.02]} />
          <meshBasicMaterial ref={lampMat} toneMapped={false} />
        </mesh>
      )}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Switcher console                                                    */
/* ------------------------------------------------------------------ */

const keyTravel = (pressedAt: number | undefined) => {
  if (pressedAt === undefined) return 0
  const k = (performance.now() - pressedAt) / 240
  return k >= 0 && k < 1 ? -0.028 * Math.sin(Math.PI * k) : 0
}

const DARK_KEY = new THREE.MeshStandardMaterial({ color: '#15181c', metalness: 0.3, roughness: 0.6 })

function SourceKey({ id, x, z, tex }: { id: SectionId; x: number; z: number; tex: THREE.Texture }) {
  const ref = useRef<THREE.Mesh>(null)
  const materials = useMemo(() => {
    const top = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
    return [DARK_KEY, DARK_KEY, top, DARK_KEY, DARK_KEY, DARK_KEY]
  }, [tex])
  useFrame(() => {
    const s = getState()
    if (ref.current) ref.current.position.y = 0.05 + keyTravel(s.pressedAt[id])
    const lit = s.onAir === id || s.preview === id
    ;(materials[2] as THREE.MeshBasicMaterial).color.setScalar(lit ? 1.9 : 1)
  })
  return <mesh ref={ref} position={[x, 0.05, z]} material={materials} {...hoverHandlers(id)}>
    <boxGeometry args={[0.4, 0.07, 0.4]} />
  </mesh>
}

function BusKey({ id, x, z }: { id: SectionId; x: number; z: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(() => {
    const s = getState()
    if (ref.current) ref.current.position.y = 0.04 + keyTravel(s.pressedAt[id])
    mat.current?.color.copy(s.onAir === id ? LAMP_RED : LAMP_OFF)
  })
  return (
    <mesh ref={ref} position={[x, 0.04, z]} {...hoverHandlers(id)}>
      <boxGeometry args={[0.4, 0.05, 0.22]} />
      <meshBasicMaterial ref={mat} toneMapped={false} />
    </mesh>
  )
}

function ActionKey({
  kind,
  x,
  z,
  label,
}: {
  kind: 'cut' | 'auto'
  x: number
  z: number
  label: string
}) {
  const ref = useRef<THREE.Mesh>(null)
  const tex = useMemo(() => {
    const s = surface(128, 96)
    s.ctx.fillStyle = kind === 'auto' ? '#b01818' : '#c9ced6'
    s.ctx.fillRect(0, 0, 128, 96)
    s.ctx.fillStyle = kind === 'auto' ? '#fff' : '#111'
    s.ctx.font = `700 44px ${F.cond}`
    s.ctx.textAlign = 'center'
    s.ctx.textBaseline = 'middle'
    s.ctx.fillText(label, 64, 50)
    document.fonts?.ready.then(() => {
      s.ctx.fillStyle = kind === 'auto' ? '#b01818' : '#c9ced6'
      s.ctx.fillRect(0, 0, 128, 96)
      s.ctx.fillStyle = kind === 'auto' ? '#fff' : '#111'
      s.ctx.fillText(label, 64, 50)
      s.tex.needsUpdate = true
    })
    return s.tex
  }, [kind, label])
  const materials = useMemo(() => {
    const top = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
    return [DARK_KEY, DARK_KEY, top, DARK_KEY, DARK_KEY, DARK_KEY]
  }, [tex])
  useFrame(() => {
    if (ref.current) ref.current.position.y = 0.05 + keyTravel(getState().pressedAt[kind])
  })
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const s = getState()
    const next = s.preview ?? s.hover ?? SECTIONS[0].id
    take(next)
  }
  return (
    <mesh
      ref={ref}
      position={[x, 0.05, z]}
      material={materials}
      onClick={onClick}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <boxGeometry args={[0.56, 0.07, 0.42]} />
    </mesh>
  )
}

/** The T-bar sweeps across on every AUTO transition, alternating direction like the real lever. */
function TBar({ x }: { x: number }) {
  const lever = useRef<THREE.Group>(null)
  const dir = useRef(1)
  const last = useRef(-1)
  useFrame(() => {
    const { transitionAt } = getState()
    if (transitionAt !== last.current) {
      last.current = transitionAt
      dir.current *= -1
    }
    const k = Math.min(1, Math.max(0, (performance.now() - transitionAt) / 700))
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
    const from = -0.55 * dir.current
    if (lever.current) lever.current.rotation.x = from + (0.55 * dir.current - from) * e
  })
  return (
    <group position={[x, 0.02, 0.05]}>
      <mesh position-y={0.01}>
        <boxGeometry args={[0.12, 0.02, 0.95]} />
        <meshStandardMaterial color="#050607" roughness={0.9} />
      </mesh>
      <group ref={lever}>
        <mesh position-y={0.22}>
          <cylinderGeometry args={[0.018, 0.018, 0.44, 12]} />
          <meshStandardMaterial color="#9aa3ad" metalness={0.9} roughness={0.25} />
        </mesh>
        <mesh position-y={0.46}>
          <boxGeometry args={[0.34, 0.06, 0.08]} />
          <meshStandardMaterial color="#d8dde3" metalness={0.4} roughness={0.35} />
        </mesh>
      </group>
    </group>
  )
}

function Switcher({ sf }: { sf: Surfaces }) {
  const lang = useStore((s) => s.lang)
  const keyX = (i: number) => -2.35 + i * 0.47
  return (
    <group position={CONSOLE.pos} rotation-x={CONSOLE.tilt}>
      <RoundedBox args={[CONSOLE.width, 0.16, CONSOLE.depth]} radius={0.04} smoothness={3}>
        <meshStandardMaterial color="#1b1f24" metalness={0.55} roughness={0.42} />
      </RoundedBox>
      <group position-y={0.08}>
        {/* Program bus */}
        {SECTIONS.map((s, i) => (
          <BusKey key={s.id} id={s.id} x={keyX(i)} z={-0.38} />
        ))}
        {/* Source select / preview bus */}
        {SECTIONS.map((s, i) => (
          <SourceKey key={s.id} id={s.id} x={keyX(i)} z={0.12} tex={sf.keys[s.id].tex} />
        ))}
        <ActionKey kind="cut" x={1.62} z={-0.3} label="CUT" />
        <ActionKey kind="auto" x={1.62} z={0.2} label={lang === 'es' ? 'AUTO' : 'AUTO'} />
        <TBar x={2.3} />
        {/* Status strip */}
        <mesh position={[-0.5, 0.005, 0.52]}>
          <boxGeometry args={[4.3, 0.01, 0.04]} />
          <meshBasicMaterial color={[0.6, 0.05, 0.05]} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Room                                                                */
/* ------------------------------------------------------------------ */

function Room() {
  const sf = useMemo(() => createSurfaces(), [])
  const pvwMap = () => {
    const s = getState()
    const id = s.hover ?? s.preview
    return id ? sf.sources[id].tex : sf.bars.tex
  }
  const pgmMap = () => {
    const s = getState()
    return s.onAir ? sf.sources[s.onAir].tex : sf.slate.tex
  }
  const signMat = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(({ clock }) => {
    const on = !!getState().onAir
    signMat.current?.color.setScalar(on ? 1.6 + Math.sin(clock.elapsedTime * 6) * 0.2 : 0.9)
  })

  return (
    <>
      <Painter sf={sf} />
      <ambientLight intensity={0.35} />
      <pointLight position={[0, 2.2, 3.5]} intensity={6} distance={9} color="#6f8cff" />
      <pointLight position={[1.8, 4.2, 1.5]} intensity={4} distance={7} color="#ff3b3b" />
      <spotLight position={[0, 6, 6]} angle={0.5} penumbra={0.8} intensity={30} distance={14} color="#ffffff" />

      {/* Back wall + LED trims */}
      <mesh position={[0, 2.2, -0.3]}>
        <planeGeometry args={[26, 10]} />
        <meshStandardMaterial color="#07080a" roughness={0.95} />
      </mesh>
      {[-3.95, 3.95].map((x) => (
        <mesh key={x} position={[x, 2.0, -0.1]}>
          <boxGeometry args={[0.025, 4.4, 0.02]} />
          <meshBasicMaterial color={[0.15, 0.35, 1.6]} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, -0.12, 0.1]}>
        <boxGeometry args={[7.6, 0.02, 0.02]} />
        <meshBasicMaterial color={[1.4, 0.08, 0.08]} toneMapped={false} />
      </mesh>

      {/* ON AIR sign */}
      <mesh position={[0, 4.5, 0.05]}>
        <planeGeometry args={[1.3, 0.325]} />
        <meshBasicMaterial ref={signMat} map={sf.sign.tex} toneMapped={false} />
      </mesh>

      {/* Multiviewer wall */}
      <Monitor p={PVW_PLACEMENT} map={pvwMap} lamp={() => 'pvw'} />
      <Monitor
        p={PGM_PLACEMENT}
        map={pgmMap}
        lamp={() => 'pgm'}
        onClick={() => {
          const s = getState()
          if (s.onAir) backToMultiviewer()
          else take('profile')
        }}
      />
      {SECTIONS.map((s) => (
        <Monitor key={s.id} p={SOURCE_PLACEMENTS[s.id]} map={() => sf.sources[s.id].tex} id={s.id} lamp={() => tallyFor(s.id)} />
      ))}

      {/* Side wings with engineering screens */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 5.2, 1.95, 0.8]} rotation-y={-side * 0.52}>
          <boxGeometry args={[2.1, 3.5, 0.06]} />
          <meshStandardMaterial color="#0a0b0d" roughness={0.8} />
        </mesh>
      ))}
      {DECO_PLACEMENTS.map((d) => (
        <Monitor key={d.id} p={d.p} map={() => sf.deco[d.id].tex} />
      ))}

      {/* Desk */}
      <RoundedBox args={[10, 0.1, 1.9]} radius={0.04} position={[0, -0.3, 2.95]}>
        <meshStandardMaterial color="#0c0e11" metalness={0.5} roughness={0.35} />
      </RoundedBox>
      <mesh position={[0, -0.68, 3.1]}>
        <boxGeometry args={[9.8, 0.7, 1.4]} />
        <meshStandardMaterial color="#050607" roughness={0.9} />
      </mesh>
      <Switcher sf={sf} />

      {/* Floor: a plain glossy plane. A real-time reflector re-rendered the whole room every frame. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -1.03, 3]}>
        <planeGeometry args={[40, 24]} />
        <meshStandardMaterial color="#060607" metalness={0.7} roughness={0.45} />
      </mesh>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Camera                                                              */
/* ------------------------------------------------------------------ */

/** Width in px covered by the HTML HUD panels on each side of the viewport. */
function hudInsets(width: number) {
  const left = document.querySelector('.hud-left')?.getBoundingClientRect()
  const right = document.querySelector('.hud-right')?.getBoundingClientRect()
  return {
    // Panels slid off-screen (HUD hidden) stop reserving space, so the room re-centres.
    left: left && left.width > 50 ? Math.max(0, left.right + 12) : 0,
    right: right && right.width > 50 ? Math.max(0, width - right.left + 12) : 0,
  }
}

const TAN_HALF_FOV = Math.tan(THREE.MathUtils.degToRad(20))

function CameraRig() {
  const { camera, size, pointer } = useThree()
  const look = useRef(new THREE.Vector3(0, 3.5, 0))
  const wantPos = useMemo(() => new THREE.Vector3(), [])
  const wantLook = useMemo(() => new THREE.Vector3(), [])
  const insets = useRef({ left: 0, right: 0 })
  const shift = useRef(0)
  const frame = useRef(0)
  useFrame((_, dt) => {
    const s = getState()
    const aspect = size.width / size.height
    // Measured every few frames; the HUD slide animation is tracked smoothly enough.
    if (frame.current++ % 4 === 0) insets.current = hudInsets(size.width)
    const inside = !!s.onAir
    const { left, right } = inside ? { left: 0, right: 0 } : insets.current
    const free = Math.max(0.4, (size.width - left - right) / size.width)

    if (inside) {
      const p = SOURCE_PLACEMENTS[s.onAir!]
      const dist = 1.5 * Math.max(1, 1.5 / aspect)
      wantLook.set(p.pos[0], p.pos[1], p.pos[2])
      wantPos.set(p.pos[0] + Math.sin(p.rotY) * dist, p.pos[1], p.pos[2] + Math.cos(p.rotY) * dist)
    } else {
      // Frame the main wall (7 units wide) in the space between the HUD panels,
      // but never closer than what keeps the ON AIR sign and the switcher in shot.
      // 9 is the closest distance that still keeps the ON AIR sign and the whole switcher in shot.
      const fitWidth = 7.4 / (2 * TAN_HALF_FOV * aspect * free)
      const dist = THREE.MathUtils.clamp(fitWidth, 9, 14)
      wantPos.set(pointer.x * 0.4, 1.95 + pointer.y * 0.18 + (dist - 8.6) * 0.06, dist)
      wantLook.set(pointer.x * 0.1, 1.72, 0)
    }
    const k = 1 - Math.exp(-dt * (inside ? 3.6 : 2.0))
    perf.cameraMoving = camera.position.distanceToSquared(wantPos) > 1e-4
    camera.position.lerp(wantPos, k)
    look.current.lerp(wantLook, k)
    camera.lookAt(look.current)

    // Shift the projection so the room is centred in the free area, not the full window.
    const wantShift = (left - right) / 2
    shift.current += (wantShift - shift.current) * k
    const cam = camera as THREE.PerspectiveCamera
    if (Math.abs(shift.current) > 0.5) {
      cam.setViewOffset(size.width, size.height, -shift.current, 0, size.width, size.height)
    } else if (cam.view) {
      cam.clearViewOffset()
    }
  })
  return null
}

// Only for automated screenshots: keeps the last frame readable by capture tools.
const SHOT = QS.has('shot')

/* ------------------------------------------------------------------ */
/* Performance                                                         */
/* ------------------------------------------------------------------ */

/**
 * Quality tiers. Resolution never drops below 1:1 (that made text blurry);
 * the tiers trade effects and frame rate instead.
 *   2: bloom + vignette, up to 1.5x on HiDPI screens (capped at ~3.7 MP), 60 fps
 *   1: bloom + vignette, 1x-1.25x, 60 fps               <- starting point
 *   0: no post-processing, 1x, 30 fps
 * When nothing moves the room renders at IDLE_FPS: the screens only change
 * ~8 times a second anyway, so rendering more just heats the GPU.
 */
type Tier = 0 | 1 | 2
const MAX_FPS = Number(QS.get('fps')) || 60
const IDLE_FPS = 24
const LOCKED_TIER: Tier | null = QS.has('nofx')
  ? 0
  : QS.get('quality') === 'low'
    ? 0
    : QS.get('quality') === 'mid'
      ? 1
      : QS.get('quality') === 'high'
        ? 2
        : null

const perf = {
  tier: (LOCKED_TIER ?? 1) as Tier,
  lastActivity: performance.now(),
  cameraMoving: true,
}
const tierListeners = new Set<() => void>()
function setTier(t: Tier) {
  if (t === perf.tier) return
  perf.tier = t
  tierListeners.forEach((l) => l())
}
const useTier = () =>
  useSyncExternalStore(
    (l) => {
      tierListeners.add(l)
      return () => tierListeners.delete(l)
    },
    () => perf.tier,
  )
const poke = () => {
  perf.lastActivity = performance.now()
}

function Quality() {
  const tier = useTier()
  const setDpr = useThree((s) => s.setDpr)
  const { width, height } = useThree((s) => s.size)
  useEffect(() => {
    const device = window.devicePixelRatio || 1
    const cap = tier === 2 ? Math.min(1.5, Math.sqrt(3.7e6 / Math.max(1, width * height))) : tier === 1 ? 1.25 : 1
    setDpr(Math.max(1, Math.min(device, cap)))
  }, [tier, width, height, setDpr])
  if (tier === 0) return null
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur levels={tier === 2 ? 5 : 4} intensity={0.9} luminanceThreshold={0.62} luminanceSmoothing={0.25} />
      <Vignette offset={0.28} darkness={0.8} />
    </EffectComposer>
  )
}

/**
 * Drives the render loop (the Canvas renders on demand):
 * - at most 60 fps while something moves, IDLE_FPS otherwise;
 * - nothing at all while a section panel covers the room;
 * - measures the frame rate it actually gets while active and steps the
 *   quality tier down after a slow 1.5 s window (up once, if it is smooth).
 */
function FrameLimiter() {
  const invalidate = useThree((s) => s.invalidate)
  const open = useStore((s) => s.panelOpen)

  useEffect(() => {
    const onInput = () => poke()
    window.addEventListener('pointermove', onInput, { passive: true })
    window.addEventListener('wheel', onInput, { passive: true })
    window.addEventListener('keydown', onInput)
    const unsub = subscribe(onInput)
    return () => {
      window.removeEventListener('pointermove', onInput)
      window.removeEventListener('wheel', onInput)
      window.removeEventListener('keydown', onInput)
      unsub()
    }
  }, [])

  useEffect(() => {
    if (open) return
    poke()
    let raf = 0
    let last = 0
    // Skip the first second: shader compilation and texture uploads are not representative.
    let windowStart = performance.now() + 1000
    let windowFrames = 0
    let smoothWindows = 0
    let raised = false
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const idle = now - perf.lastActivity > 2500 && !perf.cameraMoving
      const target = idle ? IDLE_FPS : perf.tier === 0 ? Math.min(30, MAX_FPS) : MAX_FPS
      // Small slack so a 60 Hz display isn't rounded down to 30 fps.
      if (now - last >= 1000 / target - 2) {
        last = now
        invalidate()
        windowFrames++
      }
      if (idle || now < windowStart) {
        if (idle) windowStart = now
        windowFrames = 0
        return
      }
      const span = now - windowStart
      if (span < 1500 || LOCKED_TIER !== null) return
      const fps = (windowFrames * 1000) / span
      if (fps < target * 0.75 && perf.tier > 0) {
        setTier((perf.tier - 1) as Tier)
        smoothWindows = 0
      } else if (fps >= target * 0.95) {
        if (++smoothWindows >= 4 && perf.tier < 2 && !raised) {
          raised = true
          setTier((perf.tier + 1) as Tier)
          smoothWindows = 0
        }
      } else {
        smoothWindows = 0
      }
      windowStart = now + 500 // let a tier change settle before measuring again
      windowFrames = 0
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [open, invalidate])
  return null
}

/** `?stats`: tiny readout (fps, render time, resolution, tier, GPU) to compare machines without devtools. */
function FpsMeter() {
  const gl = useThree((s) => s.gl)
  const el = useMemo(() => {
    const d = document.createElement('div')
    d.style.cssText =
      'position:fixed;left:8px;bottom:8px;z-index:99;font:12px/1.4 monospace;color:#39ff88;background:#000c;padding:4px 8px;border-radius:4px;pointer-events:none;max-width:calc(100vw - 16px)'
    return d
  }, [])
  const acc = useRef({ frames: 0, since: performance.now(), renderMs: 0 })
  useEffect(() => {
    document.body.appendChild(el)
    const render = gl.render.bind(gl)
    gl.render = (scene, camera) => {
      const t0 = performance.now()
      render(scene, camera)
      acc.current.renderMs += performance.now() - t0
    }
    return () => {
      gl.render = render
      el.remove()
    }
  }, [el, gl])
  useFrame(() => {
    const a = acc.current
    a.frames++
    const now = performance.now()
    if (now - a.since >= 500) {
      const fps = (a.frames * 1000) / (now - a.since)
      const c = gl.domElement
      const ms = a.renderMs / Math.max(1, a.frames)
      const idle = now - perf.lastActivity > 2500 && !perf.cameraMoving
      el.textContent =
        `${fps.toFixed(0)} fps${idle ? ' (idle)' : ''} · render ${ms.toFixed(1)} ms · ${c.width}×${c.height} · tier ${perf.tier}` +
        ` · ${GPU_CANVAS ? 'gpu' : 'cpu'} canvas${PAINT_OFF ? ' · paint off' : ''} · ${gpuInfo().renderer}`
      a.frames = 0
      a.renderMs = 0
      a.since = now
    }
  })
  return null
}

/** `?shot`: lets automated checks render frames by hand while the tab is throttled. */
function DebugHandle() {
  const get = useThree((s) => s.get)
  useEffect(() => {
    ;(window as unknown as { __mcr?: typeof get }).__mcr = get
  }, [get])
  return null
}

// Nothing here subscribes to the store, so opening a section never re-renders
// the Canvas or rebuilds the post-processing buffers (that flashed black).
export default function ControlRoom() {
  return (
    <Canvas
      className="mcr-canvas"
      aria-hidden="true"
      dpr={1}
      frameloop="demand"
      camera={{ fov: 40, position: [0, 5.5, 17], near: 0.5, far: 40 }}
      gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: SHOT }}
      onPointerMissed={() => setState({ hover: null })}
    >
      <color attach="background" args={['#000']} />
      <fog attach="fog" args={['#000', 12, 28]} />
      <Room />
      <CameraRig />
      <FrameLimiter />
      <Quality />
      {SHOT && <DebugHandle />}
      {QS.has('stats') && <FpsMeter />}
    </Canvas>
  )
}
