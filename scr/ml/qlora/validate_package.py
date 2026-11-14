"""Validate generated artifacts with stdlib; optional real Qwen tokenizer probe.

python validate_package.py
python validate_package.py --tokenizer-dir PATH --dependency-dir PATH
The probe renders the inspected no-tools Qwen2.5 ChatML template, without Torch.
"""
import argparse
import ast
import hashlib
import json
import sys
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent


def validate(tokenizer_dir=None, dependency_dir=None):
    manifest = json.loads((HERE / "dataset/manifest.json").read_text(encoding="utf-8"))
    splits = {}
    ids, conversations = set(), set()
    for split, expected in (("train", 360), ("validation", 45), ("test", 45)):
        payload = (HERE / f"dataset/{split}.jsonl").read_bytes()
        assert hashlib.sha256(payload).hexdigest() == manifest["sha256"][f"{split}.jsonl"]
        splits[split] = [json.loads(line) for line in payload.decode("utf-8").splitlines()]
        assert len(splits[split]) == expected
        for row in splits[split]:
            assert row["id"] not in ids
            ids.add(row["id"])
            assert row["synthetic"] is True
            messages = row["messages"]
            assert messages[0]["role"] == "system" and messages[-1]["role"] == "assistant"
            assert all(message["role"] == ("user" if i % 2 else "assistant") for i, message in enumerate(messages[1:], 1))
            assert all(message["content"].strip() for message in messages)
            key = json.dumps(messages, sort_keys=True, ensure_ascii=False)
            assert key not in conversations, "Exact duplicate conversation"
            conversations.add(key)
    families = {split: {row["family"] for row in rows} for split, rows in splits.items()}
    answers = {split: {row["messages"][-1]["content"] for row in rows} for split, rows in splits.items()}
    for left, right in (("train", "validation"), ("train", "test"), ("validation", "test")):
        assert not families[left] & families[right]
        assert not answers[left] & answers[right], "Exact reference answer shared across splits"
    with zipfile.ZipFile(HERE / "jewelry_qlora_dataset.zip") as archive:
        assert archive.testzip() is None
        for file in (HERE / "dataset").iterdir():
            assert archive.read(file.name) == file.read_bytes()
    notebook = json.loads((HERE / "Jewelry_QLoRA_Colab.ipynb").read_text(encoding="utf-8"))
    assert notebook["nbformat"] == 4 and notebook["metadata"]["accelerator"] == "GPU"
    cells = [cell for cell in notebook["cells"] if cell["cell_type"] == "code"]
    assert len(cells) == 12
    for cell in cells:
        ast.parse(cell["source"])
        assert cell["execution_count"] is None and cell["outputs"] == []
    source = (HERE / "colab_cells.py").read_text(encoding="utf-8")
    ast.parse(source)
    print("PASS 450 valid unique conversations; grouped splits; no exact answer leakage; ZIP integrity; 12 clean Python cells")
    report = {"synthetic": True, "expert_reviewed": False, "counts": manifest["counts"], "notebook_code_cells": len(cells), "gpu_training_executed": False, "tokenizer_checked": False}
    if tokenizer_dir:
        if dependency_dir:
            sys.path.insert(0, str(Path(dependency_dir).resolve()))
        from tokenizers import Tokenizer
        native = Tokenizer.from_file(str(Path(tokenizer_dir) / "tokenizer.json"))

        class Probe:
            def apply_chat_template(self, messages, tokenize=True, add_generation_prompt=False):
                assert tokenize and messages[0]["role"] == "system"
                assert all(message["role"] in ("system", "user", "assistant") for message in messages)
                text = "".join(f"<|im_start|>{message['role']}\n{message['content']}<|im_end|>\n" for message in messages)
                if add_generation_prompt:
                    text += "<|im_start|>assistant\n"
                return native.encode(text, add_special_tokens=False).ids

        tree = ast.parse(source)
        definition = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "encode_conversation")
        max_length = next(ast.literal_eval(node.value) for node in tree.body if isinstance(node, ast.Assign) and any(isinstance(target, ast.Name) and target.id == "MAX_LENGTH" for target in node.targets))
        namespace = {"tokenizer": Probe(), "MAX_LENGTH": max_length}
        exec(compile(ast.Module(body=[definition], type_ignores=[]), "notebook-mask", "exec"), namespace)
        lengths, supervised = [], []
        for rows in splits.values():
            for row in rows:
                encoded = namespace["encode_conversation"](row)
                assert len(encoded["input_ids"]) == len(encoded["labels"]) == len(encoded["attention_mask"])
                assert all(label == -100 or label == token for token, label in zip(encoded["input_ids"], encoded["labels"]))
                first_assistant = next(i for i, message in enumerate(row["messages"]) if message["role"] == "assistant")
                prompt_length = len(namespace["tokenizer"].apply_chat_template(row["messages"][:first_assistant], add_generation_prompt=True))
                assert all(value == -100 for value in encoded["labels"][:prompt_length])
                lengths.append(len(encoded["input_ids"]))
                supervised.append(sum(value != -100 for value in encoded["labels"]))
        report.update(tokenizer_checked=True, tokenizer_probe="native tokenizers + inspected no-tools Qwen2.5 ChatML renderer", model_revision=(Path(tokenizer_dir) / "revision.txt").read_text().strip(), max_tokens=max(lengths), min_tokens=min(lengths), max_length=max_length, min_supervised_tokens=min(supervised))
        print(f"PASS actual Qwen tokenizer: {len(lengths)} samples; max={max(lengths)}/{max_length} tokens; assistant masks valid")
    (HERE / "validation_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--tokenizer-dir")
    parser.add_argument("--dependency-dir")
    arguments = parser.parse_args()
    validate(arguments.tokenizer_dir, arguments.dependency_dir)
