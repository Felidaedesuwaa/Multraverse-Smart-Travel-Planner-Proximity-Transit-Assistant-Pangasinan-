"""Fine-tune TinyLlama with a LoRA adapter for the Pangasinan starter dataset.

Run from this directory with:
    .\\venv\\Scripts\\python.exe train.py

The dataset currently contains deliberately unreviewed source material.  Pass
``--allow-unreviewed`` only after reviewing the records described in README.md.
"""

import argparse
import json
import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
# Configure Hugging Face cache locations before Transformers is imported.
load_dotenv(ROOT / ".env")
for cache_variable in ("HF_HOME", "TRANSFORMERS_CACHE", "HF_DATASETS_CACHE"):
    cache_path = os.getenv(cache_variable)
    if cache_path and not Path(cache_path).is_absolute():
        os.environ[cache_variable] = str((ROOT / cache_path).resolve())

import torch
from datasets import Dataset
from peft import LoraConfig, TaskType, get_peft_model
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    DataCollatorForSeq2Seq,
    Trainer,
    TrainingArguments,
)


BASE_MODEL = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
OUTPUT_DIR = ROOT / "model" / "pangasinan-travel-model"
DATA_FILE = ROOT / "data" / "combined_training_data.jsonl"
PROVENANCE_FILE = ROOT / "data" / "provenance.json"
MAX_LENGTH = 512


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--allow-unreviewed",
        action="store_true",
        help="train despite provenance records marked unreviewed",
    )
    return parser.parse_args()


def verify_review_status(allow_unreviewed: bool) -> None:
    provenance = json.loads(PROVENANCE_FILE.read_text(encoding="utf-8"))
    unreviewed = [record for record in provenance if record["review_status"] != "reviewed"]
    if unreviewed and not allow_unreviewed:
        raise SystemExit(
            f"Refusing to train on {len(unreviewed)} unreviewed records. "
            "Review and update data/provenance.json, or explicitly pass "
            "--allow-unreviewed for an experimental run."
        )


def load_data(file_path: Path) -> Dataset:
    records = []
    for line_number, line in enumerate(file_path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        item = json.loads(line)
        if not all(isinstance(item.get(key), str) and item[key].strip() for key in ("instruction", "response")):
            raise ValueError(f"Invalid instruction/response record at line {line_number}")
        records.append(
            {
                "prompt": f"<|user|>\n{item['instruction']}\n<|assistant|>\n",
                "response": item["response"],
            }
        )
    if not records:
        raise ValueError(f"No training records found in {file_path}")
    return Dataset.from_list(records)


def main() -> None:
    args = parse_args()
    verify_review_status(args.allow_unreviewed)

    print("Loading tokenizer and model...")
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        torch_dtype=torch.float32,
    )
    model.config.pad_token_id = tokenizer.pad_token_id

    lora_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=8,
        lora_alpha=32,
        target_modules=["q_proj", "v_proj"],
        lora_dropout=0.05,
        bias="none",
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    print("Preparing dataset...")
    dataset = load_data(DATA_FILE)

    def tokenize(examples):
        # Mask the prompt so loss is computed only for the desired assistant reply.
        prompts = tokenizer(examples["prompt"], add_special_tokens=False)["input_ids"]
        encoded = tokenizer(
            [prompt + response for prompt, response in zip(examples["prompt"], examples["response"])],
            truncation=True,
            max_length=MAX_LENGTH,
            padding="max_length",
        )
        labels = []
        for input_ids, prompt_ids in zip(encoded["input_ids"], prompts):
            prompt_length = min(len(prompt_ids), MAX_LENGTH)
            label = input_ids.copy()
            label[:prompt_length] = [-100] * prompt_length
            label = [-100 if token == tokenizer.pad_token_id else token for token in label]
            labels.append(label)
        encoded["labels"] = labels
        return encoded

    tokenized = dataset.map(tokenize, batched=True, remove_columns=dataset.column_names)

    training_args = TrainingArguments(
        output_dir=str(OUTPUT_DIR),
        num_train_epochs=3,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        learning_rate=2e-4,
        fp16=False,
        logging_steps=10,
        save_steps=50,
        save_total_limit=2,
        report_to="none",
    )
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized,
        data_collator=DataCollatorForSeq2Seq(tokenizer, model=model, padding=True),
    )

    print("Starting training...")
    trainer.train()
    print("Saving model...")
    model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    print(f"Model saved to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
