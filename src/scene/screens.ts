import { cv, tr, type Lang } from '../data/cv'
import { sectionById, type SectionId } from '../sections'

/**
 * 2D canvas painters for every screen in the room. Each monitor owns a canvas
 * that becomes a CanvasTexture; painting on a canvas (instead of 3D text)
 * keeps the scene cheap and lets the page's web fonts render inside 3D.
 */

export type Tally = 'pgm' | 'pvw' | null
export interface PaintCtx {
  ctx: CanvasRenderingContext2D
  w: number
  h: number
  t: number
  lang: Lang
  tally: Tally
}

export const F = {
  cond: '"Barlow Condensed", "Arial Narrow", sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
  sans: '"Space Grotesk", system-ui, sans-serif',
}

const RED = '#ff2b2b'
const GREEN = '#1fe06a'
const AMBER = '#ffb000'

// Deterministic pseudo-random so the noise doesn't need an allocation per frame.
const rand = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function scanlines(p: PaintCtx, alpha = 0.18) {
  const { ctx, w, h } = p
  ctx.fillStyle = `rgba(0,0,0,${alpha})`
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1)
}

function vignette(p: PaintCtx) {
  const { ctx, w, h } = p
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, w * 0.7)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, 'rgba(0,0,0,0.55)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

function grain(p: PaintCtx, amount = 70, alpha = 0.06) {
  const { ctx, w, h, t } = p
  const seed = Math.floor(t * 24)
  ctx.fillStyle = `rgba(255,255,255,${alpha})`
  for (let i = 0; i < amount; i++) {
    ctx.fillRect(rand(seed + i) * w, rand(seed * 3 + i * 7) * h, 2, 1)
  }
}

/** Under-monitor display: the label strip real multiviewers draw under each source. */
function umd(p: PaintCtx, num: number | string, name: string) {
  const { ctx, w, h, tally } = p
  const bh = Math.round(h * 0.12)
  ctx.fillStyle = 'rgba(0,0,0,0.86)'
  ctx.fillRect(0, h - bh, w, bh)
  const color = tally === 'pgm' ? RED : tally === 'pvw' ? GREEN : '#2b3138'
  ctx.fillStyle = color
  ctx.fillRect(0, h - bh, bh * 1.25, bh)
  ctx.fillStyle = tally ? '#000' : '#cfd6de'
  ctx.font = `700 ${bh * 0.62}px ${F.cond}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(num), (bh * 1.25) / 2, h - bh / 2 + 1)
  ctx.textAlign = 'left'
  ctx.fillStyle = tally === 'pgm' ? '#ff6b6b' : tally === 'pvw' ? '#6dffa7' : '#e8edf2'
  ctx.fillText(name.toUpperCase(), bh * 1.25 + 12, h - bh / 2 + 1)
  // Tally border around the whole source.
  if (tally) {
    ctx.strokeStyle = color
    ctx.lineWidth = Math.max(4, w * 0.012)
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth)
  }
}

/** Two little audio meters on the right edge of a source. */
function meters(p: PaintCtx, seed = 0) {
  const { ctx, w, h, t } = p
  const bh = h * 0.12
  const mh = h - bh - 20
  for (let c = 0; c < 2; c++) {
    const x = w - 22 + c * 9
    const lvl = 0.45 + 0.35 * Math.abs(Math.sin(t * (3.1 + c) + seed)) + 0.15 * rand(Math.floor(t * 18) + c + seed)
    ctx.fillStyle = 'rgba(255,255,255,0.07)'
    ctx.fillRect(x, 10, 6, mh)
    const segs = 22
    const lit = Math.round(segs * Math.min(1, lvl))
    for (let i = 0; i < lit; i++) {
      const y = 10 + mh - (i + 1) * (mh / segs)
      ctx.fillStyle = i > segs * 0.85 ? RED : i > segs * 0.65 ? AMBER : GREEN
      ctx.fillRect(x, y + 1, 6, mh / segs - 2)
    }
  }
}

function clockTc(t: number) {
  const d = new Date()
  const f = Math.floor((t * 30) % 30)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}:${pad(f)}`
}

