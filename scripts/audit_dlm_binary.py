#!/usr/bin/env python3
"""Read original DLM XLSX structure with Python stdlib only. Never modify the source.

Usage:
    python scripts/audit_dlm_binary.py path/to/dlm-dataset.xlsx --out dlm-binary-audit.json
    python scripts/audit_dlm_binary.py path/to/dlm-dataset.xlsx --baseline data/research/dlm-xlsx-schema-audit.json --out dlm-binary-audit.json
"""
import argparse
import hashlib
import json
import posixpath
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

NS = {
    "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "p": "http://schemas.openxmlformats.org/package/2006/relationships",
}
QN = lambda local: "{" + NS["m"] + "}" + local
CELL_RE = re.compile(r"^([A-Z]+)[1-9][0-9]*$")


def column_index(address):
    match = CELL_RE.match(address)
    if not match:
        raise ValueError("Invalid XLSX cell address: " + address)
    value = 0
    for char in match.group(1):
        value = value * 26 + ord(char) - ord("A") + 1
    return value - 1


def workbook_paths(archive):
    book = ET.fromstring(archive.read("xl/workbook.xml"))
    rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    target_by_id = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels}
    for sheet in book.findall("m:sheets/m:sheet", NS):
        rel_id = sheet.attrib["{" + NS["r"] + "}id"]
        target = target_by_id.get(rel_id)
        if not target:
            raise ValueError("Worksheet relationship missing for " + sheet.attrib["name"])
        if target.startswith("/"):
            path = target.lstrip("/")
        elif target.startswith("xl/"):
            path = target
        else:
            path = posixpath.normpath(posixpath.join("xl", target))
        if not path.startswith("xl/") or ".." in path.split("/"):
            raise ValueError("Unsafe worksheet path: " + path)
        yield sheet.attrib["name"], path


def shared_string_table(archive):
    if "xl/sharedStrings.xml" not in archive.namelist():
        return []
    root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    values = []
    for si in root.findall("m:si", NS):
        values.append("".join(t.text or "" for t in si.iter(QN("t"))))
    return values


def worksheet_rows(archive, path, strings):
    root = ET.fromstring(archive.read(path))
    for row in root.findall("m:sheetData/m:row", NS):
        cells = {}
        for cell in row.findall("m:c", NS):
            address = cell.attrib.get("r", "")
            index = column_index(address)
            cell_type = cell.attrib.get("t")
            v = cell.find("m:v", NS)
            if cell_type == "inlineStr":
                inline = cell.find("m:is", NS)
                value = "".join(t.text or "" for t in inline.iter(QN("t"))) if inline is not None else ""
            elif v is None:
                value = ""
            elif cell_type == "s":
                value = strings[int(v.text or "0")]
            else:
                value = v.text or ""
            cells[index] = value.strip()
        if cells:
            width = max(cells) + 1
            yield [cells.get(i, "") for i in range(width)]


def summarize_sheet(name, rows):
    if not rows:
        return {"sheet_name": name, "row_count": 0, "fields": [], "id_missing": None}
    fields = rows[0]
    body = rows[1:]
    id_col = fields.index("ID") if "ID" in fields else None
    nid_col = fields.index("NID") if "NID" in fields else None
    ids = []
    missing = []
    for row in body:
        ident = row[id_col] if id_col is not None and len(row) > id_col else ""
        if ident:
            ids.append(ident)
        else:
            nid = row[nid_col] if nid_col is not None and len(row) > nid_col else ""
            missing.append({"NID": nid})
    return {
        "sheet_name": name,
        "row_count": len(body),
        "field_count": len(fields),
        "fields": fields,
        "id_filled": len(ids),
        "id_missing": len(missing),
        "id_unique": len(set(ids)),
        "id_duplicate_count": len(ids) - len(set(ids)),
        "missing_id_examples": missing[:10],
    }


def run(args):
    path = Path(args.xlsx)
    if not path.is_file():
        raise FileNotFoundError(str(path))
    size = path.stat().st_size
    digest = hashlib.sha256()
    with path.open("rb") as fp:
        for chunk in iter(lambda: fp.read(1024 * 1024), b""):
            digest.update(chunk)
    results = []
    with zipfile.ZipFile(path) as archive:
        strings = shared_string_table(archive)
        for name, sheet_path in workbook_paths(archive):
            results.append(summarize_sheet(name, list(worksheet_rows(archive, sheet_path, strings))))
    output = {
        "source_file_name": path.name,
        "file_size_bytes": size,
        "sha256": digest.hexdigest(),
        "verified_utc": datetime.now(timezone.utc).isoformat(),
        "source_url": "https://literarymaps.nijl.ac.jp/downloads/dlm-dataset.xlsx",
        "sheets": results,
        "differences_from_remote_summary": [],
        "validation_status": "checked_original_binary",
    }
    if args.baseline:
        baseline = json.loads(Path(args.baseline).read_text(encoding="utf-8"))
        old = {s["sheet_name"]: s for s in baseline["sheets"]}
        for sheet in results:
            ref = old.get(sheet["sheet_name"])
            if not ref:
                output["differences_from_remote_summary"].append(
                    {"sheet": sheet["sheet_name"], "field": "sheet_name", "remote": None, "local": sheet["sheet_name"]}
                )
                continue
            for field in ("row_count", "field_count", "fields", "id_missing", "id_duplicate_count"):
                if sheet.get(field) != ref.get(field):
                    output["differences_from_remote_summary"].append(
                        {"sheet": sheet["sheet_name"], "field": field,
                         "remote": ref.get(field), "local": sheet.get(field)}
                    )
        output["baseline"] = str(args.baseline)
    if args.out:
        dest = Path(args.out)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "sha256": output["sha256"],
        "file_size_bytes": size,
        "sheets": [(r["sheet_name"], r["row_count"], r["id_missing"]) for r in results],
        "difference_count": len(output["differences_from_remote_summary"]),
        "out": args.out
    }, ensure_ascii=False, indent=2))
    return 2 if output["differences_from_remote_summary"] else 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("xlsx", help="Path to original official DLM .xlsx")
    parser.add_argument("--baseline", default="data/research/dlm-xlsx-schema-audit.json")
    parser.add_argument("--out", default="dlm-binary-audit.json")
    args = parser.parse_args()
    try:
        return run(args)
    except (OSError, ValueError, zipfile.BadZipFile, ET.ParseError) as exc:
        print(f"Audit failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
