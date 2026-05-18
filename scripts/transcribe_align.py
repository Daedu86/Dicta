import argparse
import json
import re
from pathlib import Path

SCHEMA_PATH = Path(__file__).with_name('transcript.schema.json')


def normalize_word(word: str) -> str:
    normalized = re.sub(r"[^\w']+", "", word.lower(), flags=re.UNICODE).strip()
    return normalized


def load_schema() -> dict:
    return json.loads(SCHEMA_PATH.read_text(encoding='utf-8'))


def validate_payload(payload: dict) -> None:
    if 'words' not in payload or not isinstance(payload['words'], list):
        raise ValueError("Invalid payload: missing 'words' list")
    for i, item in enumerate(payload['words']):
        if not isinstance(item, dict):
            raise ValueError(f'Invalid payload: words[{i}] must be object')
        if not isinstance(item.get('word'), str) or not item['word']:
            raise ValueError(f'Invalid payload: words[{i}].word must be non-empty string')
        if not isinstance(item.get('start'), (int, float)):
            raise ValueError(f'Invalid payload: words[{i}].start must be number')
        if not isinstance(item.get('end'), (int, float)):
            raise ValueError(f'Invalid payload: words[{i}].end must be number')


def extract_words(result: dict) -> list[dict]:
    words = []
    for segment in result.get('segments', []):
        for word in segment.get('words', []):
            raw_word = word.get('word', '')
            normalized = normalize_word(raw_word)
            if not normalized:
                continue

            start = float(word.get('start', 0.0))
            end = float(word.get('end', start))
            words.append({'word': normalized, 'start': start, 'end': end})

    return words


def run_whisperx(audio_path: Path, model_name: str, language: str) -> dict:
    import torch
    import whisperx

    has_gpu = torch.cuda.is_available()
    device = 'cuda' if has_gpu else 'cpu'
    compute_type = 'float16' if has_gpu else 'int8'

    model = whisperx.load_model(model_name, device=device, compute_type=compute_type, language=language)
    audio = whisperx.load_audio(str(audio_path))
    result = model.transcribe(audio, batch_size=8)

    align_model, metadata = whisperx.load_align_model(language_code=language, device=device)
    aligned = whisperx.align(result['segments'], align_model, metadata, audio, device)
    return aligned


def main() -> None:
    parser = argparse.ArgumentParser(description='Run local WhisperX alignment and export Dicta transcript JSON.')
    parser.add_argument('--audio', required=True, help='Input audio file path')
    parser.add_argument('--output', required=True, help='Output transcript JSON path')
    parser.add_argument('--model', default='small', help='Whisper model size (tiny/base/small/medium/large-v3)')
    parser.add_argument('--language', default='en', help='Language code for transcription/alignment, e.g. en, es, de, fr')
    parser.add_argument('--dry-run', action='store_true', help='Skip WhisperX and emit fixture transcript for smoke tests')
    args = parser.parse_args()

    audio_path = Path(args.audio)
    output_path = Path(args.output)

    if not args.dry_run and not audio_path.exists():
        raise FileNotFoundError(f'Audio file not found: {audio_path}')

    if args.dry_run:
        payload = {
            'words': [
                {'word': 'hello', 'start': 0.1, 'end': 0.5},
                {'word': 'world', 'start': 0.6, 'end': 1.0},
            ]
        }
    else:
        aligned = run_whisperx(audio_path, args.model, args.language)
        payload = {'words': extract_words(aligned)}

    _ = load_schema()  # Source-of-truth schema kept in repo for UI + tooling.
    validate_payload(payload)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2), encoding='utf-8')
    print(f'Wrote transcript: {output_path} ({len(payload["words"])} words)')


if __name__ == '__main__':
    main()
