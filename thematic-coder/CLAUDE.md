# Thematic Coder Workspace

## What this is

A Claude Code workspace for automated thematic coding of qualitative research documents on mobile AI usage.

## Slash command

`/thematic-coder` — runs the full coding workflow on documents in `inputs/`

## Working directories

| Directory | Purpose |
|---|---|
| `inputs/` | Drop source documents here (.docx, .pdf, .pptx, .xlsx, .txt) |
| `inputs_md/` | Auto-generated markdown conversions (do not edit manually) |
| `outputs/` | Evidence table, updated codebook, processing log |
| `done/` | Processed source files (moved here after archiving) |

## Seed codebook

`codebook.md` — 15 seed codes covering mobile AI governance, prompting discipline, and operational practices for phone-based AI work.

## Dependencies

```
pip install pypdf python-docx python-pptx openpyxl
```

## Scripts

| Script | Purpose |
|---|---|
| `python scripts/convert_inputs.py` | Convert source documents to markdown |
| `python scripts/thematic_coder.py status` | Show processing state |
| `python scripts/thematic_coder.py verify` | Re-verify all quotes against sources |
| `python scripts/thematic_coder.py archive` | Archive outputs and reset for next run |

## Rules

This workspace is for thematic coding only. Do not use it for general writing tasks.
