"""Build a clean notebook without requiring nbformat or ML libraries locally."""
import ast
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent


def cell(kind, content, index):
    result = {"cell_type": kind, "id": f"mira-{index:02d}", "metadata": {}, "source": content.strip() + "\n"}
    if kind == "code":
        result.update(execution_count=None, outputs=[])
    return result


def build():
    source = (HERE / "colab_cells.py").read_text(encoding="utf-8")
    sections = re.split(r"^# %% (.+)\n", source, flags=re.MULTILINE)
    intro = """# MIRA — fine-tuning tiếng Việt với QLoRA trên Google Colab

**Bước 1:** Runtime → Change runtime type → chọn **T4 GPU** (nếu Colab cấp), rồi chạy từ ô 1 xuống.
Upload `jewelry_qlora_dataset.zip` ở ô 3. GPU được dùng là GPU Colab, không phải NVIDIA trên máy cá nhân.

Base: `Qwen/Qwen2.5-3B-Instruct`; NF4 4-bit + LoRA r=8; batch 1; gradient accumulation 16; 768 tokens; 3 epochs.
T4 dùng FP16, GPU hỗ trợ BF16 sẽ được phát hiện tự động. Không cần Flash Attention hay thư viện trả phí.
Các phiên bản thư viện đã được ghim. Cấu hình đã chạy đủ 3 epochs trên Colab T4 ngày 14/11/2026;
test loss giảm 2,7213 → 1,5610, nhưng có overfit và còn lỗi trả lời. Xem báo cáo trong bộ tệp đi kèm.

**Dataset:** 450 mẫu tổng hợp = 50 tình huống viết sẵn × 9 biến thể tiền tố; chưa qua chuyên gia thẩm định.
Chia theo nhóm tình huống: train 360 / validation 45 / test 45. Mẫu nhiều lượt có giữ lịch sử; không bịa giá, tồn kho hoặc chính sách.
Đây là bộ khởi đầu để kiểm tra pipeline, không phải 450 hội thoại độc lập hay bằng chứng hiệu quả thực tế.

Notebook tự kiểm tra dữ liệu, mask loss chỉ trên assistant, kiểm tra forward/backward, train, lưu checkpoint,
đánh giá test trước/sau, vẽ loss, lưu adapter, thử nạp lại và tải ZIP kết quả.
`USE_DRIVE=True` ở ô 2 nếu muốn lưu checkpoint trên Drive. Colab có thể ngắt phiên; dữ liệu `/content` có thể mất.
`SMOKE_TEST_ONLY=True` chỉ chạy 2 steps để thử pipeline; đổi về False và dùng phiên mới cho thực nghiệm đầy đủ.

Nếu OOM: restart session, giảm `MAX_LENGTH` xuống 512 (ô tokenize sẽ báo nếu mẫu quá dài), hoặc đổi sang
`Qwen/Qwen2.5-1.5B-Instruct`. Giữ batch=1. VRAM khả dụng còn phụ thuộc runtime và các tiến trình khác.
Không chạy lại toàn notebook trong cùng phiên khi model cũ vẫn chiếm GPU.

Tài liệu: [Qwen model card](https://huggingface.co/Qwen/Qwen2.5-3B-Instruct),
[PEFT quantization](https://huggingface.co/docs/peft/v0.17.0/en/developer_guides/quantization),
[Trainer 4.57.1](https://huggingface.co/docs/transformers/v4.57.1/en/main_classes/trainer).
Model 3B dùng [Qwen Research License](https://huggingface.co/Qwen/Qwen2.5-3B-Instruct/blob/main/LICENSE); đọc điều kiện trước khi triển khai.
Notebook không thay model Gemini trong website và không huấn luyện lại model Logistic Regression.
"""
    cells = [cell("markdown", intro, 0)]
    for index in range(1, len(sections), 2):
        title, code = sections[index], sections[index + 1]
        ast.parse(code)
        cells.append(cell("markdown", "## " + title, len(cells)))
        cells.append(cell("code", code, len(cells)))
    notebook = {
        "nbformat": 4, "nbformat_minor": 5,
        "metadata": {"colab": {"name": "Jewelry_QLoRA_Colab.ipynb", "provenance": []}, "accelerator": "GPU",
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"name": "python", "version": "3.11"}},
        "cells": cells,
    }
    target = HERE / "Jewelry_QLoRA_Colab.ipynb"
    target.write_text(json.dumps(notebook, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(target, "code cells:", sum(item["cell_type"] == "code" for item in cells))


if __name__ == "__main__":
    build()
