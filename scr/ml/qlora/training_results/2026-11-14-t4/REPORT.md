# Thực nghiệm QLoRA MIRA — 14/11/2026

Đã chạy thật trên Google Colab Tesla T4, hoàn thành 3 epochs / 69 optimizer steps. Đây là fine-tuning LoRA trên base Qwen2.5-3B-Instruct lượng tử hóa NF4; không cập nhật toàn bộ trọng số base.

- Dataset tổng hợp: train 360, validation 45, test 45; chia theo nhóm tình huống.
- LoRA: r=8, alpha=16; khoảng 14.966.784 tham số học được (0,4827%).
- FP16, batch 1, gradient accumulation 16, max length 768, learning rate 0,0002.
- Thời gian train: 1.017,1849 giây (~16 phút 57 giây); peak allocated GPU memory: 4,06 GiB.
- Checkpoint được xuất: cuối epoch 1 (step 23), có validation loss thấp nhất. Đánh giá sau train dùng checkpoint này; trường `epoch: 3` trong metrics là trạng thái Trainer sau khi chạy đủ 3 epochs.
- Kiểm tra nạp lại adapter trên base mới và sinh câu trả lời: thành công.
- Notebook tải về có 12 ô code đã chạy, không có output dạng error.
- ZIP đã kiểm tra CRC; có 504 tensor LoRA, file safetensors 59.933.632 bytes.

| Epoch | Training loss được log gần cuối epoch* | Validation loss |
| --- | ---: | ---: |
| 1 | 1,4405 | 1,927735 |
| 2 | 0,0906 | 3,034529 |
| 3 | 0,0104 | 3,410472 |

*Đây là loss của cửa sổ logging, không phải loss trung bình toàn epoch. Train loss trung bình toàn phiên: 0,765373.

Test loss trước fine-tuning: **2,721334**. Sau fine-tuning, dùng checkpoint tốt nhất: **1,560974**. Test perplexity: **4,763459**. Loss và perplexity không phải tỷ lệ trả lời đúng.

## Giới hạn quan sát được

Validation loss tăng từ epoch 2 dù training loss giảm: dấu hiệu overfit rõ rệt trên dataset nhỏ, nhiều biến thể khuôn mẫu. Trong 5 câu so sánh ở `before_after.jsonl`, model sau train đã tránh bịa giá cụ thể trong tình huống thiếu danh mục và giữ được yêu cầu đổi chất liệu/ngân sách. Tuy nhiên, model né trả lời câu kiến thức chung về vàng trắng/bạch kim, xử lý tình huống OTP chưa rõ ràng và câu thử sau khi nạp lại còn đề nghị “size tiêu chuẩn”, trái yêu cầu sản phẩm.

Đây là kết quả thử pipeline, chưa đủ để triển khai tư vấn thực tế. Chưa tích hợp adapter vào website. Cần bổ sung hội thoại đa dạng được chuyên gia rà soát, kiểm thử riêng về kiến thức, size, ngữ cảnh và dữ liệu danh mục. Không điều chỉnh model dựa trên các mẫu test đã xem trong lần này; cần bộ đánh giá mới cho lần tiếp theo.

## Tệp minh chứng

- [Metrics](metrics.json), [cấu hình và phiên bản thư viện](run_config.json), [training history](trainer_history.json).
- [Biểu đồ loss](loss.png), [5 câu trước/sau](before_after.jsonl), [dataset manifest](dataset_manifest.json).
- [Notebook đã chạy](../../Jewelry_QLoRA_Colab_executed.ipynb), [adapter + tokenizer + báo cáo](../../mira_qlora_adapter.zip).

Notebook nguồn đã sửa phát hiện BF16 để bỏ qua emulation: T4 (compute capability 7.5) dùng FP16. Dùng notebook sạch `Jewelry_QLoRA_Colab.ipynb` để chạy lại.
