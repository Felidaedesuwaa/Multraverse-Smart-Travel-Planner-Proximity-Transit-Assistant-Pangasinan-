"""Combine the itinerary and Pangasinan phrasebook datasets.

Run from the ai-service directory:
    python data/combine_data.py
"""

from pathlib import Path


DATA_DIR = Path(__file__).resolve().parent
FILES = (
    "pangasinan_itinerary.jsonl",
    "pangasinan_phrasebook.jsonl",
)
OUTPUT = DATA_DIR / "combined_training_data.jsonl"


def main() -> None:
    records_written = 0

    with OUTPUT.open("w", encoding="utf-8", newline="\n") as output_file:
        for filename in FILES:
            input_path = DATA_DIR / filename
            if not input_path.exists():
                print(f"Skipping missing dataset: {input_path}")
                continue

            with input_path.open("r", encoding="utf-8") as input_file:
                for line in input_file:
                    line = line.strip()
                    if line:
                        output_file.write(f"{line}\n")
                        records_written += 1

    print(f"Combined {records_written} records into {OUTPUT}")


if __name__ == "__main__":
    main()
