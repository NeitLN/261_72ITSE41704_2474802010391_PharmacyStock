"""Assemble the Final Report DOCX from the chapter files in docs/report.

Usage (from the repository root):

    python docs/report/build_report.py --template <Template_Final-Project-Report.docx> [--date 27/11/2026]

The template is the faculty's Template_Final-Project-Report.docx (not kept in
the repository). The output goes to docs/report/out/, which Git ignores.

What the script does, so nobody edits the DOCX by hand between builds:
- fills the cover and the declaration of the template;
- puts every chapter file under the template's own section headings, in the
  template's order (the MANIFEST below);
- numbers figures, tables and code excerpts per chapter and rewrites the
  references to them in the text;
- merges the per-chapter reference lists into one IEEE list, numbered in
  order of first citation;
- renders mermaid diagrams with mermaid-cli (npx), and inserts screenshots;
- inserts the FR/NFR tables from docs/requirements/functional-requirements.md;
- writes out/build-log.md: every placeholder still to fill (missing
  screenshots, sections to be written), so the editor sees what is left.

Word updates the table of contents and the lists of figures and tables when
the file is opened (it asks once); in Word, answer Yes.

Needs: python-docx, and Node.js for the diagrams (npx @mermaid-js/mermaid-cli).
"""
import argparse
import copy
import hashlib
import os
import re
import subprocess
import sys
from pathlib import Path

from docx import Document
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_COLOR_INDEX
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / 'docs' / 'report'
DIAGRAMS = ROOT / 'docs' / 'diagrams'
OUT = REPORT / 'out'
CACHE = OUT / 'diagrams'

TITLE = 'PHARMACY STOCK AND PRESCRIPTION DISPENSING SYSTEM'
MEMBERS = [
    ('Võ Việt Tiến', '2474802010391', 'Team leader'),
    ('Bùi Duy Anh', '2474802010525', 'Member'),
    ('Võ Hoàng Minh', '2474802010242', 'Member'),
]
COURSE = 'Course: 72ITSE41704 Application Programming Project'
CLASS_GROUP = 'Class group: 261_72ITSE41704_01'
FILE_NAME = '2474802010391_VoVietTien_ApplicationProgrammingProject.docx'

