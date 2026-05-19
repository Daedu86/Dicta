# Transformers Alignment Spike Results

Branch: `chore/transformers-alignment-spike`

## Goal

Test whether the optional alignment stack can move to `transformers>=5.0.0rc3` (CVE remediation path) without breaking compatibility.

## Environment

- Temporary local venv: `artifacts/.venv-alignment-spike`
- Python: `3.13.13`

## Commands Run

1. Create temporary environment:
   - `python -m venv artifacts/.venv-alignment-spike`
2. Install baseline alignment stack:
   - `artifacts/.venv-alignment-spike/Scripts/python.exe -m pip install -r requirements-alignment.txt`
3. Upgrade transformers explicitly:
   - `artifacts/.venv-alignment-spike/Scripts/python.exe -m pip install "transformers>=5.0.0rc3"`
4. Verify dependency consistency:
   - `artifacts/.venv-alignment-spike/Scripts/python.exe -m pip check`
5. Smoke checks:
   - `artifacts/.venv-alignment-spike/Scripts/python.exe -c "from importlib.metadata import version; import whisperx, transformers, huggingface_hub; print('whisperx', version('whisperx')); print('transformers', transformers.__version__); print('huggingface_hub', huggingface_hub.__version__)"`
   - `artifacts/.venv-alignment-spike/Scripts/python.exe scripts/transcribe_align.py --audio fixtures/dummy.wav --output artifacts/spike-dryrun.json --dry-run`

## Observed Result

- Baseline resolver with `requirements-alignment.txt` selected:
  - `whisperx==3.8.5`
  - `transformers==4.57.6`
  - `huggingface_hub==0.36.2`
- Forcing `transformers>=5.0.0rc3` upgraded to:
  - `transformers==5.8.1`
  - `huggingface_hub==1.15.0`
- `pip check` reports an explicit incompatibility:
  - `whisperx 3.8.5 has requirement huggingface-hub<1.0.0, but you have huggingface-hub 1.15.0.`

## Interpretation

- The CVE remediation path via `transformers>=5` is currently blocked by upstream constraints in the current `whisperx` version.
- This is a dependency-graph conflict, not a Dicta runtime code issue.

## Recommended Next Action

1. Track/validate a `whisperx` release that supports `huggingface-hub>=1` and `transformers>=5`.
2. Keep the current alignment stack pinned to compatible versions meanwhile.
3. Preserve checkpoint trust controls (do not load untrusted checkpoints).
4. Re-run this same spike procedure when upstream compatibility changes.