function titleLabel(p: PaintCtx, text: string, x: number, y: number, size: number, color = '#fff') {
  const { ctx } = p
  ctx.font = `700 ${size}px ${F.cond}`
  ctx.fillStyle = color
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(text, x, y)
}

/* ------------------------------------------------------------------ */
/* Source painters                                                     */
/* ------------------------------------------------------------------ */

const sourcePainters: Record<SectionId, (p: PaintCtx) => void> = {
  profile(p) {
    const { ctx, w, h, t } = p
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, '#1d1407')
    g.addColorStop(1, '#050505')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    // Camera framing guides.
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 1
    for (const fx of [1 / 3, 2 / 3]) {
      ctx.beginPath()
      ctx.moveTo(w * fx, 0)
      ctx.lineTo(w * fx, h)
      ctx.stroke()
    }
    // Subject: a stylised head-and-shoulders silhouette, gently breathing.
    const cx = w * 0.62
    const bob = Math.sin(t * 1.3) * 2
    ctx.fillStyle = '#2a2014'
    ctx.beginPath()
    ctx.ellipse(cx, h * 0.98 + bob, w * 0.2, h * 0.34, 0, Math.PI, 0)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx, h * 0.42 + bob, h * 0.17, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = AMBER
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = AMBER
    ctx.font = `700 ${h * 0.14}px ${F.cond}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(cv.person.initials, cx, h * 0.43 + bob)
    // REC dot.
    if (Math.floor(t * 1.5) % 2 === 0) {
      ctx.fillStyle = RED
      ctx.beginPath()
      ctx.arc(22, 22, 7, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.textAlign = 'left'
    ctx.fillStyle = '#fff'
    ctx.font = `600 ${h * 0.065}px ${F.mono}`
    ctx.fillText('REC', 36, 23)
    // Lower third.
    const ly = h * 0.6
    ctx.fillStyle = 'rgba(0,0,0,0.78)'
    ctx.fillRect(16, ly, w * 0.52, h * 0.19)
    ctx.fillStyle = AMBER
    ctx.fillRect(16, ly, 5, h * 0.19)
    titleLabel(p, cv.person.shortName.toUpperCase(), 30, ly + h * 0.09, h * 0.085)
    ctx.font = `500 ${h * 0.045}px ${F.sans}`
    ctx.fillStyle = '#d9c7a4'
    ctx.fillText('Media Tech · Automation · AI', 30, ly + h * 0.155)
    meters(p, 1)
    vignette(p)
    scanlines(p)
    umd(p, 1, `CAM 1 · ${tr(sectionById('profile').label, p.lang)}`)
  },

  experience(p) {
    const { ctx, w, h, t, lang } = p
    ctx.fillStyle = '#07090c'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#12161c'
    ctx.fillRect(0, 0, w, h * 0.13)
    titleLabel(p, 'PLAYLIST · MCR-01', 14, h * 0.095, h * 0.07, '#9fb0c3')
    ctx.fillStyle = RED
    ctx.font = `600 ${h * 0.055}px ${F.mono}`
    ctx.textAlign = 'right'
    ctx.fillText(clockTc(t), w - 34, h * 0.09)
    ctx.textAlign = 'left'
    const rowH = h * 0.12
    cv.experience.slice(0, 6).forEach((e, i) => {
      const y = h * 0.15 + i * rowH
      const live = e.end === null
      ctx.fillStyle = live ? 'rgba(255,43,43,0.22)' : i % 2 ? '#0c1015' : '#0a0d11'
      ctx.fillRect(8, y, w - 40, rowH - 3)
      if (live) {
        ctx.fillStyle = RED
        ctx.fillRect(8, y, 4, rowH - 3)
        // progress bar
        const prog = (t * 0.05) % 1
        ctx.fillStyle = 'rgba(255,43,43,0.55)'
        ctx.fillRect(12, y + rowH - 6, (w - 44) * prog, 3)
      }
      ctx.font = `500 ${rowH * 0.36}px ${F.mono}`
      ctx.fillStyle = live ? '#ff8a8a' : '#6d7a89'
      ctx.fillText(e.start.replace('-', '/'), 20, y + rowH * 0.62)
      ctx.font = `700 ${rowH * 0.46}px ${F.cond}`
      ctx.fillStyle = live ? '#fff' : '#c4ccd6'
      const label = `${tr(e.role, lang)} — ${e.org}`
      ctx.fillText(label.length > 44 ? label.slice(0, 43) + '…' : label, w * 0.2, y + rowH * 0.64)
    })
    meters(p, 2)
    scanlines(p, 0.12)
    umd(p, sectionById('experience').key, `PLAYOUT · ${tr(sectionById('experience').label, lang)}`)
  },

  live(p) {
    const { ctx, w, h, t, lang } = p
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#120414')
    g.addColorStop(1, '#030103')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    // Stage light beams sweeping.
    ctx.globalCompositeOperation = 'lighter'
    const beams = ['#ff2b8f', '#3a7bff', '#ff2b8f', '#8b5bff', '#3a7bff']
    beams.forEach((c, i) => {
      const bx = (w / (beams.length + 1)) * (i + 1)
      const ang = Math.sin(t * 0.9 + i * 1.7) * 0.5
      ctx.save()
      ctx.translate(bx, -10)
      ctx.rotate(ang)
      const bg = ctx.createLinearGradient(0, 0, 0, h)
      bg.addColorStop(0, c + 'aa')
      bg.addColorStop(1, c + '00')
      ctx.fillStyle = bg
      ctx.beginPath()
      ctx.moveTo(-6, 0)
      ctx.lineTo(6, 0)
      ctx.lineTo(60, h)
      ctx.lineTo(-60, h)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    })
    ctx.globalCompositeOperation = 'source-over'
    // Crowd silhouettes.
    ctx.fillStyle = '#000'
    for (let i = 0; i < 40; i++) {
      const x = (i / 40) * w
      const bump = Math.abs(Math.sin(t * 4 + i * 1.3)) * 6 * (i % 3 === 0 ? 1 : 0.3)
      ctx.beginPath()
      ctx.arc(x + 6, h * 0.8 - bump, 9 + (i % 4), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillRect(0, h * 0.8, w, h * 0.2)
    // LIVE bug + scoreboard.
    ctx.fillStyle = RED
    ctx.fillRect(14, 14, 64, 26)
    ctx.fillStyle = '#fff'
    ctx.font = `700 20px ${F.cond}`
    ctx.fillText('● LIVE', 20, 34)
    ctx.fillStyle = 'rgba(0,0,0,0.75)'
    ctx.fillRect(w - 214, 14, 176, 26)
    ctx.fillStyle = '#ffd6ec'
    ctx.font = `600 17px ${F.cond}`
    ctx.fillText(lang === 'es' ? 'GRAN FINAL · LVP' : 'GRAND FINAL · LVP', w - 204, 33)
    titleLabel(p, 'COSTA SALGUERO · SAN LORENZO', 18, h * 0.72, h * 0.07, '#fff')
    grain(p)
    scanlines(p)
    umd(p, sectionById('live').key, `OB VAN · ${tr(sectionById('live').label, lang)}`)
  },

  projects(p) {
    const { ctx, w, h, t, lang } = p
    ctx.fillStyle = '#060a0e'
    ctx.fillRect(0, 0, w, h)
    const files = ['lab_automation.gs', 'companion_deck.json', 'delivery_opt.py', 'chatbot_flow.ai', 'ferrari_vclip.mov', 'qepd_vclip.mov']
    const cols = 3
    const cw = (w - 40) / cols
    const ch = (h * 0.8) / 2
    files.forEach((f, i) => {
      const x = 10 + (i % cols) * cw
      const y = 10 + Math.floor(i / cols) * ch
      const sel = Math.floor(t * 0.8) % files.length === i
      ctx.fillStyle = sel ? '#0d2a36' : '#0c1117'
      ctx.fillRect(x, y, cw - 8, ch - 8)
      // thumbnail
      const hue = (i * 57) % 360
      const tg = ctx.createLinearGradient(x, y, x + cw, y + ch)
      tg.addColorStop(0, `hsl(${hue} 70% 35%)`)
      tg.addColorStop(1, `hsl(${(hue + 60) % 360} 70% 12%)`)
      ctx.fillStyle = tg
      ctx.fillRect(x + 6, y + 6, cw - 20, ch * 0.55)
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(x + cw - 64, y + ch * 0.55 - 12, 48, 16)
      ctx.fillStyle = '#e8edf2'
      ctx.font = `500 11px ${F.mono}`
      ctx.fillText(`00:0${i}:${(10 + i * 7) % 60}`, x + cw - 60, y + ch * 0.55)
      ctx.fillStyle = sel ? '#6fe3ff' : '#9aa6b4'
      ctx.font = `500 13px ${F.mono}`
      ctx.fillText(f, x + 8, y + ch * 0.8)
      if (sel) {
        ctx.strokeStyle = '#35d0ff'
        ctx.lineWidth = 2
        ctx.strokeRect(x + 1, y + 1, cw - 10, ch - 10)
      }
    })
    meters(p, 4)
    scanlines(p, 0.1)
    umd(p, sectionById('projects').key, `MEDIA BIN · ${tr(sectionById('projects').label, lang)}`)
  },

  skills(p) {
    const { ctx, w, h, t, lang } = p
    ctx.fillStyle = '#08070d'
    ctx.fillRect(0, 0, w, h)
    const units = cv.skills.length
    const uh = (h * 0.82) / units
    cv.skills.forEach((s, i) => {
      const y = 8 + i * uh
      ctx.fillStyle = '#16141f'
      ctx.fillRect(10, y, w - 44, uh - 6)
      ctx.fillStyle = '#2a2638'
      ctx.beginPath()
      ctx.arc(20, y + uh / 2 - 3, 3, 0, Math.PI * 2)
      ctx.arc(w - 44, y + uh / 2 - 3, 3, 0, Math.PI * 2)
      ctx.fill()
      titleLabel(p, tr(s.group, lang).toUpperCase(), 34, y + uh * 0.62, uh * 0.42, '#d7d0ff')
      // Status LEDs, right-aligned so long group names never run into them.
      for (let l = 0; l < 7; l++) {
        const on = rand(Math.floor(t * 6) + l * 13 + i * 31) > 0.35
        ctx.fillStyle = on ? (l % 4 === 0 ? AMBER : '#8b7bff') : '#221f2e'
        ctx.fillRect(w - 60 - (7 - l) * 14, y + uh / 2 - 7, 8, 5)
      }
    })
    meters(p, 5)
    scanlines(p, 0.1)
    umd(p, sectionById('skills').key, `RACK · ${tr(sectionById('skills').label, lang)}`)
  },

  education(p) {
    const { ctx, w, h, t, lang } = p
    ctx.fillStyle = '#040b07'
    ctx.fillRect(0, 0, w, h)
    titleLabel(p, 'UTN', 22, h * 0.3, h * 0.2, '#fff')
    titleLabel(p, 'UNLa', w * 0.36, h * 0.3, h * 0.2, '#9cf5bf')
    ctx.font = `500 ${h * 0.05}px ${F.sans}`
    ctx.fillStyle = '#9fb7a8'
    ctx.fillText(lang === 'es' ? 'Tec. Univ. en Programación' : 'Programming degree', 24, h * 0.4)
    ctx.fillText(lang === 'es' ? 'Téc. Univ. en Audiovisión ✓' : 'Audiovisual degree ✓', w * 0.365, h * 0.4)
    // progress towards Dec 2026
    const start = new Date(2024, 2, 1).getTime()
    const end = new Date(2026, 11, 20).getTime()
    const pct = Math.min(1, Math.max(0, (Date.now() - start) / (end - start)))
    const bx = 24
    const by = h * 0.55
    const bw = w - 80
    ctx.fillStyle = '#10261a'
    ctx.fillRect(bx, by, bw, 18)
    ctx.fillStyle = GREEN
    ctx.fillRect(bx, by, bw * pct, 18)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillRect(bx + bw * pct - 2 + Math.sin(t * 3) * 2, by - 3, 3, 24)
    ctx.font = `600 ${h * 0.05}px ${F.mono}`
    ctx.fillStyle = '#d6ffe6'
    ctx.fillText(`TUP ${Math.round(pct * 100)}% → DEC 2026`, bx, by + 44)
    ctx.fillStyle = '#6f8f7c'
    ctx.fillText('+ Cursor × Python · Santander', bx, by + 74)
    meters(p, 6)
    scanlines(p, 0.12)
    umd(p, sectionById('education').key, `ARCHIVE · ${tr(sectionById('education').label, lang)}`)
  },

  terminal(p) {
    const { ctx, w, h, t, lang } = p
    ctx.fillStyle = '#020604'
    ctx.fillRect(0, 0, w, h)
    const lines = [
      '$ whoami',
      'ariel.grela  # broadcast ⟷ code',
      '$ python automate_reports.py',
      '✔ 60 events parsed · 0 insertion errors',
      '$ git log --oneline | head -3',
      'a1f3c9e feat: disney streaming latam',
      '7c21d04 feat: espn master control',
      '3be9a10 feat: lvp esports finals',
      '$ n8n run workflow --qc',
      '✔ done',
    ]
    const speed = 14
    const total = lines.join('\n').length
    const shown = Math.floor((t * speed) % (total + 60))
    let count = 0
    ctx.font = `500 ${h * 0.058}px ${F.mono}`
    const lh = h * 0.078
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]
      const remain = shown - count
      if (remain <= 0) break
      const txt = l.slice(0, remain)
      ctx.fillStyle = l.startsWith('$') ? '#39ff88' : l.startsWith('✔') ? '#a6ffcb' : '#6fae86'
      ctx.fillText(txt, 16, 26 + i * lh)
      count += l.length + 1
      if (remain < l.length + 1 && Math.floor(t * 2) % 2 === 0) {
        ctx.fillRect(16 + ctx.measureText(txt).width + 2, 26 + i * lh - h * 0.05, 9, h * 0.06)
      }
    }
    ctx.fillStyle = 'rgba(57,255,136,0.05)'
    ctx.fillRect(0, 0, w, h)
    scanlines(p, 0.2)
    umd(p, sectionById('terminal').key, `DEV · ${tr(sectionById('terminal').label, lang)}`)
  },

  contact(p) {
    const { ctx, w, h, t, lang } = p
    ctx.fillStyle = '#060606'
    ctx.fillRect(0, 0, w, h)
    const pulse = 0.5 + 0.5 * Math.sin(t * 3)
    ctx.strokeStyle = `rgba(255,255,255,${0.15 + pulse * 0.25})`
    ctx.lineWidth = 2
    for (let r = 0; r < 3; r++) {
      ctx.beginPath()
      ctx.arc(w * 0.82, h * 0.38, 18 + r * 16 + pulse * 6, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(w * 0.82, h * 0.38, 12, 0, Math.PI * 2)
    ctx.fill()
    titleLabel(p, lang === 'es' ? 'HABLEMOS' : "LET'S TALK", 22, h * 0.3, h * 0.17, '#fff')
    ctx.font = `500 ${h * 0.058}px ${F.mono}`
    ctx.fillStyle = '#cfd6de'
    ctx.fillText(cv.person.email, 24, h * 0.5)
    ctx.fillStyle = '#8a94a3'
    ctx.fillText('in/arielgrela', 24, h * 0.61)
    ctx.fillText('github.com/AriGrela', 24, h * 0.72)
    scanlines(p, 0.12)
    umd(p, sectionById('contact').key, `RETURN · ${tr(sectionById('contact').label, lang)}`)
  },
}

export function paintSource(id: SectionId, p: PaintCtx) {
  p.ctx.save()
  sourcePainters[id](p)
  p.ctx.restore()
}

/* ------------------------------------------------------------------ */
/* Program slate, preview bars and decorative wall screens             */
/* ------------------------------------------------------------------ */

export function paintSlate(p: PaintCtx) {
  const { ctx, w, h, t, lang } = p
  ctx.fillStyle = '#030303'
  ctx.fillRect(0, 0, w, h)
  const g = ctx.createRadialGradient(w * 0.3, h * 0.4, 10, w * 0.3, h * 0.4, w * 0.8)
  g.addColorStop(0, 'rgba(255,43,43,0.14)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  // SMPTE strip.
  const bars = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0']
  bars.forEach((c, i) => {
    ctx.fillStyle = c
    ctx.fillRect((w / bars.length) * i, 0, w / bars.length + 1, h * 0.025)
  })
  ctx.fillStyle = '#8a94a3'
  ctx.font = `600 ${h * 0.034}px ${F.mono}`
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('MCR-01 · PROGRAM', w * 0.06, h * 0.13)
  ctx.textAlign = 'right'
  ctx.fillStyle = RED
  ctx.fillText(clockTc(t), w * 0.94, h * 0.13)
  ctx.textAlign = 'left'

  ctx.fillStyle = '#fff'
  ctx.font = `700 ${h * 0.2}px ${F.cond}`
  ctx.fillText('ARIEL', w * 0.06, h * 0.42)
  ctx.fillText('GRELA', w * 0.06, h * 0.6)
  ctx.fillStyle = RED
  ctx.fillRect(w * 0.06, h * 0.65, w * 0.08, h * 0.012)
  ctx.font = `500 ${h * 0.042}px ${F.sans}`
  ctx.fillStyle = '#d6dde5'
  ctx.fillText('Media Technology · Streaming Operations', w * 0.06, h * 0.73)
  ctx.fillText(lang === 'es' ? 'Implementación · Automatización · IA aplicada' : 'Implementation · Automation · Applied AI', w * 0.06, h * 0.79)
  ctx.font = `500 ${h * 0.032}px ${F.mono}`
  ctx.fillStyle = '#7d8896'
  ctx.fillText('DISNEY STREAMING · ESPN · LVP  —  BUENOS AIRES', w * 0.06, h * 0.88)

  // Tally lamp.
  const on = 0.6 + 0.4 * Math.sin(t * 2.4)
  ctx.fillStyle = `rgba(255,43,43,${on})`
  ctx.beginPath()
  ctx.arc(w * 0.86, h * 0.45, h * 0.09, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = `700 ${h * 0.05}px ${F.cond}`
  ctx.textAlign = 'center'
  ctx.fillText('ON AIR', w * 0.86, h * 0.62)
  ctx.textAlign = 'left'
  grain(p, 120, 0.04)
  scanlines(p, 0.14)
  umd(p, 'PGM', lang === 'es' ? 'PROGRAMA' : 'PROGRAM')
}

export function paintBars(p: PaintCtx) {
  const { ctx, w, h, t, lang } = p
  const top = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0']
  const mid = ['#0000c0', '#131313', '#c000c0', '#131313', '#00c0c0', '#131313', '#c0c0c0']
  const bw = w / 7
  top.forEach((c, i) => {
    ctx.fillStyle = c
    ctx.fillRect(i * bw, 0, bw + 1, h * 0.62)
  })
  mid.forEach((c, i) => {
    ctx.fillStyle = c
    ctx.fillRect(i * bw, h * 0.62, bw + 1, h * 0.08)
  })
  const low = ['#00214c', '#ffffff', '#32006a', '#131313', '#090909', '#131313', '#1d1d1d', '#131313']
  const lw = [1.25, 1.25, 1.25, 1.25, 0.33, 0.33, 0.33, 1]
  let x = 0
  low.forEach((c, i) => {
    const ww = bw * lw[i]
    ctx.fillStyle = c
    ctx.fillRect(x, h * 0.7, ww + 1, h * 0.3)
    x += ww
  })
  // Ident box.
  ctx.fillStyle = 'rgba(0,0,0,0.85)'
  ctx.fillRect(w * 0.26, h * 0.26, w * 0.48, h * 0.2)
  ctx.fillStyle = '#fff'
  ctx.font = `700 ${h * 0.085}px ${F.cond}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('ARIEL GRELA · MCR-01', w / 2, h * 0.33)
  ctx.font = `500 ${h * 0.04}px ${F.mono}`
  ctx.fillStyle = '#aab4c0'
  ctx.fillText(`1 kHz · -18 dBFS · ${clockTc(t)}`, w / 2, h * 0.41)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  umd(p, 'PVW', lang === 'es' ? 'PREVIEW · pasá el mouse por un monitor' : 'PREVIEW · hover a monitor')
}

