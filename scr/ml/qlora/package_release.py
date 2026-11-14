"""Bundle reviewable local artifacts; never include credentials or model weights."""
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
FILES = ["Jewelry_QLoRA_Colab.ipynb", "jewelry_qlora_dataset.zip", "README.md", "validation_report.json"]
if (HERE / "Jewelry_QLoRA_Colab_executed.ipynb").is_file():
    FILES.append("Jewelry_QLoRA_Colab_executed.ipynb")
FILES.extend(path.relative_to(HERE).as_posix() for path in sorted((HERE / "training_results").rglob("*")) if path.is_file())
target = HERE / "MIRA_QLoRA_Starter.zip"
with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for name in FILES:
        info = zipfile.ZipInfo(name, date_time=(2026, 11, 14, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        archive.writestr(info, (HERE / name).read_bytes())
print(target)
