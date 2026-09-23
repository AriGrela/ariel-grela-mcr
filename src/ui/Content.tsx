import { useState } from 'react'
import { cv, duration, fmtMonth, tcMonth, tr } from '../data/cv'
import { useT } from '../i18n'
import type { SectionId } from '../sections'
import { CopyEmail, CtaRow, Icon, cvHref } from './common'
import Terminal from './Terminal'

export function SectionContent({ id }: { id: SectionId }) {
  switch (id) {
    case 'profile':
      return <Profile />
    case 'experience':
      return <Experience />
    case 'live':
      return <Live />
    case 'projects':
      return <Projects />
    case 'skills':
      return <Skills />
    case 'education':
      return <Education />
    case 'terminal':
      return <Terminal />
    case 'contact':
      return <Contact />
  }
}

function Profile() {
  const { t, lang } = useT()
  return (
    <div className="sec sec-profile">
      <div className="profile-hero">
        <div className="avatar" aria-hidden="true">
          <span>{cv.person.initials}</span>
          <i className="avatar-rec">● REC</i>
        </div>
        <div>
          <p className="eyebrow">{tr(cv.person.location, lang)}</p>
          <h3 className="display">{cv.person.name}</h3>
          <p className="lead">{tr(cv.person.title, lang)}</p>
        </div>
      </div>

      <ul className="stat-grid">
        {cv.stats.map((s) => (
          <li key={s.value}>
            <b>{s.value}</b>
            <span>{tr(s.label, lang)}</span>
          </li>
        ))}
      </ul>

      <div className="prose">
        {cv.about[lang].map((p) => (
          <p key={p.slice(0, 24)}>{p}</p>
        ))}
      </div>

      <div className="callout">
        <p className="eyebrow">{t.seeking}</p>
        <p>{tr(cv.seeking, lang)}</p>
      </div>

      <h4 className="sub">{t.competencies}</h4>
      <ul className="comp-grid">
        {cv.competencies.map((c) => (
          <li key={c.title.en}>
            <b>{tr(c.title, lang)}</b>
            <span>{tr(c.text, lang)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Experience() {
  const { t, lang } = useT()
  const [open, setOpen] = useState<string | null>(cv.experience[0].id)
  return (
    <div className="sec sec-exp">
      <div className="rundown">
        <div className="rd-row rd-head" aria-hidden="true">
          <span>{t.col.n}</span>
          <span>{t.col.in}</span>
          <span>{t.col.out}</span>
          <span className="hide-sm">
            {t.col.dur}
          </span>
          <span>{t.col.event}</span>
          <span>{t.col.status}</span>
        </div>
        {cv.experience.map((e, i) => {
          const live = e.end === null
          const isOpen = open === e.id
          return (
            <div key={e.id} className={`rd-item ${live ? 'live' : ''} ${isOpen ? 'open' : ''}`}>
              <button
                type="button"
                className="rd-row"
               
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : e.id)}
              >
                <span className="rd-n">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="rd-tc">
                  {tcMonth(e.start, e.yearOnly)}
                </span>
                <span className="rd-tc">
                  {live ? '──/────' : tcMonth(e.end, e.yearOnly)}
                </span>
                <span className="rd-tc hide-sm">
                  {duration(e.start, e.end, lang)}
                </span>
                <span className="rd-title">
                  <b>{tr(e.role, lang)}</b>
                  <span>
                    {e.org}
                    {e.via ? ` · ${tr(e.via, lang)}` : ''}
                  </span>
                </span>
                <span className={`rd-status ${live ? 'on' : ''}`}>
                  {live ? `● ${t.current}` : t.played}
                </span>
              </button>
              {isOpen && (
                <div className="rd-detail">
                  <p className="rd-when">
                    {fmtMonth(e.start, lang, e.yearOnly)} — {fmtMonth(e.end, lang, e.yearOnly)} · {e.location}
                  </p>
                  <ul>
                    {e.bullets[lang].map((b) => (
                      <li key={b.slice(0, 30)}>{b}</li>
                    ))}
                  </ul>
                  <div className="chips">
                    {e.tags.map((tag) => (
                      <span key={tag} className="chip">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Live() {
  const { t, lang } = useT()
  const onsite = cv.events.filter((e) => e.mode === 'onsite')
  const online = cv.events.filter((e) => e.mode === 'online')
  return (
    <div className="sec sec-live">
      <p className="lead">{t.liveSub}</p>
      <div className="event-feature">
        {onsite.map((e) => (
          <article key={e.id} className="event big">
            <div className="event-top">
              <span className="badge badge-red">● {t.onsite}</span>
              <span className="event-game">{e.game}</span>
              <span className="event-date">{tr(e.date, lang)}</span>
            </div>
            <h3>{tr(e.title, lang)}</h3>
            <p className="event-venue">{tr(e.venue, lang)}</p>
            <ul>
              {e.facts[lang].map((f) => (
                <li key={f.slice(0, 20)}>{f}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <div className="event-grid">
        {online.map((e) => (
          <article key={e.id} className="event">
            <div className="event-top">
              <span className="badge badge-blue">{t.online}</span>
              <span className="event-game">{e.game}</span>
            </div>
            <h3>{tr(e.title, lang)}</h3>
            <p className="event-venue">
              {tr(e.venue, lang)} · {tr(e.date, lang)}
            </p>
            <p className="event-fact">{e.facts[lang][0]}</p>
          </article>
        ))}
      </div>
    </div>
  )
}

function Projects() {
  const { t, lang } = useT()
  return (
    <div className="sec sec-projects">
      <div className="proj-grid">
        {cv.projects.map((p, i) => (
          <article key={p.id} className="proj">
            <div className="proj-thumb" style={{ ['--h' as string]: `${(i * 57 + 190) % 360}` }} aria-hidden="true">
              <span className="proj-tc">CLIP {String(i + 1).padStart(3, '0')}</span>
            </div>
            <p className="eyebrow">{tr(p.kind, lang)}</p>
            <h3>{tr(p.title, lang)}</h3>
            <dl>
              <dt>{t.problem}</dt>
              <dd>{tr(p.problem, lang)}</dd>
              <dt>{t.solution}</dt>
              <dd>{tr(p.solution, lang)}</dd>
              {p.result && (
                <>
                  <dt>{t.result}</dt>
                  <dd>{tr(p.result, lang)}</dd>
                </>
              )}
            </dl>
            <div className="chips">
              {p.stack.map((s) => (
                <span key={s} className="chip">
                  {s}
                </span>
              ))}
            </div>
            {p.url && (
              <a className="link" href={p.url} target="_blank" rel="noreferrer">
                GitHub <Icon name="arrow" size={14} />
              </a>
            )}
          </article>
        ))}
      </div>

      <h4 className="sub">{t.mediaBin}</h4>
      <p className="muted">{t.mediaBinSub}</p>
      <div className="clip-grid">
        {cv.clips.map((c) => {
          const inner = (
            <>
              <div className="clip-thumb" aria-hidden="true">
                {ytId(c.url) && <img src={`https://i.ytimg.com/vi/${ytId(c.url)}/mqdefault.jpg`} alt="" loading="lazy" />}
                <Icon name="play" size={28} />
                <span className="clip-tc">{c.year}</span>
              </div>
              <div className="clip-meta">
                <b>{c.title}</b>
                <span>
                  {tr(c.kind, lang)} · {tr(c.role, lang)}
                </span>
              </div>
            </>
          )
          return c.url ? (
            <a key={c.id} className="clip" href={c.url} target="_blank" rel="noreferrer">
              {inner}
            </a>
          ) : (
            <div key={c.id} className="clip">
              {inner}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** YouTube video id from a watch URL, for the thumbnail. */
const ytId = (url: string | null) => (url ? new URL(url).searchParams.get('v') : null)

function Skills() {
  const { lang } = useT()
  return (
    <div className="sec sec-skills">
      {cv.skills.map((g, i) => (
        <section key={g.id} className="rack">
          <div className="rack-ear" aria-hidden="true">
            <i />
            <i />
          </div>
          <div className="rack-face">
            <div className="rack-head">
              <span className="rack-u">{i + 1}U</span>
              <h3>{tr(g.group, lang)}</h3>
              <span className="rack-leds" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </div>
            <ul className="ports">
              {g.items.map((it) => (
                <li key={tr(it, 'en')}>{tr(it, lang)}</li>
              ))}
            </ul>
          </div>
          <div className="rack-ear" aria-hidden="true">
            <i />
            <i />
          </div>
        </section>
      ))}
    </div>
  )
}

function Education() {
  const { t, lang } = useT()
  return (
    <div className="sec sec-edu">
      <ol className="timeline">
        {cv.education.map((e) => (
          <li key={e.id} className={`tl ${e.state}`}>
            <span className="tl-dot" aria-hidden="true" />
            <p className="eyebrow">{tr(e.period, lang)}</p>
            <h3>{tr(e.title, lang)}</h3>
            <p className="tl-org">{e.org}</p>
            <p className="tl-status">{tr(e.status, lang)}</p>
            {e.detail && <p className="chips-line">{e.detail}</p>}
          </li>
        ))}
      </ol>

      <div className="two-col">
        <div>
          <h4 className="sub">{t.certs}</h4>
          {cv.certifications.map((c) => (
            <div key={c.id} className="cert">
              <span className="cert-seal" aria-hidden="true">
                ✓
              </span>
              <div>
                <b>{tr(c.title, lang)}</b>
                <span>
                  {c.org} · {tr(c.date, lang)}
                </span>
                <span className="muted">{tr(c.detail, lang)}</span>
              </div>
            </div>
          ))}
        </div>
        <div>
          <h4 className="sub">{t.languages}</h4>
          <ul className="langs">
            {cv.languages.map((l) => (
              <li key={l.name.en}>
                <b>{tr(l.name, lang)}</b> <span className="badge">{tr(l.level, lang)}</span>
                {l.note && <p className="muted">{tr(l.note, lang)}</p>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function Contact() {
  const { t, lang } = useT()
  return (
    <div className="sec sec-contact">
      <h3 className="display">{t.contactTitle}</h3>
      <p className="lead">{t.contactSub}</p>
      <div className="contact-card">
        <a className="contact-email" href={`mailto:${cv.person.email}`}>
          {cv.person.email}
        </a>
        <CopyEmail />
      </div>
      <CtaRow />
      <div className="contact-links">
        <a href={cvHref('es')} download>
          <Icon name="download" size={14} /> {t.cvEs}
        </a>
        <a href={cvHref('en')} download>
          <Icon name="download" size={14} /> {t.cvEn}
        </a>
      </div>
      <p className="muted">
        {tr(cv.person.location, lang)} · {t.tz}
      </p>
    </div>
  )
}