# --------------------------------------------------------------------------
# Manifest: the template's order. Each entry is one of
#   ('h', level, text)                      a heading of the template
#   ('p', text)                             a paragraph written here
#   ('file', path, section, base_level, options)
#       section: None for the whole file (without its title line), or the
#       text a '##'/'###' heading starts with; base_level is the Word heading
#       level that the file's '##' (or the section's sub-headings) become.
#   ('fr-table',) / ('nfr-table',) are written by {{…}} lines in the files.
#   ('todo', text)                          a highlighted placeholder
# --------------------------------------------------------------------------
NOT_BUILT = ('What was not built', 'What is not built')
MANIFEST = [
    ('chapter', 1, 'CHAPTER 1: INTRODUCTION'),
    ('file', 'ch1-introduction.md', None, 2, {}),

    ('chapter', 2, 'CHAPTER 2: THEORETICAL BACKGROUND AND CURRENT SITUATION'),
    ('file', 'ch2-background.md', '__intro__', 2, {}),
    ('h', 2, '2.1 Theoretical Background'),
    ('file', 'ch2-background.md', '## 2.2 Technical background', 3, {}),
    ('h', 2, '2.2 Current System/Process Analysis'),
    ('file', 'ch2-background.md', '## 2.1 How a pharmacy handles', 3, {}),
    ('file', 'ch2-requirements.md', None, 2, {}),

    ('chapter', 3, 'CHAPTER 3: SYSTEM ANALYSIS, DESIGN, AND IMPLEMENTATION'),
    ('file', 'ch3-overview.md', '## 3.1 ', 2, {'keep_heading': True}),
    ('h', 2, '3.2 System Analysis and Design'),
    ('file', 'ch3-overview.md', '## 3.2.1 ', 3, {'keep_heading': True}),
    ('h', 3, '3.2.2 Data Flow Analysis'),
    ('file', 'ch3-architecture-data.md', '## 3.1 Architecture', 4, {}),
    ('h', 4, 'Data flow of one command'),
    ('file', 'ch3-architecture-data.md', '## 3.4 Data flow', 5, {}),
    ('h', 3, '3.2.3 Database Design'),
    ('file', 'ch3-architecture-data.md', '## 3.2 Data', 4, {}),
    ('h', 4, 'The stock ledger'),
    ('file', 'ch3-architecture-data.md', '## 3.3 The stock ledger', 5, {}),
    ('h', 3, '3.2.4 Interface Design'),
    ('file', 'ch3-interface-design.md', None, 4, {}),
    ('h', 2, '3.3 System Development and Implementation'),
    ('file', 'ch3-overview.md', '## 3.3.1 ', 3, {'keep_heading': True}),
    ('h', 3, '3.3.2 Implemented Functions'),
    ('p', 'The functions are presented by module owner: Võ Việt Tiến (catalogue, '
          'prices, suppliers, goods receipts, stock lookup), Bùi Duy Anh '
          '(prescriptions, dispensing, sales, returns, customers and prescribers) '
          'and Võ Hoàng Minh (stock control, reporting, access control). For each '
          'use case: the description, its input and output, screenshots on the '
          'seeded data, and implementation notes.'),
    ('h', 4, 'Catalogue, prices, suppliers, goods receipts and stock lookup (Võ Việt Tiến)'),
    ('file', 'ch3-functions-a.md', None, 5, {'skip': NOT_BUILT}),
    ('h', 4, 'Prescriptions, dispensing, sales and returns (Bùi Duy Anh)'),
    ('file', 'ch3-functions-b.md', None, 5, {'skip': NOT_BUILT}),
    ('h', 4, 'Stock control, reporting and access control (Võ Hoàng Minh)'),
    ('file', 'ch3-functions-c.md', None, 5, {'skip': NOT_BUILT}),
    ('h', 3, '3.3.3 Unimplemented or Incomplete Functions'),
    ('file', 'ch3-unimplemented.md', None, 4, {}),
    ('file', 'ch3-overview.md', '## 3.3.4 ', 3, {'keep_heading': True}),
    ('h', 2, '3.4 Testing and Evaluation'),
    ('h', 3, '3.4.1 Testing Process'),
    ('file', 'ch3-testing.md', None, 4, {}),
    ('file', 'ch3-evaluation.md', None, 3, {}),

    ('chapter', 4, 'CHAPTER 4: CONCLUSION'),
    ('file', 'ch4-conclusion.md', None, 2, {}),
    ('skills', [('Võ Việt Tiến', 'ch4-skills-tien.md'),
                ('Bùi Duy Anh', 'ch4-skills-duy-anh.md'),
                ('Võ Hoàng Minh', 'ch4-skills-minh.md')]),

    ('chapter', 'A', 'APPENDICES'),
    ('h', 2, 'Appendix A. Proposal feedback and the actions taken'),
    ('file', 'proposal-feedback.md', None, 3, {}),
    ('h', 2, 'Appendix B. Declaration of AI-tool use'),
    ('todo', 'Appendix B is written by Võ Việt Tiến.'),
    ('h', 2, 'Appendix C. Individual contribution table'),
    ('todo', 'Appendix C (#87, Bùi Duy Anh): contributions from Git and GitHub and the typed signatures of all three members.'),
    ('h', 2, 'Appendix D. Rubric self-check'),
    ('file', '../appendix-d-self-check.md', None, 3, {}),
    ('h', 2, 'Appendix E. Manual test cases'),
    ('file', '../../tests/manual/test-cases.md', None, 3, {'tables_only': 1, 'caption': 'Table — Manual test cases and their latest result.'}),
    ('file', '../../tests/manual/runs.md', None, 3, {'tables_only': 1, 'caption': 'Table — The run log: every manual test run with its commit, actual result and verdict.'}),
    ('h', 2, 'Appendix F. Libraries, licences and generated code'),
    ('file', 'references.md', None, 3, {'skip': ('References', 'Use of AI tools')}),

    ('references',),
]

# --------------------------------------------------------------------------
LOG = []


def log(kind, where, text):
    LOG.append((kind, where, text))


def norm_ref_key(text):
    t = re.sub(r'\*\(new\)\*', '', text)
    t = re.sub(r'[^a-z0-9]+', '', t.lower())
    return t[:70]


class Refs:
    """One IEEE list for the whole report, numbered by first citation."""

    def __init__(self):
        self.entries = {}    # key -> text
        self.order = []      # keys in order of first citation
        self.listed = []     # keys in order they were listed

    def add(self, text):
        key = norm_ref_key(text)
        if key not in self.entries:
            self.entries[key] = text
            self.listed.append(key)
        return key

    def cite(self, key):
        if key not in self.order:
            self.order.append(key)
        return self.order.index(key) + 1

    def final(self):
        keys = self.order + [k for k in self.listed if k not in self.order]
        return [(i + 1, self.entries[k]) for i, k in enumerate(keys)]


REFS = Refs()


