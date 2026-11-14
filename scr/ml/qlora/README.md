# MIRA — dataset tiếng Việt và notebook Colab QLoRA

Bộ khởi đầu để fine-tune **mô hình trò chuyện**; độc lập với Logistic Regression trong `scr/ml` và chưa thay Gemini trong website.

Đã chạy đủ **3 epochs / 69 optimizer steps trên Colab Tesla T4 ngày 14/11/2026**. Xem [báo cáo thực nghiệm](training_results/2026-11-14-t4/REPORT.md), [notebook có output](Jewelry_QLoRA_Colab_executed.ipynb) và `mira_qlora_adapter.zip`. Test loss giảm 2,7213 → 1,5610, nhưng còn lỗi trả lời và overfit từ epoch 2; chưa phù hợp triển khai tư vấn thực tế.

## Bước 1: chạy trên Colab

1. Mở https://colab.research.google.com/ → **File → Upload notebook** → chọn `Jewelry_QLoRA_Colab.ipynb`.
2. **Runtime → Change runtime type → chọn T4 GPU**, nếu Colab cấp. GPU dùng để train là GPU Colab; NVIDIA trên máy cá nhân không được dùng trong chế độ này.
3. Chạy ô **1** để cài thư viện. Nếu notebook đã import thư viện trong phiên cũ, restart session, chạy tiếp từ ô **2**.
4. Ô **2** kiểm tra CUDA, VRAM và cấu hình. Bật `USE_DRIVE=True` nếu muốn checkpoint được lưu trên Google Drive. Giữ `SMOKE_TEST_ONLY=False` để train đầy đủ.
5. Chạy ô **3**, upload **`jewelry_qlora_dataset.zip`**, không upload ZIP cả bộ. Chạy lần lượt ô **4–7**: kiểm tra checksum, token, mask assistant, forward/backward và baseline.
6. Ô **8** gọi `trainer.train()`. Ô **9–12** đánh giá, lưu adapter, vẽ loss, so sánh câu trả lời, thử nạp lại adapter và tải `mira_qlora_adapter.zip`.

Notebook có 12 ô code. Không cần gõ lại mã, API key Gemini, gói trả phí, Flash Attention hoặc cài Python trên máy cá nhân. Colab cần mạng để tải model và thư viện. Không chạy lại toàn notebook trong cùng phiên khi model cũ còn chiếm GPU.

## Dữ liệu được cung cấp

| Tập | Số mẫu | Nhóm tình huống |
| --- | ---: | ---: |
| Train | 360 | 40 |
| Validation | 45 | 5 |
| Test | 45 | 5 |
| Tổng | 450 | 50 |

**450 dòng = 50 tình huống viết sẵn × 9 biến thể tiền tố câu hỏi.** Đây không phải 450 hội thoại chuyên gia độc lập. Dữ liệu tổng hợp, còn khuôn mẫu, chưa qua chuyên gia thẩm định, không chứa log khách hàng thật. Kết quả không chứng minh hiệu quả thực tế của hệ tư vấn.

Các chủ đề gồm chất liệu, bảo quản, đo size, 4Cs, ngân sách, hội thoại nhiều lượt, chào lại mà vẫn giữ ngữ cảnh, giá/tồn kho từ danh mục giả lập, thông tin chưa xác minh, đơn hàng, thanh toán và liên hệ nhân viên. Dữ liệu TEST-* là giả lập, không phải hàng đang bán.

Mỗi dòng JSONL có `messages` gồm system/user/assistant và metadata `id`, `family`, `topic`, `synthetic`. Metadata không được đưa vào prompt. Các biến thể cùng `family` chỉ nằm trong một tập. Chia theo tình huống giảm rò rỉ do mẫu gần giống; đây không phải bảo đảm hoàn toàn không có nội dung ngữ nghĩa tương tự giữa các tập. Không dùng tập test để điều chỉnh cấu hình.

Khi bổ sung dữ liệu thật, cần có quyền sử dụng, loại bỏ thông tin nhận diện và cho chuyên viên rà soát. Đừng nhồi giá, tồn kho hoặc chính sách biến động vào trọng số; lúc tích hợp website, các dữ liệu này phải được lấy từ API hiện hành.

## Cấu hình mặc định

- Base: `Qwen/Qwen2.5-3B-Instruct`, ghim commit `aa8e72537993ba99e69dfaafa59ed015b17504d1`.
- QLoRA NF4 4-bit, double quantization; LoRA r=8, alpha=16, dropout=0,05.
- Batch 1, gradient accumulation 16, 768 tokens, 3 epochs, learning rate 0,0002.
- T4 dùng FP16; BF16 chỉ bật khi GPU hỗ trợ. Gradient checkpointing, SDPA, optimizer 8-bit.
- Loss chỉ trên token assistant, bỏ qua system/user/padding. Kiểm tra template prefix và dừng nếu mẫu dài hơn giới hạn.
- Chọn checkpoint bằng validation loss; báo test loss/perplexity và câu trả lời trước/sau. **Loss/perplexity không phải độ chính xác tư vấn.**

