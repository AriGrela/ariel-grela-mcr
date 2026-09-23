import { useEffect, useRef } from 'react'
import type { SectionId } from '../sections'
import { paintSource } from '../scene/screens'
import { getState } from '../store'

const W = 512
const H = 288
const FPS = 6

type Entry = { ctx: CanvasRenderingContext2D; id: SectionId; visible: boolean }
const entries = new Set<Entry>()
let raf = 0
let last = 0
const start = performance.now()

function paint(e: Entry, t: number) {
  paintSource(e.id, { ctx: e.ctx, w: W, h: H, t, lang: getState().lang, tally: null })
}

// One shared loop for every tile, only painting the ones on screen.
function loop(now: number) {
  raf = entries.size ? requestAnimationFrame(loop) : 0
  if (now - last < 1000 / FPS) return
  last = now
  const t = (now - start) / 1000
  for (const e of entries) if (e.visible) paint(e, t)
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * A live "camera" for the 2D multiviewer: the same scene the 3D monitor shows,
 * painted on a small canvas. The canvas' own label strip is cropped by CSS
 * because the tile already has an HTML one.
 */
export default function TileScreen({ id }: { id: SectionId }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const lang = getState().lang

  useEffect(() => {
    const canvas = ref.current!
    const scale = Math.min(1, (canvas.clientWidth * (window.devicePixelRatio || 1)) / W) || 0.75
    canvas.width = Math.round(W * scale)
    canvas.height = Math.round(H * scale)
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    const entry: Entry = { ctx, id, visible: true }
    paint(entry, 1.2)
    if (reducedMotion()) return

    const io = new IntersectionObserver(([e]) => {
      entry.visible = e.isIntersecting
    })
    io.observe(canvas)
    entries.add(entry)
    if (!raf) raf = requestAnimationFrame(loop)
    return () => {
      io.disconnect()
      entries.delete(entry)
    }
  }, [id, lang])

  return <canvas ref={ref} className="tile-canvas" aria-hidden="true" />
}