# ------------------------------------------------------------ markdown parse
def read(path):
    return (REPORT / path).resolve().read_text(encoding='utf-8')


def heading_level(line):
    m = re.match(r'^(#{1,6})\s+(.*)$', line)
    return (len(m.group(1)), m.group(2).strip()) if m else (0, None)


def section_lines(text, selector):
    lines = text.splitlines()
    if selector is None:
        # whole file without its title line
        if lines and lines[0].startswith('# '):
            lines = lines[1:]
        return lines
    if selector == '__intro__':
        out = []
        for ln in lines[1:]:
            if ln.startswith('## '):
                break
            out.append(ln)
        return out
    start = None
    level = 0
    for i, ln in enumerate(lines):
        lv, txt = heading_level(ln)
        if lv and ln.startswith(selector):
            start, level = i, lv
            break
    if start is None:
        raise SystemExit(f'section not found: {selector!r}')
    out = [lines[start]]
    for ln in lines[start + 1:]:
        lv, _ = heading_level(ln)
        if lv and lv <= level:
            break
        out.append(ln)
    return out


def strip_refs_section(lines, file_key):
    """Removes '## References (this chapter)' and returns {n: key}."""
    out, local, i = [], {}, 0
    while i < len(lines):
        ln = lines[i]
        if re.match(r'^##+\s+References \(this chapter\)', ln):
            i += 1
            current = None
            buf = []
            while i < len(lines) and not re.match(r'^##?\s', lines[i]):
                m = re.match(r'^\[(\d+)\]\s+(.*)$', lines[i])
                if m:
                    if current is not None:
                        local[current] = REFS.add(' '.join(buf))
                    current, buf = int(m.group(1)), [m.group(2)]
                elif current is not None and lines[i].strip():
                    buf.append(lines[i].strip())
                elif not lines[i].strip() and current is not None:
                    local[current] = REFS.add(' '.join(buf))
                    current, buf = None, []
                i += 1
            if current is not None:
                local[current] = REFS.add(' '.join(buf))
            continue
        out.append(ln)
        i += 1
    return out, local


def blocks(lines):
    """Yields (kind, payload) blocks from markdown lines."""
    i = 0
    n = len(lines)
    while i < n:
        ln = lines[i]
        if not ln.strip():
            i += 1
            continue
        if ln.startswith('>'):
            i += 1
            continue
        if ln.startswith('```'):
            lang = ln[3:].strip()
            body = []
            i += 1
            while i < n and not lines[i].startswith('```'):
                body.append(lines[i])
                i += 1
            i += 1
            yield ('code', (lang, body))
            continue
        lv, txt = heading_level(ln)
        if lv:
            yield ('heading', (lv, txt))
            i += 1
            continue
        if ln.lstrip().startswith('|'):
            rows = []
            while i < n and lines[i].lstrip().startswith('|'):
                rows.append(lines[i])
                i += 1
            yield ('table', rows)
            continue
        m = re.match(r'^!\[([^\]]*)\]\(([^)]+)\)\s*$', ln.strip())
        if m:
            yield ('image', (m.group(1), m.group(2)))
            i += 1
            continue
        if re.match(r'^\{\{.*\}\}\s*$', ln.strip()):
            yield ('directive', ln.strip()[2:-2])
            i += 1
            continue
        if re.match(r'^\s*([-*]|\d+\.)\s+', ln):
            items = []
            while i < n and (re.match(r'^\s*([-*]|\d+\.)\s+', lines[i]) or
                             (lines[i].startswith('  ') and lines[i].strip() and items)):
                m2 = re.match(r'^(\s*)([-*]|\d+\.)\s+(.*)$', lines[i])
                if m2:
                    items.append([len(m2.group(1)), m2.group(2), m2.group(3)])
                else:
                    items[-1][2] += ' ' + lines[i].strip()
                i += 1
            yield ('list', items)
            continue
        para = []
        while i < n and lines[i].strip() and not lines[i].startswith(('```', '>', '|', '#')) \
                and not re.match(r'^!\[', lines[i].strip()) \
                and not (para and re.match(r'^\s*([-*]|\d+\.)\s+', lines[i])):
            para.append(lines[i].strip())
            i += 1
        text = ' '.join(para)
        if re.match(r'^\*(Figure|Table)\b.*\*$', text):
            yield ('caption', text[1:-1])
        else:
            yield ('para', text)


# ------------------------------------------------------------ numbering pass
CAP_RE = re.compile(r'^(Figure|Table|Code excerpt)\s+([A-Z0-9]+(?:\.[A-Za-z0-9]+)?)?\s*[—–-]?\s*(.*)$', re.S)


