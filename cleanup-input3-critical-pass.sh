#!/usr/bin/env bash
set -euo pipefail

cat > src/components/runtime-workspaces/SessionCreateCard.tsx <<'TSX'
import type { ReactElement } from 'react';

type SessionSource = 'plainText' | 'dictationScript';
type SupportedCreationInputMode = 'input2';

type SessionQuotaStatus = {
  blocked: boolean;
  message: string;
  limit: number | null;
  used: number;
};

type DictationScriptPhrase = {
  id: string;
  text: string;
};

type DictationScriptPreview = {
  title: string;
  language: string;
  inputMode: string;
  difficulty: string;
  phrases: DictationScriptPhrase[];
  estimatedDurationSec: number;
};

type DictationScriptValidation =
  | {
      ok: true;
      script: DictationScriptPreview;
      errors: [];
    }
  | {
      ok: false;
      script: null;
      errors: string[];
    };

type MetricComponentType = (props: { label: string; value: string; title?: string }) => ReactElement;

type SessionCreateCardProps = {
  sessionCreationSource: SessionSource;
  sessionCreationName: string;
  sessionQuotaStatus: SessionQuotaStatus;
  canCreateSessionFromDialog: boolean;
  localDevFeaturesAvailable: boolean;
  dictationScriptJson: string;
  dictationScriptValidation: DictationScriptValidation | null;
  validatedDictationScript: DictationScriptPreview | null;
  onSessionCreationSourceChange: (value: SessionSource) => void;
  onSessionCreationNameChange: (value: string) => void;
  onCreateSessionWithMode: (inputMode: SupportedCreationInputMode) => void;
  onDictationScriptJsonChange: (value: string) => void;
  onValidateScriptImport: () => void;
  onCreateSessionFromDictationScript: () => void;
  onCancel: () => void;
  MetricComponent: MetricComponentType;
};

