"""Builds the downloadable ATS-friendly résumés (ES + EN) from src/data/cv.json.

The phone number is intentionally left out: the PDFs are public.

    python scripts/build_cv_pdf.py
"""

import json
import os
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)

ROOT = Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / "src" / "data" / "cv.json").read_text(encoding="utf-8"))
OUT = ROOT / "public" / "cv"

FONT_DIR = Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts"
pdfmetrics.registerFont(TTFont("Body", str(FONT_DIR / "arial.ttf")))
pdfmetrics.registerFont(TTFont("Body-Bold", str(FONT_DIR / "arialbd.ttf")))
pdfmetrics.registerFont(TTFont("Body-Italic", str(FONT_DIR / "ariali.ttf")))
pdfmetrics.registerFontFamily("Body", normal="Body", bold="Body-Bold", italic="Body-Italic")

RED = HexColor("#B31414")
INK = HexColor("#16181B")
MUTED = HexColor("#50565E")

LABELS = {
    "es": {
        "summary": "Perfil profesional",
        "competencies": "Competencias clave",
        "experience": "Experiencia profesional",
        "projects": "Proyectos técnicos seleccionados",
        "events": "Transmisiones destacadas (LVP)",
        "events_text": "Finales presenciales en estadio: {onsite}. Finales online: {online}.",
        "education": "Educación y certificaciones",
        "skills": "Tecnologías y herramientas",
        "languages": "Idiomas",
        "present": "actualidad",
        "onsite": "presencial",
        "online": "online",
        "portfolio": "Portfolio interactivo",
    },
    "en": {
        "summary": "Professional summary",
        "competencies": "Core competencies",
        "experience": "Professional experience",
        "projects": "Selected technical projects",
        "events": "Featured broadcasts (LVP)",
        "events_text": "On-site stadium finals: {onsite}. Online finals: {online}.",
        "education": "Education & certifications",
        "skills": "Technologies & tools",
        "languages": "Languages",
        "present": "present",
        "onsite": "on site",
        "online": "online",
        "portfolio": "Interactive portfolio",
    },
}

MONTHS = {
    "es": ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
    "en": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
}


def tr(value, lang):
    if value is None:
        return ""
    return value if isinstance(value, str) else value[lang]


def month(ym, lang, year_only=False):
    if not ym:
        return LABELS[lang]["present"]
    y, m = ym.split("-")
    return y if year_only else f"{MONTHS[lang][int(m) - 1]} {y}"


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


S = {
    "name": ParagraphStyle("name", fontName="Body-Bold", fontSize=22, leading=26, textColor=INK),
    "title": ParagraphStyle("title", fontName="Body-Bold", fontSize=10.5, leading=14, textColor=INK, spaceBefore=2),
    "contact": ParagraphStyle("contact", fontName="Body", fontSize=9, leading=12.5, textColor=MUTED, spaceBefore=2),
    "h2": ParagraphStyle(
        "h2", fontName="Body-Bold", fontSize=10.3, leading=12.5, textColor=RED, spaceBefore=8, spaceAfter=2
    ),
    "body": ParagraphStyle("body", fontName="Body", fontSize=9.1, leading=12.2, textColor=INK, alignment=TA_LEFT),
    "job": ParagraphStyle("job", fontName="Body-Bold", fontSize=9.6, leading=12.5, textColor=INK, spaceBefore=5),
    "meta": ParagraphStyle("meta", fontName="Body", fontSize=8.8, leading=11.5, textColor=MUTED),
    "bullet": ParagraphStyle("bullet", fontName="Body", fontSize=8.95, leading=11.8, textColor=INK),
}


def bullets(items):
    return ListFlowable(
        [ListItem(Paragraph(esc(t), S["bullet"]), leftIndent=10, value="•") for t in items],
        bulletType="bullet",
        bulletFontName="Body",
        bulletFontSize=8,
        leftIndent=10,
        bulletOffsetY=-0.5,
        spaceBefore=1,
    )


def section(title):
    return [
        Paragraph(title.upper(), S["h2"]),
        HRFlowable(width="100%", thickness=0.6, color=HexColor("#D9D6CF"), spaceBefore=0, spaceAfter=3),
    ]


