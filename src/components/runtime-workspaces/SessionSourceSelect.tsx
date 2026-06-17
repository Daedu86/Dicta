import type { SessionSource } from './SessionCreateCardTypes';

type SessionSourceSelectProps = {
  sessionCreationSource: SessionSource;
  allowDictationScriptCreation: boolean;
  onSessionCreationSourceChange: (value: SessionSource) => void;
};

export function SessionSourceSelect({
  sessionCreationSource,
  allowDictationScriptCreation,
  onSessionCreationSourceChange,
}: SessionSourceSelectProps) {
  return (
    <label>
      Session Source
      <select
        value={sessionCreationSource}
        onChange={(event) => {
          onSessionCreationSourceChange(event.target.value as SessionSource);
        }}
      >
        <option value="plainText">Plain Text</option>
        {allowDictationScriptCreation ? <option value="dictationScript">DictationScript JSON</option> : null}
      </select>
    </label>
  );
}