class Numbering:
    def __init__(self):
        self.counters = {}
        self.file_maps = {}    # file -> {old label: new label}
        self.global_count = {}  # old label -> count across files
        self.global_map = {}

    def next(self, chapter, kind):
        key = (chapter, kind)
        self.counters[key] = self.counters.get(key, 0) + 1
        return f'{kind} {chapter}.{self.counters[key]}'

    def register(self, file, old, new):
        if not old:
            return
        fm = self.file_maps.setdefault(file, {})
        if old in fm:
            fm[old] = None   # ambiguous inside the file
        else:
            fm[old] = new
        self.global_count[old] = self.global_count.get(old, 0) + 1
        self.global_map[old] = new


NUM = Numbering()


def caption_parts(text):
    m = CAP_RE.match(text.strip())
    if not m:
        return None
    kind, label, rest = m.group(1), m.group(2), m.group(3)
    old = f'{kind} {label}' if label and label not in ('x', 'y', 'z', 'w') and not label.endswith(('.x', '.y', '.z', '.w')) else None
    return kind, old, rest.strip().rstrip('.') if rest else ''


def iter_manifest_blocks():
    """Yields (entry, file, blocks) for every file entry, in output order."""
    chapter = None
    for entry in MANIFEST:
        if entry[0] == 'chapter':
            chapter = entry[1]
        if entry[0] != 'file':
            yield chapter, entry, None, None
            continue
        _, path, selector, base, opts = entry
        _, local_refs = strip_refs_section(read(path).splitlines(), path)
        lines, _ = strip_refs_section(section_lines(read(path), selector), path)
        bl = list(blocks(lines))
        yield chapter, entry, (path, local_refs), bl


def map_labels(text, path):
    fm = NUM.file_maps.get(path, {})

    def sub(m):
        label = m.group(0)
        if fm.get(label):
            return fm[label]
        if NUM.global_count.get(label) == 1:
            return NUM.global_map[label]
        return label
    return re.sub(r'\b(Figure|Table|Code excerpt)\s+[A-Z0-9]+\.[A-Za-z0-9]+\b', sub, text)


# ------------------------------------------------------------ docx helpers
def set_cell_shading(cell, hex_fill):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hex_fill)
    tcPr.append(shd)


def set_table_borders(table):
    tbl = table._tbl
    tblPr = tbl.tblPr
    borders = OxmlElement('w:tblBorders')
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        el = OxmlElement(f'w:{edge}')
        el.set(qn('w:val'), 'single')
        el.set(qn('w:sz'), '4')
        el.set(qn('w:space'), '0')
        el.set(qn('w:color'), '808080')
        borders.append(el)
    tblPr.append(borders)


INLINE_RE = re.compile(r'(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_|\[[^\]]+\]\([^)]+\))')


