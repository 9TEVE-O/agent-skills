---
name: xlsx
description: Work with Excel and spreadsheet files (.xlsx, .xlsm, .csv, .tsv) — open, edit, create, analyze, or convert them. Use when spreadsheets are the primary input or output. Does NOT trigger for Word documents, HTML reports, or database pipelines.
---

# Excel / Spreadsheet Skill

A guide for working with Excel files using Python's `openpyxl` and `pandas` libraries.

## Library Selection

| Task | Library |
|------|--------|
| Formula-based work, cell formatting, Excel features | `openpyxl` |
| Data analysis, transformations, CSV/TSV | `pandas` |
| Recalculate formulas, detect errors | `scripts/recalc.py` |

## Professional Standards

All Excel deliverables must:
- Use consistent, professional fonts
- Have zero formula errors
- Preserve existing template formatting (never replace formulas with hardcoded values)

## openpyxl — Formula-Based Work

```python
import openpyxl

wb = openpyxl.load_workbook("template.xlsx")
ws = wb.active

# Cell references are 1-based (row, column)
ws.cell(row=2, column=3).value = "=SUM(A2:B2)"  # Write formula, not value

# Preserve formatting when editing
cell = ws["B5"]
cell.value = "=D5*1.1"  # Keep as formula; recalc.py will evaluate

wb.save("output.xlsx")
```

**Critical**: Use Excel formulas rather than hardcoded Python calculations. Formulas stay live.

## pandas — Data Analysis

```python
import pandas as pd

# Read
df = pd.read_excel("data.xlsx", sheet_name="Sales")

# Transform
df["Revenue"] = df["Units"] * df["Price"]
monthly = df.groupby("Month")["Revenue"].sum()

# Write back
with pd.ExcelWriter("output.xlsx", engine="openpyxl") as writer:
    df.to_excel(writer, sheet_name="Data", index=False)
    monthly.to_excel(writer, sheet_name="Summary")
```

## Formula Recalculation

After writing formulas, recalculate and check for errors:

```bash
python scripts/recalc.py output.xlsx
```

Returns JSON with formula values and error locations (`#REF!`, `#DIV/0!`, `#VALUE!`, etc.). Fix all errors before declaring the file complete.

## Financial Model Color Coding

| Color | Meaning |
|-------|---------|
| Blue text | Input assumptions (hardcoded values) |
| Black text | Formulas (calculated) |
| Green text | Internal links (references within same file) |
| Red text | External links (references to other files) |
| Yellow background | Key assumptions cell |

## Number Formatting

```python
from openpyxl.styles import numbers

# Currency with unit label
cell.number_format = '$#,##0.00'

# Percentage (1 decimal place)
cell.number_format = '0.0%'

# Negative numbers in parentheses
cell.number_format = '#,##0.00_);(#,##0.00)'
```

## Dependencies

```bash
pip install openpyxl pandas
```
