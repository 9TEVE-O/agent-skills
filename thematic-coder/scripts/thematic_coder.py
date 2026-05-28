#!/usr/bin/env python3
"""Status, verify, and archive utilities for the thematic coder."""

import csv
import json
import os
import shutil
import sys
from datetime import datetime
from pathlib import Path

INPUTS_DIR = Path("inputs")
INPUTS_MD_DIR = Path("inputs_md")
OUTPUTS_DIR = Path("outputs")
DONE_DIR = Path("done")
STATE_FILE = OUTPUTS_DIR / "state.json"
EVIDENCE_FILE = OUTPUTS_DIR / "evidence_table.csv"
CODEBOOK_FILE = Path("codebook.md")
LOG_FILE = OUTPUTS_DIR / "processing_log.txt"


def cmd_status():
    source_files = []
    if INPUTS_DIR.exists():
        source_files = [f for f in INPUTS_DIR.iterdir() if f.is_file() and not f.name.startswith(".")]

    md_files = []
    if INPUTS_MD_DIR.exists():
        md_files = list(INPUTS_MD_DIR.glob("*.md"))

    state = {"processed": [], "pending": []}
    if STATE_FILE.exists():
        state = json.loads(STATE_FILE.read_text())

    processed = state.get("processed", [])

    evidence_rows = 0
    if EVIDENCE_FILE.exists():
        with open(EVIDENCE_FILE, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            evidence_rows = sum(1 for _ in reader)

    codebook_codes = 0
    if CODEBOOK_FILE.exists():
        codebook_codes = CODEBOOK_FILE.read_text().count("\n## ")

    pending = [f.name for f in md_files if f.name not in processed]

    print("-- Thematic Coder Status --")
    print(f"  Source files in inputs/:   {len(source_files)}")
    print(f"  Converted to markdown:     {len(md_files)}")
    print(f"  Processed:                 {len(processed)}")
    print(f"  Pending:                   {len(pending)}")
    if pending:
        for f in sorted(pending):
            print(f"    - {f}")
    print(f"  Evidence rows:             {evidence_rows}")
    print(f"  Codes in codebook:         {codebook_codes}")
    print("---------------------------")


def cmd_verify():
    if not EVIDENCE_FILE.exists():
        print("No evidence table found at outputs/evidence_table.csv")
        return

    with open(EVIDENCE_FILE, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    if not rows:
        print("Evidence table is empty.")
        return

    verified = 0
    failed = 0
    failures = []

    for row in rows:
        source = row.get("source_file", "")
        quote = row.get("verbatim_quote", "")
        row_id = row.get("id", "?")

        md_path = INPUTS_MD_DIR / (Path(source).stem + ".md")
        if not md_path.exists():
            failures.append((row_id, source, "source markdown not found"))
            failed += 1
            continue

        content = md_path.read_text(encoding="utf-8")
        if quote in content:
            verified += 1
        else:
            failures.append((row_id, source, "quote not found verbatim in source"))
            failed += 1

    print("-- Verification Results --")
    print(f"  Verified: {verified}")
    print(f"  Failed:   {failed}")
    if failures:
        print("\n  Failures:")
        for row_id, source, reason in failures:
            print(f"    Row {row_id} ({source}): {reason}")
    print("--------------------------")

    if failed > 0:
        print("\nReview failed rows in evidence_table.csv or re-run /thematic-coder.")


def cmd_archive():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    archive_dir = OUTPUTS_DIR / f"archive_{timestamp}"
    archive_dir.mkdir(parents=True, exist_ok=True)

    moved_outputs = []
    if OUTPUTS_DIR.exists():
        for f in OUTPUTS_DIR.iterdir():
            if f.is_file() and f.name != ".gitkeep":
                shutil.move(str(f), str(archive_dir / f.name))
                moved_outputs.append(f.name)

    DONE_DIR.mkdir(exist_ok=True)
    moved_source = []
    if INPUTS_DIR.exists():
        for f in INPUTS_DIR.iterdir():
            if f.is_file() and not f.name.startswith("."):
                shutil.move(str(f), str(DONE_DIR / f.name))
                moved_source.append(f.name)

    moved_md = []
    if INPUTS_MD_DIR.exists():
        for f in INPUTS_MD_DIR.iterdir():
            if f.is_file() and not f.name.startswith("."):
                shutil.move(str(f), str(archive_dir / f.name))
                moved_md.append(f.name)

    print("-- Archive Complete --")
    print(f"  Archive created:          {archive_dir}")
    print(f"  Output files archived:    {len(moved_outputs)}")
    print(f"  Source files -> done/:    {len(moved_source)}")
    print(f"  Markdown files archived:  {len(moved_md)}")
    print("  outputs/ and inputs_md/ reset -- ready for next run")
    print("---------------------")


COMMANDS = {
    "status": cmd_status,
    "verify": cmd_verify,
    "archive": cmd_archive,
}

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        print(f"Usage: python scripts/thematic_coder.py [{' | '.join(COMMANDS)}]")
        sys.exit(1)
    COMMANDS[sys.argv[1]]()