class Writer:
    def __init__(self, doc):
        self.doc = doc
        self.path = None
        self.local_refs = {}
        self.last_was_figure = False
        self.chapter = None
        self.ensure_styles()

    # styles ---------------------------------------------------------------
    def ensure_styles(self):
        st = self.doc.styles
        names = [s.name for s in st]
        for name in ('Figure Caption', 'Table Caption', 'Listing Caption'):
            if name not in names:
                s = st.add_style(name, WD_STYLE_TYPE.PARAGRAPH)
                s.base_style = st['Normal']
                s.font.italic = True
                s.font.size = Pt(11)
                s.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
                s.paragraph_format.space_after = Pt(10)
        if 'Heading 5' not in names:
            s = st.add_style('Heading 5', WD_STYLE_TYPE.PARAGRAPH)
            s.base_style = st['Heading 4']
            s.font.italic = True
            lvl = OxmlElement('w:outlineLvl')
            lvl.set(qn('w:val'), '4')
            s.element.get_or_add_pPr().append(lvl)
        if 'Code Block' not in names:
            s = st.add_style('Code Block', WD_STYLE_TYPE.PARAGRAPH)
            s.base_style = st['Normal']
            s.font.name = 'Consolas'
            s.font.size = Pt(8.5)
            s.paragraph_format.space_after = Pt(0)
            s.paragraph_format.space_before = Pt(0)
            s.paragraph_format.line_spacing = 1.0

    # text -------------------------------------------------------------------
    def cite(self, text):
        text = re.sub(r'\[(\d+)\]\s*[–-]\s*\[(\d+)\]',
                      lambda m: ', '.join(f'[{k}]' for k in range(int(m.group(1)), int(m.group(2)) + 1)), text)

        def sub(m):
            n = int(m.group(1))
            if n in self.local_refs:
                return f'[{REFS.cite(self.local_refs[n])}{m.group(2) or ""}]'
            return m.group(0)
        return re.sub(r'(?<![\w`])\[(\d+)(, [^\]]+)?\](?!\()', sub, text)

    def runs(self, p, text, italic=False, size=None):
        text = map_labels(self.cite(text), self.path or '')
        text = text.replace('&amp;', '&').replace('&nbsp;', ' ')
        for part in INLINE_RE.split(text):
            if not part:
                continue
            r = None
            if part.startswith('**') and part.endswith('**'):
                r = p.add_run(part[2:-2])
                r.bold = True
            elif part.startswith('`') and part.endswith('`'):
                r = p.add_run(part[1:-1])
                r.font.name = 'Consolas'
                r.font.size = Pt(9.5)
            elif re.match(r'^\[[^\]]+\]\([^)]+\)$', part):
                r = p.add_run(re.match(r'^\[([^\]]+)\]', part).group(1))
            elif (part.startswith('*') and part.endswith('*')) or (part.startswith('_') and part.endswith('_') and len(part) > 2):
                inner = part[1:-1]
                r = p.add_run(inner)
                r.italic = True
                if re.search(r'to be (written|filled)|to add|Tiến to confirm', inner):
                    r.font.highlight_color = WD_COLOR_INDEX.YELLOW
                    log('todo', self.path, inner)
            else:
                r = p.add_run(part)
            if italic:
                r.italic = True
            if size:
                r.font.size = size
        return p

    def para(self, text):
        for m in re.finditer(r'(Figure|Table)s? \d+\.[xyzw]', text):
            log('label', self.path, f'unnumbered reference "{m.group(0)}" in: {text[:80]}')
        p = self.doc.add_paragraph()
        p.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        self.runs(p, text)
        self.last_was_figure = False

    def todo(self, text):
        p = self.doc.add_paragraph()
        r = p.add_run(f'[{text}]')
        r.italic = True
        r.font.highlight_color = WD_COLOR_INDEX.YELLOW
        log('todo', self.path or 'manifest', text)
        self.last_was_figure = False

    def heading(self, level, text, page_break=False):
        level = min(level, 5)
        h = self.doc.add_heading(level=level)
        if page_break:
            h.paragraph_format.page_break_before = True
        self.runs(h, text)
        for r in h.runs:
            r.font.color.rgb = RGBColor(0, 0, 0)
        self.last_was_figure = False

    table_captioned = False

    def caption(self, kind, label, rest):
        style = {'Table': 'Table Caption', 'Figure': 'Figure Caption'}.get(kind, 'Listing Caption')
        p = self.doc.add_paragraph(style=style)
        p.add_run(label + ('. ' if rest else ''))
        if rest:
            self.runs(p, rest[0].upper() + rest[1:])
        if kind != 'Figure':
            p.paragraph_format.keep_with_next = True
        self.table_captioned = kind == 'Table'

    def picture(self, path, width_cm=15.5):
        from PIL import Image
        with Image.open(path) as im:
            w, h = im.size
        width = min(width_cm, w / 96 * 2.54)
        # very tall images are limited to about two thirds of a page
        if h / w * width > 20:
            width = 20 * w / h
        p = self.doc.add_paragraph()
        p.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.keep_with_next = True
        p.add_run().add_picture(str(path), width=Cm(width))
        self.last_was_figure = True

    def table(self, rows, font=Pt(9)):
        cells = [[c.strip() for c in r.strip().strip('|').split('|')] for r in rows]
        cells = [r for r in cells if not all(re.match(r'^:?-{2,}:?$', c) for c in r if c)]
        if not cells:
            return
        width = max(len(r) for r in cells)
        t = self.doc.add_table(rows=len(cells), cols=width)
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        set_table_borders(t)
        for i, row in enumerate(cells):
            for j in range(width):
                txt = row[j] if j < len(row) else ''
                cell = t.cell(i, j)
                p = cell.paragraphs[0]
                p.paragraph_format.space_after = Pt(0)
                self.runs(p, txt.replace('<br>', ' ').replace('<br/>', ' '), size=font)
                if i == 0:
                    for r in p.runs:
                        r.bold = True
                    set_cell_shading(cell, 'E7EEEC')
        self.doc.add_paragraph()
        self.last_was_figure = False
        self.table_captioned = False

    def code(self, lines):
        for ln in lines or ['']:
            p = self.doc.add_paragraph(style='Code Block')
            p.add_run(ln.replace('\t', '    ') or ' ')
            pPr = p._p.get_or_add_pPr()
            shd = OxmlElement('w:shd')
            shd.set(qn('w:val'), 'clear')
            shd.set(qn('w:fill'), 'F2F2F2')
            pPr.append(shd)
        self.doc.add_paragraph()
        self.last_was_figure = False

    def listing(self, items):
        for indent, marker, text in items:
            p = self.doc.add_paragraph(style='List Paragraph')
            p.paragraph_format.left_indent = Cm(0.9 + indent * 0.3)
            p.paragraph_format.first_line_indent = Cm(-0.5)
            p.paragraph_format.space_after = Pt(2)
            bullet = '•\t' if marker in ('-', '*') else f'{marker}\t'
            p.add_run(bullet)
            self.runs(p, text)
        self.last_was_figure = False


