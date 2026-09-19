"""Rebuild the starter dataset from supplied examples and the project phrasebook."""

import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent


def main():
    records = []
    provenance = []
    seen = set()

    def add(record, source, group):
        if set(record) != {"instruction", "response"} or any(
            not isinstance(value, str) or not value.strip() for value in record.values()
        ):
            raise ValueError(f"Invalid instruction/response record in {source}")
        if record["instruction"] in seen:
            raise ValueError(f"Duplicate instruction: {record['instruction']}")
        seen.add(record["instruction"])
        records.append(record)
        provenance.append({"line": len(records), "source": source,
                           "group": group, "review_status": "unreviewed"})

    examples = ROOT / "data/examples.jsonl"
    for number, line in enumerate(examples.read_text(encoding="utf-8").splitlines(), 1):
        add(json.loads(line), "user-provided examples", f"example:{number}")

    seed = ROOT.parent / "server/seeds/seedPhrasebook.ts"
    # Match the current seed's single-quoted fields; fail rather than silently
    # omit records if its schema/format changes.
    field = r"'((?:\\.|[^'\\])*)'"
    pattern = r"\{\s*filipino:\s*" + field + r",\s*pangasinan:\s*" + field + r",\s*english:\s*" + field
    source = seed.read_text(encoding="utf-8")
    phrases = re.findall(pattern, source)
    if not phrases or len(phrases) != len(re.findall(r"\{\s*filipino:", source)):
        raise ValueError("Phrasebook format changed; update the extractor before rebuilding")
    for number, (_, pangasinan, english) in enumerate(phrases, 1):
        pangasinan = pangasinan.replace("\\'", "'").replace("\\\\", "\\")
        english = english.replace("\\'", "'").replace("\\\\", "\\")
        for from_language, to_language, text, response in (
            ("English", "Pangasinan", english, pangasinan),
            ("Pangasinan", "English", pangasinan, english),
        ):
            add({"instruction": f"Translate from {from_language} to {to_language}: {text}",
                 "response": response}, "server/seeds/seedPhrasebook.ts", f"phrase:{number}")

    destination = ROOT / "data/pangasinan_itinerary.jsonl"
    destination.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in records), encoding="utf-8")
    (ROOT / "data/provenance.json").write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Validated and wrote {len(records)} records ({len(phrases)} phrasebook pairs).")


if __name__ == "__main__":
    main()