Các phiên bản thư viện ghim trong notebook là một cấu hình cố định, không phải lời khẳng định là bản mới nhất. Notebook giữ PyTorch/CUDA có sẵn của Colab và ghi lại phiên bản, GPU, model commit, checksum dữ liệu trong `run_config.json`.

## Kết quả tải xuống

`mira_qlora_adapter.zip` chứa:

- `adapter_model.safetensors`, `adapter_config.json`, tokenizer và system prompt.
- `metrics.json`, `trainer_history.json`, `loss.png`.
- `before_after.jsonl` với câu hỏi, đáp án tham khảo và kết quả base/fine-tuned để chấm thủ công.
- `run_config.json`, `dataset_manifest.json`, README.

**Adapter cần base model để chạy; ZIP này không phải model độc lập.** Notebook giải phóng model cũ rồi thử load lại bằng `PeftModel.from_pretrained`. Khi tích hợp MIRA về sau cần thêm một dịch vụ inference và nối backend vào dịch vụ đó; bộ này chưa sửa luồng chat đang chạy.

## Nếu gặp lỗi

- Không có CUDA: kiểm tra runtime đã chọn GPU. GPU NVIDIA ở máy cá nhân không làm runtime Colab CPU thành GPU.
- Hết VRAM: restart session, giảm `MAX_LENGTH=512`, giữ batch=1; hoặc đổi `MODEL_ID` sang `Qwen/Qwen2.5-1.5B-Instruct`. Revision chuyển sang `main` khi đổi model. Việc này tạo một thực nghiệm khác, cần lưu cấu hình riêng.
- Dữ liệu quá dài: notebook báo ID mẫu, không cắt âm thầm đáp án. Biên tập mẫu hoặc tăng giới hạn nếu còn VRAM.
- Muốn thử nhanh: bật `SMOKE_TEST_ONLY=True` để chạy 2 steps. Dùng runtime mới với False cho lần train đầy đủ; không báo số đo từ smoke test như kết quả huấn luyện hoàn chỉnh.
- Colab ngắt: dữ liệu ở `/content` có thể mất. Bật Drive trước khi train để giữ checkpoint; lưu adapter trước khi kết thúc phiên.

## Tái tạo và kiểm tra file tại dự án

Chạy ở thư mục gốc repo, không cần thư viện ML cho kiểm tra định dạng:

```powershell
python -X utf8 scr/ml/qlora/generate_dataset.py
python -X utf8 scr/ml/qlora/build_notebook.py
python -X utf8 scr/ml/qlora/validate_package.py
python -X utf8 scr/ml/qlora/package_release.py
```

`validation_report.json` ghi phạm vi kiểm tra tĩnh tại máy local, gồm toàn bộ 450 mẫu bằng tokenizer Qwen thật và bộ dựng ChatML no-tools đã đối chiếu với template; trường `gpu_training_executed=false` trong tệp này chỉ nói về công cụ kiểm tra local. Kết quả chạy GPU thực tế nằm riêng trong [training_results/2026-11-14-t4](training_results/2026-11-14-t4/REPORT.md) và notebook có output. Preflight forward/backward, train 3 epochs, đánh giá, lưu và nạp lại adapter đều đã chạy thành công trên Colab.

## Tài liệu tham chiếu

- [Qwen model card — hỗ trợ tiếng Việt](https://huggingface.co/Qwen/Qwen2.5-3B-Instruct).
- [PEFT — quantization và QLoRA](https://huggingface.co/docs/peft/v0.17.0/en/developer_guides/quantization).
- [Transformers Trainer 4.57.1](https://huggingface.co/docs/transformers/v4.57.1/en/main_classes/trainer).
- Qwen 3B dùng [Qwen Research License](https://huggingface.co/Qwen/Qwen2.5-3B-Instruct/blob/main/LICENSE), không mặc định coi là Apache 2.0; đọc điều kiện trước khi triển khai.
- Kiến thức trang sức cần rà soát: [GIA — ngọc trai](https://www.gia.edu/pearl-care-cleaning), [GIA — 4Cs](https://4cs.gia.edu/en-us/), [World Gold Council — tuổi vàng](https://www.gold.org/about-gold/about-gold-jewellery), [DOJI — ni nhẫn](https://trangsuc.doji.vn/blogs/blog/ni-nhan-la-gi).