# ------------------------------------------------------------ diagrams
def mermaid_blocks(md_path):
    text = md_path.read_text(encoding='utf-8')
    out = []
    heading = None
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        lv, txt = heading_level(lines[i])
        if lv:
            heading = txt
        if lines[i].startswith('```mermaid'):
            body = []
            i += 1
            while not lines[i].startswith('```'):
                body.append(lines[i])
                i += 1
            out.append((heading, '\n'.join(body)))
        i += 1
    return out


def render_mermaid(source):
    CACHE.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha1(source.encode('utf-8')).hexdigest()[:16]
    png = CACHE / f'{digest}.png'
    if png.exists():
        return png
    mmd = CACHE / f'{digest}.mmd'
    mmd.write_text(source, encoding='utf-8')
    cmd = ['npx', '-y', '@mermaid-js/mermaid-cli@11.4.2', '-i', str(mmd), '-o', str(png), '-s', '2', '-b', 'white']
    subprocess.run(cmd, check=True, shell=(os.name == 'nt'), capture_output=True)
    return png


def diagram_directive(w, payload):
    spec, _, cap = payload[len('diagram:'):].partition('|')
    if '@' in spec:
        file, head = spec.split('@', 1)
        found = [b for h, b in mermaid_blocks(DIAGRAMS / file) if h and h.startswith(head)]
        if not found:
            raise SystemExit(f'diagram not found: {spec}')
        src = found[0]
    else:
        file, _, idx = spec.partition('#')
        src = mermaid_blocks(DIAGRAMS / file)[int(idx or 1) - 1][1]
    w.picture(render_mermaid(src))
    if cap:
        emit_caption(w, cap)


def emit_caption(w, text):
    parts = caption_parts(text)
    if not parts:
        w.para(text)
        return
    kind, old, rest = parts
    new = NUM.next(w.chapter, kind)
    if w.collect:
        NUM.register(w.path or '', old, new)
    if kind == 'Figure' and not w.last_was_figure:
        w.todo(f'Screenshot or diagram to add: {rest}')
    w.caption(kind, new, rest)
    w.last_was_figure = False


# ------------------------------------------------------------ requirement tables
def requirement_rows(kind):
    text = (ROOT / 'docs' / 'requirements' / 'functional-requirements.md').read_text(encoding='utf-8')
    rows = []
    for ln in text.splitlines():
        if kind == 'fr' and re.match(r'^\| FR-\d+ ', ln):
            c = [x.strip() for x in ln.strip().strip('|').split('|')]
            rows.append(f'| {c[0]} | {c[1]} | {c[2]} | {c[3]} | {c[4] if len(c) > 4 else "—"} |')
        if kind == 'nfr' and re.match(r'^\| NFR-\d+ ', ln):
            rows.append(ln)
    if kind == 'fr':
        rows.sort(key=lambda r: int(re.search(r'FR-(\d+)', r).group(1)))
        head = ['| ID | Requirement | Priority | Use case | Test cases |', '|---|---|---|---|---|']
    else:
        head = ['| ID | Characteristic | Requirement | Measured by |', '|---|---|---|---|']
    return head + rows


