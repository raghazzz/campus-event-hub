"""Regenerate data/fallback.js from data/events.json and data/clubs.json.
Run from the project folder:  python3 tools/build_fallback.py"""
import json, re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
js = (root / "data/fallback.js").read_text(encoding="utf-8")
for name, file in [("FALLBACK_EVENTS", "events.json"), ("FALLBACK_CLUBS", "clubs.json")]:
    data = json.loads((root / "data" / file).read_text(encoding="utf-8"))
    js = re.sub(rf"window\.{name} = .*?;\n", lambda m: f"window.{name} = {json.dumps(data, indent=2, ensure_ascii=False)};\n", js, flags=re.S)
(root / "data/fallback.js").write_text(js, encoding="utf-8")
print("data/fallback.js updated")
