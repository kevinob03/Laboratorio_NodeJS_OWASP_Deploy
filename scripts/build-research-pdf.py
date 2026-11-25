from pathlib import Path
import re
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs' / 'deep-research.md'
DEST = ROOT / 'output' / 'pdf' / 'deep-research.pdf'
DEST.parent.mkdir(parents=True, exist_ok=True)

INK = colors.HexColor('#173B36')
GREEN = colors.HexColor('#246453')
PALE = colors.HexColor('#EFF4F0')
ORANGE = colors.HexColor('#A85E35')
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='DocTitle', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=19, leading=23, textColor=INK, alignment=TA_LEFT, spaceAfter=6))
styles.add(ParagraphStyle(name='Meta', parent=styles['Normal'], fontSize=8, leading=11, textColor=colors.HexColor('#586963'), spaceAfter=3))
styles.add(ParagraphStyle(name='H1x', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=13, leading=16, textColor=INK, spaceBefore=10, spaceAfter=5, keepWithNext=True))
styles.add(ParagraphStyle(name='H2x', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=10, leading=13, textColor=GREEN, spaceBefore=7, spaceAfter=3, keepWithNext=True))
styles.add(ParagraphStyle(name='Bodyx', parent=styles['BodyText'], fontName='Helvetica', fontSize=8.6, leading=11.5, textColor=colors.HexColor('#243B36'), spaceAfter=4, alignment=TA_LEFT, wordWrap='CJK'))
styles.add(ParagraphStyle(name='Smallx', parent=styles['BodyText'], fontName='Helvetica', fontSize=7.3, leading=9.2, textColor=colors.HexColor('#243B36'), wordWrap='CJK'))
styles.add(ParagraphStyle(name='TableHeadx', parent=styles['BodyText'], fontName='Helvetica-Bold', fontSize=7.2, leading=8.5, textColor=colors.white))
styles.add(ParagraphStyle(name='CodeX', parent=styles['Code'], fontName='Courier', fontSize=7.8, leading=10, backColor=PALE, borderPadding=6, textColor=INK, leftIndent=5, rightIndent=5, spaceBefore=4, spaceAfter=6))

def inline_markup(text):
    out = escape(text)
    out = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', out)
    out = re.sub(r'`(.+?)`', r'<font name="Courier">\1</font>', out)
    out = re.sub(r'(https?://[^\s]+)', r'<link href="\1" color="#246453">\1</link>', out)
    return out

def footer(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setStrokeColor(colors.HexColor('#DCE3DC'))
    canvas.line(20*mm, 15*mm, w-20*mm, 15*mm)
    canvas.setFont('Helvetica', 7)
    canvas.setFillColor(colors.HexColor('#687973'))
    canvas.drawString(20*mm, 10*mm, 'SecureVault | Deep Research | 25 noviembre 2026')
    canvas.drawRightString(w-20*mm, 10*mm, f'Pág. {doc.page}')
    canvas.restoreState()

lines = SOURCE.read_text(encoding='utf-8-sig').splitlines()
story = []
i = 0
while i < len(lines):
    line = lines[i].strip()
    if not line:
        i += 1
        continue
    if line.startswith('```'):
        block = []
        i += 1
        while i < len(lines) and not lines[i].startswith('```'):
            block.append(lines[i])
            i += 1
        story.append(Paragraph('<br/>'.join(escape(row) for row in block), styles['CodeX']))
        i += 1
        continue
    if line.startswith('|'):
        table_rows = []
        while i < len(lines) and lines[i].strip().startswith('|'):
            row = [cell.strip() for cell in lines[i].strip().strip('|').split('|')]
            if not all(re.fullmatch(r':?-{2,}:?', cell or '-') for cell in row):
                table_rows.append(row)
            i += 1
        matrix = []
        for ridx, row in enumerate(table_rows):
            cell_style = styles['TableHeadx'] if ridx == 0 else styles['Smallx']
            matrix.append([Paragraph(inline_markup(cell), cell_style) for cell in row])
        count = len(matrix[0])
        if count == 4:
            widths = [35*mm, 40*mm, 42*mm, 53*mm]
        elif count == 2:
            widths = [48*mm, 88*mm]
        else:
            widths = [136*mm/count] * count
        tbl = Table(matrix, colWidths=widths, repeatRows=1, hAlign='LEFT')
        tbl.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(-1,0),GREEN),('TEXTCOLOR',(0,0),(-1,0),colors.white),
            ('BACKGROUND',(0,1),(-1,-1),colors.white),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,PALE]),
            ('GRID',(0,0),(-1,-1),0.35,colors.HexColor('#D5DED8')),
            ('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),
            ('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4)
        ]))
        story.extend([Spacer(1,3),tbl,Spacer(1,5)])
        continue
    if line.startswith('# '):
        story.append(Paragraph(inline_markup(line[2:]), styles['DocTitle']))
        i += 1
        continue
    if line.startswith('## '):
        story.append(Paragraph(inline_markup(line[3:]), styles['H1x']))
        i += 1
        continue
    if line.startswith('**Curso:**'):
        story.append(Paragraph(inline_markup(line), styles['Meta']))
        i += 1
        continue
    if line.startswith('**') and line.endswith('**'):
        story.append(Paragraph(inline_markup(line), styles['H2x']))
        i += 1
        continue
    if line.startswith('- '):
        story.append(Paragraph(inline_markup(line[2:]), styles['Bodyx'], bulletText='•'))
        i += 1
        continue
    if re.match(r'^\d+\. ', line):
        story.append(Paragraph(inline_markup(line), styles['Smallx']))
        i += 1
        continue
    para = [line]
    i += 1
    while i < len(lines) and lines[i].strip() and not lines[i].lstrip().startswith(('#','|','```','- ')) and not re.match(r'^\d+\. ',lines[i].strip()):
        para.append(lines[i].strip())
        i += 1
    story.append(Paragraph(inline_markup(' '.join(para)), styles['Bodyx']))

doc = SimpleDocTemplate(str(DEST), pagesize=A4, rightMargin=20*mm, leftMargin=20*mm, topMargin=16*mm, bottomMargin=21*mm, title='Deep Research: despliegue de SecureVault', author='Equipo SecureVault')
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(DEST)