# ------------------------------------------------------------ build
def render(w, plan):
    for chapter, entry, meta, bl in plan:
        kind = entry[0]
        if kind == 'chapter':
            w.chapter = chapter
            w.heading(1, entry[2], page_break=True)
            continue
        if kind == 'h':
            w.heading(entry[1], entry[2])
            continue
        if kind == 'p':
            w.path = None
            w.para(entry[1])
            continue
        if kind == 'todo':
            w.path = None
            w.todo(entry[1])
            continue
        if kind == 'skills':
            for name, file in entry[1]:
                w.path = file
                w.local_refs = {}
                w.heading(3, name)
                if not (REPORT / file).exists():
                    w.todo(f'{file}: to be written by {name}')
                    continue
                for bkind, payload in blocks(section_lines(read(file), None)):
                    if bkind == 'para':
                        w.para(payload)
            continue
        if kind == 'references':
            w.heading(1, 'REFERENCES', page_break=True)
            for n, text in REFS.final():
                p = w.doc.add_paragraph()
                p.paragraph_format.left_indent = Cm(1)
                p.paragraph_format.first_line_indent = Cm(-1)
                w.path = None
                w.local_refs = {}
                p.add_run(f'[{n}]\t')
                w.runs(p, re.sub(r'\*\(new\)\*\s*', '', text))
            continue
        _, path, selector, base, opts = entry
        w.path = path
        w.local_refs = meta[1]
        skip = opts.get('skip', ())
        skipping_level = None
        tables_left = opts.get('tables_only')
        first_heading_done = False
        for bkind, payload in bl:
            if bkind == 'heading':
                lv, txt = payload
                if skipping_level and lv <= skipping_level:
                    skipping_level = None
                if any(txt.lstrip('0123456789. ').startswith(s) for s in skip):
                    skipping_level = lv
                    continue
            if skipping_level:
                continue
            if tables_left is not None:
                if bkind == 'table' and tables_left > 0:
                    if opts.get('caption'):
                        emit_caption(w, opts['caption'])
                    w.table(payload, font=Pt(7.5))
                    tables_left -= 1
                continue
            if bkind == 'heading':
                lv, txt = payload
                if re.match(r'^(Table|Code excerpt)\s', txt):
                    emit_caption(w, txt)
                    continue
                if selector not in (None, '__intro__') and not first_heading_done:
                    first_heading_done = True
                    if opts.get('keep_heading'):
                        w.heading(base, txt)
                    elif opts.get('heading_text'):
                        w.heading(base, opts['heading_text'])
                    continue
                first_heading_done = True
                txt = re.sub(r'^\d+\.[xyzw]\.\d+\s+', '', txt)
                txt = re.sub(r'^(Ch\.\d\s+)?Functions of [ABC]\s*[—-]\s*', '', txt)
                offset = 2 if selector in (None, '__intro__') else heading_level_of_selector(selector) + 1
                extra = 1 if (opts.get('keep_heading') or opts.get('heading_text')) else 0
                w.heading(base + extra + (lv - offset), txt)
            elif bkind == 'para':
                w.para(payload)
            elif bkind == 'caption':
                emit_caption(w, payload)
            elif bkind == 'list':
                w.listing(payload)
            elif bkind == 'table':
                if not w.table_captioned:
                    log('table', path, 'table without a caption: ' + payload[0][:70])
                w.table(payload)
            elif bkind == 'code':
                lang, body = payload
                if lang == 'mermaid':
                    w.picture(render_mermaid('\n'.join(body)))
                else:
                    w.code(body)
            elif bkind == 'image':
                alt, rel = payload
                img = (REPORT / Path(path).parent / rel).resolve()
                if not img.exists():
                    w.todo(f'missing image {rel}')
                else:
                    w.picture(img)
            elif bkind == 'directive':
                if payload == 'fr-table':
                    w.table(requirement_rows('fr'), font=Pt(8))
                elif payload == 'nfr-table':
                    w.table(requirement_rows('nfr'), font=Pt(8))
                elif payload.startswith('diagram:'):
                    diagram_directive(w, payload)


def heading_level_of_selector(selector):
    m = re.match(r'^(#+)', selector)
    return len(m.group(1)) if m else 2


# ------------------------------------------------------------ template parts
def paragraphs_everywhere(doc):
    from docx.text.paragraph import Paragraph
    for p in doc.element.body.iter(qn('w:p')):
        yield Paragraph(p, doc._body)


def set_text(p, text):
    runs = p.runs
    if not runs:
        p.add_run(text)
        return
    runs[0].text = text
    for r in runs[1:]:
        r._r.getparent().remove(r._r)


def clone_after(p, text):
    new = copy.deepcopy(p._p)
    p._p.addnext(new)
    from docx.text.paragraph import Paragraph
    np = Paragraph(new, p._parent)
    set_text(np, text)
    return np


