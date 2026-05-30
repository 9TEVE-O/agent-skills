# Thematic Coder — Orchestrator

## Slash command
`/thematic-coder`

## What this does

Runs automated thematic coding on documents in `inputs/`. Uses an orchestrator-subagent architecture: each document is coded by a fresh subagent with a clean context, keeping token usage manageable and coding focus tight.

---

## Step 1 — Convert source documents

Run:
```
python scripts/convert_inputs.py
```

This converts any .docx, .pdf, .pptx, .xlsx, or .txt files in `inputs/` to markdown in `inputs_md/`. Skips files already converted. Print the conversion summary.

If conversion fails for any file, note the error and continue — do not stop the workflow.

---

## Step 2 — Check state

Read `outputs/state.json`. If it does not exist, create it:
```json
{
  "processed": [],
  "pending": []
}
```

Scan `inputs_md/` for all .md files. Any file not in the `processed` list is pending.

If no files are pending, print "No new files to process" and skip to Step 5 (verification).

---

## Step 3 — Code each document

For each pending file, in alphabetical order:

**Before launching the subagent, read:**
- `codebook.md` (full current contents)
- `.claude/skills/thematic-coder/coding-rules.md` (full contents)
- `outputs/evidence_table.csv` (to determine the next row ID; if file does not exist, next ID = 1)

**Launch a subagent** with the following instruction. Replace bracketed placeholders with actual content.

---
```
You are a thematic coding assistant for qualitative research on mobile AI usage.

Your task: code the document below against the provided codebook. Follow all coding rules exactly.

=== CODEBOOK ===
[INSERT FULL CONTENTS OF codebook.md]

=== CODING RULES ===
[INSERT FULL CONTENTS OF coding-rules.md]

=== DOCUMENT TO CODE ===
Filename: [FILENAME]

[INSERT FULL DOCUMENT CONTENTS]

=== YOUR OUTPUT ===

Part 1 — Evidence rows (CSV format, one row per coded segment):

id,theme,sub_theme,verbatim_quote,source_file,paragraph_ref,notes
[start from row ID [NEXT_ROW_ID]]

Rules for evidence rows:
- verbatim_quote must be an exact, contiguous substring of the source text
- No paraphrasing, no ellipses, no editorial markers
- theme and sub_theme must match a code name from the codebook exactly (case-sensitive)
- paragraph_ref: use the nearest heading, or "para N" counting from top of document
- notes: leave blank unless flagging [NEEDS HUMAN REVIEW]
- Same theme/sub_theme combo cannot appear twice on the same quote

Part 2 — New code definitions (only if genuinely needed):

If you identify a concept clearly not covered by the existing 15 codes, define a new code in this format:

## [Code name]
- **Definition:** [what this captures]
- **Sub-codes:** [sub-code names, or "None"]
- **Inclusion rule:** Use when evidence directly describes [concept] in mobile AI work.
- **Exclusion rule:** Do not use for generic productivity advice unless it contains an explicit mobile-AI control, boundary, or governance mechanism.
- **Example quote:** "[verbatim quote from this document]"

If no new codes are needed, write: No new codes.
```
---

**After the subagent returns:**
1. Append its evidence rows to `outputs/evidence_table.csv` (create file with header row if it does not exist: `id,theme,sub_theme,verbatim_quote,source_file,paragraph_ref,notes`)
2. If new codes are defined, append them to `codebook.md`
3. Mark the file as processed: add its filename to the `processed` list in `outputs/state.json`
4. Append to `outputs/processing_log.txt`: `[ISO timestamp] Processed [filename]: [N] rows added, [N] new codes`

Repeat for all pending files.

---

## Step 4 — Consolidation pass

After all documents are coded, review `codebook.md` for near-duplicate codes — codes with similar names that likely represent the same concept.

For each merge candidate:
1. Confirm the merge is semantically justified
2. Choose the cleaner, more specific name
3. Update all affected rows in `outputs/evidence_table.csv` to use the merged name
4. In `codebook.md`, keep one entry and add a note: `Merged from: [old name(s)]`
5. Log each merge in `outputs/processing_log.txt`: `[ISO timestamp] Merged: [old name] → [new name]`

If no near-duplicates found, skip this step.

---

## Step 5 — Verification pass

For every row in `outputs/evidence_table.csv`:
1. Open the corresponding file in `inputs_md/` (match on source_file column)
2. Confirm the verbatim_quote is an exact substring of the file content
3. Pass: no action
4. Fail: append `[VERIFICATION FAILED]` to the notes column for that row

Log results: `[ISO timestamp] Verification: [N] passed, [N] failed`

---

## Step 6 — Print summary

```
Thematic coding complete.

Files processed:        [N]
New codes added:        [N]
Codes merged:           [N]
Evidence rows added:    [N]
Verification failures:  [N]

Outputs:
  outputs/evidence_table.csv
  codebook.md (updated)
  outputs/processing_log.txt

Next: run `python scripts/thematic_coder.py verify` for a standalone quote check.
To archive and reset: run `python scripts/thematic_coder.py archive`
```