export type DecoId = 'scope' | 'vector' | 'clocks' | 'audio' | 'schedule' | 'regions'

const decoPainters: Record<DecoId, (p: PaintCtx) => void> = {
  scope(p) {
    const { ctx, w, h, t } = p
    ctx.fillStyle = '#010401'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(80,255,120,0.15)'
    ctx.lineWidth = 1
    for (let i = 1; i < 5; i++) {
      ctx.beginPath()
      ctx.moveTo(0, (h * 0.85 * i) / 5)
      ctx.lineTo(w, (h * 0.85 * i) / 5)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(90,255,140,0.22)'
    for (let x = 0; x < w; x += 2) {
      for (let k = 0; k < 4; k++) {
        const v = 0.5 + 0.3 * Math.sin(x * 0.03 + t * 2 + k) * Math.cos(x * 0.011 - t + k * 2) + (rand(x + k + Math.floor(t * 10)) - 0.5) * 0.12
        ctx.fillRect(x, h * 0.85 * (1 - v), 2, 2)
      }
    }
    umd(p, 'WFM', 'WAVEFORM · LATAM')
  },
  vector(p) {
    const { ctx, w, h, t } = p
    ctx.fillStyle = '#010102'
    ctx.fillRect(0, 0, w, h)
    const cx = w / 2
    const cy = h * 0.44
    const r = h * 0.36
    ctx.strokeStyle = 'rgba(120,200,255,0.25)'
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx - r, cy)
    ctx.lineTo(cx + r, cy)
    ctx.moveTo(cx, cy - r)
    ctx.lineTo(cx, cy + r)
    ctx.stroke()
    ctx.fillStyle = 'rgba(140,255,200,0.5)'
    for (let i = 0; i < 300; i++) {
      const a = rand(i) * Math.PI * 2 + t * 0.4
      const d = r * (0.2 + 0.6 * rand(i * 3 + Math.floor(t * 8)))
      ctx.fillRect(cx + Math.cos(a) * d * 0.8, cy + Math.sin(a) * d * 0.6, 2, 2)
    }
    umd(p, 'VEC', 'VECTORSCOPE')
  },
  clocks(p) {
    const { ctx, w, h } = p
    ctx.fillStyle = '#050505'
    ctx.fillRect(0, 0, w, h)
    const zones: [string, string][] = [
      ['BUE', 'America/Argentina/Buenos_Aires'],
      ['MEX', 'America/Mexico_City'],
      ['NYC', 'America/New_York'],
      ['UTC', 'UTC'],
    ]
    zones.forEach(([name, tz], i) => {
      const x = 16 + (i % 2) * (w / 2)
      const y = h * 0.34 + Math.floor(i / 2) * h * 0.36
      let time = '--:--:--'
      try {
        time = new Date().toLocaleTimeString('en-GB', { timeZone: tz, hour12: false })
      } catch {
        /* unknown tz */
      }
      ctx.fillStyle = '#ff3b3b'
      ctx.font = `600 ${h * 0.14}px ${F.mono}`
      ctx.fillText(time, x, y)
      ctx.fillStyle = '#8a94a3'
      ctx.font = `700 ${h * 0.08}px ${F.cond}`
      ctx.fillText(name, x, y + h * 0.1)
    })
    umd(p, 'CLK', 'WORLD CLOCK')
  },
  audio(p) {
    const { ctx, w, h, t } = p
    ctx.fillStyle = '#050505'
    ctx.fillRect(0, 0, w, h)
    const ch = 8
    const mh = h * 0.72
    for (let c = 0; c < ch; c++) {
      const x = 20 + c * ((w - 40) / ch)
      const lvl = 0.3 + 0.55 * Math.abs(Math.sin(t * (2 + c * 0.37) + c)) + 0.1 * rand(Math.floor(t * 20) + c)
      const segs = 24
      for (let i = 0; i < segs; i++) {
        const on = i < segs * Math.min(1, lvl)
        ctx.fillStyle = on ? (i > segs * 0.85 ? RED : i > segs * 0.65 ? AMBER : GREEN) : '#141414'
        ctx.fillRect(x, 10 + mh - (i + 1) * (mh / segs), (w - 40) / ch - 10, mh / segs - 2)
      }
    }
    umd(p, 'AUD', 'AUDIO 1–8')
  },
  schedule(p) {
    const { ctx, w, h, t, lang } = p
    ctx.fillStyle = '#07080a'
    ctx.fillRect(0, 0, w, h)
    titleLabel(p, lang === 'es' ? '60+ EVENTOS / MES' : '60+ EVENTS / MONTH', 14, h * 0.17, h * 0.12, '#fff')
    const items = ['LIVE · ESPN', 'BREAK 02', 'BUMPER', 'LIVE · YT', 'SIGN-OFF', 'BREAK 03', 'LIVE · MX']
    const off = Math.floor(t * 0.7)
    for (let i = 0; i < 5; i++) {
      const it = items[(off + i) % items.length]
      const y = h * 0.27 + i * h * 0.11
      ctx.fillStyle = i === 0 ? 'rgba(255,43,43,0.25)' : '#0e1116'
      ctx.fillRect(12, y, w - 24, h * 0.095)
      ctx.fillStyle = i === 0 ? '#ff8a8a' : '#aab4c0'
      ctx.font = `500 ${h * 0.055}px ${F.mono}`
      ctx.fillText(`${String(18 + i).padStart(2, '0')}:${String((off * 7 + i * 13) % 60).padStart(2, '0')}  ${it}`, 20, y + h * 0.068)
    }
    umd(p, 'SCH', 'SCHEDULE')
  },
  regions(p) {
    const { ctx, w, h, t, lang } = p
    ctx.fillStyle = '#04060a'
    ctx.fillRect(0, 0, w, h)
    const feeds = lang === 'es' ? ['LATAM', 'CENTROAMÉRICA', 'MÉXICO'] : ['LATAM', 'CENTRAL AMERICA', 'MEXICO']
    feeds.forEach((f, i) => {
      const y = h * 0.16 + i * h * 0.24
      ctx.fillStyle = '#0c121b'
      ctx.fillRect(12, y, w - 24, h * 0.2)
      const ok = Math.floor(t * 2 + i) % 7 !== 0
      ctx.fillStyle = ok ? GREEN : AMBER
      ctx.beginPath()
      ctx.arc(30, y + h * 0.1, 7, 0, Math.PI * 2)
      ctx.fill()
      titleLabel(p, `FEED ${f}`, 48, y + h * 0.13, h * 0.09, '#dfe6ee')
      ctx.fillStyle = '#6d7a89'
      ctx.font = `500 ${h * 0.05}px ${F.mono}`
      ctx.textAlign = 'right'
      ctx.fillText(ok ? 'OK' : 'QC', w - 22, y + h * 0.125)
      ctx.textAlign = 'left'
    })
    umd(p, 'MON', 'SIGNAL MONITOR')
  },
}

export function paintDeco(id: DecoId, p: PaintCtx) {
  p.ctx.save()
  decoPainters[id](p)
  p.ctx.restore()
}

/** Label for a switcher key cap (drawn on its top face). */
export function paintKeyCap(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  num: string,
  label: string,
  lit: 'pgm' | 'pvw' | 'hover' | null,
  accent: string,
) {
  const bg = lit === 'pgm' ? '#ff2b2b' : lit === 'pvw' ? '#1fe06a' : lit === 'hover' ? '#3a4350' : '#1a1f26'
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = lit ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)'
  ctx.fillRect(0, 0, w, h * 0.12)
  ctx.fillStyle = lit === 'pgm' || lit === 'pvw' ? '#000' : accent
  ctx.fillRect(w * 0.1, h * 0.14, w * 0.8, h * 0.05)
  ctx.fillStyle = lit === 'pgm' || lit === 'pvw' ? '#000' : '#e8edf2'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `700 ${h * 0.36}px ${F.cond}`
  ctx.fillText(num, w / 2, h * 0.44)
  ctx.font = `700 ${h * 0.16}px ${F.cond}`
  ctx.fillText(label.toUpperCase(), w / 2, h * 0.76)
}