def fill_cover_and_declaration(doc, date):
    month = {'11': 'November', '12': 'December'}.get(date.split('/')[1], '')
    for p in list(paragraphs_everywhere(doc)):
        t = p.text.strip()
        if t == 'APPLICATION PROGRAMMING PROJECT REPORT':
            continue
        if t == 'PROJECT TITLE':
            set_text(p, TITLE)
        elif t.startswith('Presented by:'):
            set_text(p, 'Presented by:')
            last = p
            for name, sid, role in MEMBERS:
                last = clone_after(last, f'{name}, {sid} ({role})')
        elif t.startswith('Student ID'):
            p._p.getparent().remove(p._p)
        elif t.startswith('Advisor:'):
            last = p
            for line in (COURSE, CLASS_GROUP, f'Submission date: {date}'):
                last = clone_after(last, line)
        elif t.startswith('Ho Chi Minh City') and '2026' in t and 'Date' not in t:
            set_text(p, f'Ho Chi Minh City, {month} 2026')
        elif t.startswith('I, (Your Full Name)'):
            names = ', '.join(f'{n} ({s})' for n, s, _ in MEMBERS[:-1]) + f' and {MEMBERS[-1][0]} ({MEMBERS[-1][1]})'
            new = p.text.replace('I, (Your Full Name),', f'We, {names},').replace('(Your Project Title)', TITLE.title().replace('And', 'and'))
            new = new.replace(' my own work', ' our own work')
            set_text(p, new)
        elif t.startswith('I confirm'):
            set_text(p, p.text.replace('I confirm', 'We confirm').replace('I understand', 'We understand'))
        elif t.startswith('Ho Chi Minh City, Date'):
            set_text(p, f'Ho Chi Minh City, Date: {date}')
        elif t == 'Signature of Student':
            set_text(p, 'Signatures of Students')
        elif t == '(Your Full Name)':
            set_text(p, '            '.join(n for n, _, _ in MEMBERS))


def add_field(paragraph, instr, placeholder):
    def fld(kind):
        r = OxmlElement('w:r')
        f = OxmlElement('w:fldChar')
        f.set(qn('w:fldCharType'), kind)
        r.append(f)
        return r
    paragraph._p.append(fld('begin'))
    r = OxmlElement('w:r')
    it = OxmlElement('w:instrText')
    it.set(qn('xml:space'), 'preserve')
    it.text = f' {instr} '
    r.append(it)
    paragraph._p.append(r)
    paragraph._p.append(fld('separate'))
    paragraph.add_run(placeholder)
    paragraph._p.append(fld('end'))


def prepare_template(doc):
    body = doc.element.body
    paras = list(doc.paragraphs)
    start = next(i for i, p in enumerate(paras) if p.text.strip() == 'CHAPTER 1: INTRODUCTION')
    # remove the template's sample body from Chapter 1 to the end
    for p in paras[start:]:
        p._p.getparent().remove(p._p)
    for el in list(body):
        if el.tag == qn('w:tbl'):
            pass
    # fields for the contents and the two lists
    for p in doc.paragraphs:
        t = p.text.strip()
        if t == 'TABLE OF CONTENTS':
            np = clone_after(p, '')
            np.style = doc.styles['Normal']
            for r in np.runs:
                r.text = ''
            add_field(np, 'TOC \\o "1-3" \\h \\z \\u', 'Right-click and choose Update Field to build the table of contents.')
    lists = {'LIST OF FIGURES': 'Figure Caption', 'LIST OF TABLES': 'Table Caption'}
    current = None
    for p in doc.paragraphs:
        t = p.text.strip()
        if t in lists:
            current = lists[t]
        elif t == 'If applicable' and current:
            set_text(p, '')
            add_field(p, f'TOC \\h \\z \\t "{current},1"', f'Right-click and choose Update Field to build the list.')
            current = None
    settings = doc.settings.element
    upd = OxmlElement('w:updateFields')
    upd.set(qn('w:val'), 'true')
    settings.append(upd)


def build(template, date, collect):
    doc = Document(template)
    prepare_template(doc)
    fill_cover_and_declaration(doc, date)
    NUM.counters = {}
    LOG.clear()
    w = Writer(doc)
    w.collect = collect
    render(w, list(iter_manifest_blocks()))
    return doc


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    ap = argparse.ArgumentParser()
    ap.add_argument('--template', required=True)
    ap.add_argument('--date', default='27/11/2026')
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)

    build(args.template, args.date, collect=True)    # pass 1: labels and citations
    doc = build(args.template, args.date, collect=False)

    out = OUT / FILE_NAME
    doc.save(out)
    with open(OUT / 'build-log.md', 'w', encoding='utf-8') as f:
        f.write(f'# Build log for {FILE_NAME}' + chr(10) * 2 + 'Still to fill before export:' + chr(10) * 2)
        for kind, where, text in LOG:
            f.write(f'- [{where}] {text}' + chr(10))
    print(out)
    print(f'{len(LOG)} placeholders listed in {OUT / "build-log.md"}')


if __name__ == '__main__':
    main()
