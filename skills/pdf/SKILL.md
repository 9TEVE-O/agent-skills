---
name: pdf
description: Process PDF files — extract text/tables, create PDFs programmatically, merge/split/rotate pages, add watermarks, handle OCR on scanned documents, manage passwords. Use whenever a .pdf file is involved as input or output.
---

# PDF Processing

A toolkit for working with PDF files using Python libraries and command-line tools.

## Quick Reference

| Task | Tool |
|------|------|
| Extract text (layout-preserving) | `pdfplumber` |
| Merge / split / rotate pages | `pypdf` |
| Create PDFs programmatically | `reportlab` |
| OCR on scanned documents | `pdf2image` + `pytesseract` |
| Terminal operations | `pdftotext`, `qpdf`, `pdftk` |

## Core Libraries

### pypdf — Page Operations

```python
from pypdf import PdfReader, PdfWriter

# Merge PDFs
writer = PdfWriter()
for path in ["a.pdf", "b.pdf"]:
    reader = PdfReader(path)
    for page in reader.pages:
        writer.add_page(page)
with open("merged.pdf", "wb") as f:
    writer.write(f)

# Extract metadata
reader = PdfReader("doc.pdf")
print(reader.metadata)

# Rotate pages
page = reader.pages[0]
page.rotate(90)
```

### pdfplumber — Text & Table Extraction

```python
import pdfplumber

with pdfplumber.open("document.pdf") as pdf:
    # Extract text preserving layout
    text = pdf.pages[0].extract_text()

    # Extract tables → DataFrame
    table = pdf.pages[0].extract_table()
    import pandas as pd
    df = pd.DataFrame(table[1:], columns=table[0])
```

### reportlab — Create PDFs Programmatically

```python
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.styles import getSampleStyleSheet

doc = SimpleDocTemplate("output.pdf", pagesize=letter)
styles = getSampleStyleSheet()
story = [Paragraph("Hello World", styles["Normal"])]
doc.build(story)
```

**Important**: Never use Unicode subscript/superscript characters in ReportLab. Use XML markup tags:

```python
Paragraph("H<sub>2</sub>O and E=mc<super>2</super>", styles["Normal"])
```

## Command-Line Tools

```bash
# Extract text
pdftotext document.pdf output.txt

# Merge
qpdf --empty --pages a.pdf b.pdf -- merged.pdf

# Extract pages 2-5
qpdf --pages document.pdf 2-5 -- extracted.pdf

# Remove password
qpdf --password=secret --decrypt protected.pdf output.pdf
```

## OCR for Scanned PDFs

```python
from pdf2image import convert_from_path
import pytesseract

# Convert PDF pages to images
pages = convert_from_path("scanned.pdf", dpi=300)

# Extract text from each page
for i, page in enumerate(pages):
    text = pytesseract.image_to_string(page)
    print(f"Page {i+1}:\n{text}")
```

## Specialized Operations

### Watermarking

```python
from pypdf import PdfReader, PdfWriter

watermark = PdfReader("watermark.pdf").pages[0]
writer = PdfWriter()
for page in PdfReader("original.pdf").pages:
    page.merge_page(watermark)
    writer.add_page(page)
```

### Password Protection

```python
writer = PdfWriter()
# ... add pages ...
writer.encrypt("password123")
with open("protected.pdf", "wb") as f:
    writer.write(f)
```

### Image Extraction

```python
from pypdf import PdfReader

reader = PdfReader("document.pdf")
for page in reader.pages:
    for image in page.images:
        with open(image.name, "wb") as f:
            f.write(image.data)
```

## Reference Files

- `FORMS.md` — PDF form completion
- `REFERENCE.md` — Advanced features and troubleshooting

## Dependencies

```bash
pip install pypdf pdfplumber reportlab pdf2image pytesseract
# System: poppler-utils (pdftotext, pdftoppm), qpdf, pdftk
```
