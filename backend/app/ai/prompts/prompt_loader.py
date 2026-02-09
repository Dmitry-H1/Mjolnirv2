from pathlib import Path

def load_prompt(filename: str) -> str:

    base_path = Path(__file__).parent
    file_path = base_path / filename
    return file_path.read_text(encoding="utf-8")