def build(lang):
    L = LABELS[lang]
    p = DATA["person"]
    out = OUT / f"Ariel_Grela_CV_{lang.upper()}.pdf"
    doc = SimpleDocTemplate(
        str(out),
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=12 * mm,
        bottomMargin=12 * mm,
        title=f"{p['name']} — CV ({lang.upper()})",
        author=p["name"],
        subject=tr(p["title"], lang),
        keywords="media technology, workflow automation, implementation, Python, SQL, Google Apps Script, n8n, AI, streaming operations, broadcast",
    )
    site = p["site"].replace("https://", "")
    story = [
        Paragraph(esc(p["name"].upper()), S["name"]),
        Paragraph(esc(tr(p["title"], lang)), S["title"]),
        Paragraph(
            " | ".join(
                [
                    esc(tr(p["location"], lang)),
                    f'<link href="mailto:{p["email"]}">{p["email"]}</link>',
                    f'<link href="{p["linkedin"]}">linkedin.com/in/arielgrela</link>',
                    f'<link href="{p["github"]}">github.com/AriGrela</link>',
                ]
            ),
            S["contact"],
        ),
        Paragraph(
            f'{L["portfolio"]}: <link href="{p["site"]}"><font color="#B31414">{site}</font></link>', S["contact"]
        ),
    ]

    story += section(L["summary"])
    for para in DATA["summary"][lang]:
        story += [Paragraph(esc(para), S["body"]), Spacer(0, 3)]

    story += section(L["competencies"])
    story.append(
        bullets([f"{tr(c['title'], lang)}: {tr(c['text'], lang)}" for c in DATA["competencies"]])
    )

    story += section(L["experience"])
    for e in DATA["experience"]:
        via = tr(e.get("via"), lang)
        items = e["bullets"][lang][:1] if e["id"] in ("overbright", "1block") else e["bullets"][lang]
        head = f"{esc(tr(e['role'], lang))} — {esc(e['org'])}" + (f"  |  {esc(via)}" if via else "")
        when = f"{month(e['start'], lang, e.get('yearOnly'))} – {month(e['end'], lang, e.get('yearOnly'))} · {esc(e['location'])}"
        story.append(
            KeepTogether([Paragraph(head, S["job"]), Paragraph(when, S["meta"]), bullets(items)])
        )

    story += section(L["projects"])
    proj = []
    for pr in DATA["projects"]:
        if pr["id"] == "mcr":
            continue
        proj.append(f"{tr(pr['title'], lang)} ({tr(pr['kind'], lang)}): {tr(pr['solution'], lang)} [{', '.join(pr['stack'])}]")
    story.append(bullets(proj))

    story += section(L["skills"])
    story.append(
        bullets([f"{tr(g['group'], lang)}: {', '.join(tr(i, lang) for i in g['items'])}" for g in DATA["skills"]])
    )

    story += section(L["education"])
    edu = [f"{tr(e['title'], lang)} — {e['org']} · {tr(e['period'], lang)} · {tr(e['status'], lang)}" for e in DATA["education"]]
    edu += [f"{tr(c['title'], lang)} — {c['org']} · {tr(c['date'], lang)} · {tr(c['detail'], lang)}" for c in DATA["certifications"]]
    story.append(bullets(edu))

    story += section(L["events"])
    onsite = "; ".join(f"{tr(ev['title'], lang)} ({tr(ev['venue'], lang)})" for ev in DATA["events"] if ev["mode"] == "onsite")
    online = ", ".join(tr(ev["title"], lang) for ev in DATA["events"] if ev["mode"] == "online")
    story.append(Paragraph(esc(L["events_text"].format(onsite=onsite, online=online)), S["body"]))

    story += section(L["languages"])
    story.append(
        Paragraph(
            esc(
                "  ·  ".join(
                    f"{tr(l['name'], lang)}: {tr(l['level'], lang)}" + (f" — {tr(l['note'], lang)}" if l.get("note") else "")
                    for l in DATA["languages"]
                )
            ),
            S["body"],
        )
    )

    doc.build(story)
    return out


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for lang in ("es", "en"):
        print("wrote", build(lang).relative_to(ROOT))
