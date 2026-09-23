import { cv, fmtMonth, tr } from '../data/cv'
import { useT } from '../i18n'
import { prefers3D, setView } from '../store'
import { Icon, cvHref } from './common'

/** Plain, printable résumé for recruiters and ATS-minded readers. */
export default function SimpleCV() {
  const { t, lang } = useT()
  return (
    <main className="doc">
      <div className="doc-actions no-print">
        <button type="button" className="btn" onClick={() => setView(prefers3D() ? 'mcr' : 'lite')}>
          ← {t.openMcr}
        </button>
        <a className="btn btn-primary" href={cvHref(lang)} download>
          <Icon name="download" /> PDF
        </a>
        <button type="button" className="btn" onClick={() => window.print()}>
          <Icon name="print" /> {t.printCv}
        </button>
      </div>

      <header className="doc-head">
        <h1>{cv.person.name}</h1>
        <p className="doc-title">{tr(cv.person.title, lang)}</p>
        <p className="doc-contact">
          {tr(cv.person.location, lang)} · <a href={`mailto:${cv.person.email}`}>{cv.person.email}</a> ·{' '}
          <a href={cv.person.linkedin}>linkedin.com/in/arielgrela</a> · <a href={cv.person.github}>github.com/AriGrela</a>
        </p>
      </header>

      <section>
        <h2>{lang === 'es' ? 'Perfil profesional' : 'Professional summary'}</h2>
        {cv.about[lang].map((p) => (
          <p key={p.slice(0, 20)}>{p}</p>
        ))}
        <p>
          <strong>{t.seeking}:</strong> {tr(cv.seeking, lang).replace(/^Busco |^I'm looking to /, '')}
        </p>
      </section>

      <section>
        <h2>{t.competencies}</h2>
        <ul>
          {cv.competencies.map((c) => (
            <li key={c.title.en}>
              <strong>{tr(c.title, lang)}:</strong> {tr(c.text, lang)}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>{lang === 'es' ? 'Experiencia profesional' : 'Professional experience'}</h2>
        {cv.experience.map((e) => (
          <article key={e.id} className="doc-job">
            <div className="doc-job-head">
              <h3>
                {tr(e.role, lang)} — {e.org}
                {e.via ? <span className="doc-via"> · {tr(e.via, lang)}</span> : null}
              </h3>
              <span>
                {fmtMonth(e.start, lang, e.yearOnly)} – {fmtMonth(e.end, lang, e.yearOnly)}
              </span>
            </div>
            <ul>
              {e.bullets[lang].map((b) => (
                <li key={b.slice(0, 30)}>{b}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section>
        <h2>{t.liveTitle}</h2>
        <ul>
          {cv.events.map((e) => (
            <li key={e.id}>
              <strong>{tr(e.title, lang)}</strong> ({e.game}) — {tr(e.venue, lang)} · {e.mode === 'onsite' ? t.onsite.toLowerCase() : t.online.toLowerCase()}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>{t.projectsTitle}</h2>
        <ul>
          {cv.projects.map((p) => (
            <li key={p.id}>
              <strong>{tr(p.title, lang)}</strong> ({tr(p.kind, lang)}): {tr(p.solution, lang)} <em>{p.stack.join(', ')}</em>
            </li>
          ))}
          {cv.clips.map((c) => (
            <li key={c.id}>
              <strong>{c.title}</strong> — {tr(c.kind, lang)}, {c.year} · {tr(c.role, lang)}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>{lang === 'es' ? 'Educación' : 'Education'}</h2>
        <ul>
          {cv.education.map((e) => (
            <li key={e.id}>
              <strong>{tr(e.title, lang)}</strong> — {e.org} · {tr(e.period, lang)} · {tr(e.status, lang)}
            </li>
          ))}
          {cv.certifications.map((c) => (
            <li key={c.id}>
              <strong>{tr(c.title, lang)}</strong> — {c.org} · {tr(c.date, lang)} · {tr(c.detail, lang)}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>{lang === 'es' ? 'Tecnologías y herramientas' : 'Technologies & tools'}</h2>
        <ul>
          {cv.skills.map((g) => (
            <li key={g.id}>
              <strong>{tr(g.group, lang)}:</strong> {g.items.map((it) => tr(it, lang)).join(', ')}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>{t.languages}</h2>
        <ul>
          {cv.languages.map((l) => (
            <li key={l.name.en}>
              <strong>{tr(l.name, lang)}:</strong> {tr(l.level, lang)}
              {l.note ? ` — ${tr(l.note, lang)}` : ''}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