export function SessionCreateCard({
  sessionCreationSource,
  sessionCreationName,
  sessionQuotaStatus,
  canCreateSessionFromDialog,
  localDevFeaturesAvailable,
  dictationScriptJson,
  dictationScriptValidation,
  validatedDictationScript,
  onSessionCreationSourceChange,
  onSessionCreationNameChange,
  onCreateSessionWithMode,
  onDictationScriptJsonChange,
  onValidateScriptImport,
  onCreateSessionFromDictationScript,
  onCancel,
  MetricComponent,
}: SessionCreateCardProps) {
  void localDevFeaturesAvailable;

  return (
    <div className="sidebar-card session-create-card brand-session-create-card" role="dialog" aria-label="Choose input">
      <p className="sidebar-copy">Choose the source for this new session.</p>
      {sessionQuotaStatus.limit !== null ? (
        <p className={sessionQuotaStatus.blocked ? 'error' : 'session-create-hint'}>
          {sessionQuotaStatus.blocked
            ? sessionQuotaStatus.message
            : `Sessions available: ${sessionQuotaStatus.used}/${sessionQuotaStatus.limit}.`}
        </p>
      ) : null}
      <label>
        Session Source
        <select
          value={sessionCreationSource}
          onChange={(event) => {
            onSessionCreationSourceChange(event.target.value as SessionSource);
          }}
        >
          <option value="plainText">Plain Text</option>
          <option value="dictationScript">DictationScript JSON</option>
        </select>
      </label>
      {sessionCreationSource === 'plainText' ? (
        <>
          <label>
            Session name
            <input
              value={sessionCreationName}
              onChange={(e) => onSessionCreationNameChange(e.target.value)}
              placeholder="My first session"
            />
          </label>
          <p className="session-create-hint">Enter a name first, then choose the setup.</p>
          <div className="session-create-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => onCreateSessionWithMode('input2')}
              disabled={!canCreateSessionFromDialog}
              title={sessionQuotaStatus.blocked ? sessionQuotaStatus.message : undefined}
            >
              Input # 2 - Text to Speech (TTS)
            </button>
          </div>
        </>
      ) : (
        <div className="session-script-import">
          <label>
            DictationScript JSON
            <textarea
              value={dictationScriptJson}
              onChange={(event) => {
                onDictationScriptJsonChange(event.target.value);
              }}
              rows={10}
              placeholder='{"title":"Generated Dictation","language":"de","inputMode":"browser-tts","phrases":[...]}'
            />
          </label>
          <div className="session-create-actions">
            <button type="button" className="secondary-button" onClick={onValidateScriptImport}>
              Validate Script
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onCreateSessionFromDictationScript}
              disabled={!validatedDictationScript || sessionQuotaStatus.blocked}
              title={sessionQuotaStatus.blocked ? sessionQuotaStatus.message : undefined}
            >
              Create Session
            </button>
          </div>
          {dictationScriptValidation ? (
            dictationScriptValidation.ok ? (
              <div className="script-preview">
                <p className="success">Script validated.</p>
                <div className="today-summary-grid">
                  <MetricComponent label="Title" value={dictationScriptValidation.script.title} />
                  <MetricComponent label="Language" value={dictationScriptValidation.script.language} />
                  <MetricComponent label="Input mode" value={dictationScriptValidation.script.inputMode} />
                  <MetricComponent label="Difficulty" value={dictationScriptValidation.script.difficulty} />
                  <MetricComponent label="Phrases" value={String(dictationScriptValidation.script.phrases.length)} />
                  <MetricComponent label="Duration" value={`${dictationScriptValidation.script.estimatedDurationSec}s`} />
                </div>
                <div className="script-phrase-preview">
                  {dictationScriptValidation.script.phrases.slice(0, 3).map((phrase) => (
                    <p key={phrase.id} className="hint">
                      {phrase.id}: {phrase.text.slice(0, 120)}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="error">
                {dictationScriptValidation.errors.map((message) => (
                  <p key={message}>{message}</p>
                ))}
              </div>
            )
          ) : null}
        </div>
      )}
      <button type="button" className="text-button" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
TSX

PYTHON_BIN=""
if command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
else
  echo "ERROR: python/python3 not found. Install Python or tell me and I will give you a Node/bash hybrid version."
  exit 1
fi

"$PYTHON_BIN" <<'PY'
from pathlib import Path
import re

path = Path("vite.config.ts")
s = path.read_text(encoding="utf-8")

s = s.replace("\nlet kokoroSidecarProcess: ChildProcess | null = null;\n", "\n")

route_start = s.find("        server.middlewares.use('/api/kokoro/start'")
if route_start != -1:
    route_end = s.find("\n        });", route_start)
    if route_end != -1:
        s = s[:route_start] + s[route_end + len("\n        });"):]

def remove_function(src: str, name: str) -> str:
    m = re.search(rf"\n(?:async\s+)?function\s+{re.escape(name)}\s*\(", src)
    if not m:
        return src

    open_brace = src.find("{", m.start())
    if open_brace == -1:
        return src

    depth = 0
    end = open_brace
    while end < len(src):
        ch = src[end]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end += 1
                break
        end += 1

    return src[:m.start()] + "\n" + src[end:]

for fn in ("ensureKokoroVenvReady", "isKokoroSidecarHealthy", "waitForKokoroSidecarReady"):
    s = remove_function(s, fn)

m = re.search(r"import \{([^}]+)\} from 'node:child_process';\n", s)
if m:
    import_line = m.group(0)
    body = s.replace(import_line, "")
    names = []
    if re.search(r"\bexecFile\(", body):
        names.append("execFile")
    if re.search(r"\bexecFileSync\(", body):
        names.append("execFileSync")
    if re.search(r"\bspawn\(", body):
        names.append("spawn")
    if re.search(r"\bChildProcess\b", body):
        names.append("type ChildProcess")

    replacement = f"import {{ {', '.join(names)} }} from 'node:child_process';\n" if names else ""
    s = s.replace(import_line, replacement)

s = re.sub(r"\n{3,}", "\n\n", s)
path.write_text(s, encoding="utf-8")
PY

echo "critical cleanup applied"
