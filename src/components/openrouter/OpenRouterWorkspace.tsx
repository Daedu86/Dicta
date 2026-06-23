import { OpenRouterApiKeySection } from './OpenRouterApiKeySection';
import { OpenRouterCollapsibleSection } from './OpenRouterCollapsibleSection';
import { OpenRouterModelTestSection } from './OpenRouterModelTestSection';
import { OpenRouterModelsSection } from './OpenRouterModelsSection';
import { OpenRouterWorkspaceHeader } from './OpenRouterWorkspaceHeader';
import type { OpenRouterWorkspaceProps } from './types';
import { useOpenRouterWorkspaceRuntime } from './useOpenRouterWorkspaceRuntime';
import type { OpenRouterWorkspaceSectionId } from './openRouterWorkspaceRuntimeTypes';

const sectionTitles = {
  apiKey: 'Section # 1 API Key',
  models: 'Section # 2 Free Models',
  test: 'Section # 3 Testing model',
};

type OpenRouterWorkspaceComponentProps = OpenRouterWorkspaceProps & {
  embedded?: boolean;
};

const O = (props: OpenRouterWorkspaceComponentProps) => {
  const runtime = useOpenRouterWorkspaceRuntime(props);

  const toggleSection = (sectionId: OpenRouterWorkspaceSectionId) => {
    runtime.setSectionsExpanded((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const content = (
    <>
      {props.embedded ? null : <OpenRouterWorkspaceHeader onBackToTraining={props.onBackToTraining} />}

      <OpenRouterCollapsibleSection title={sectionTitles.apiKey} expanded={runtime.sectionsExpanded.apiKey} onToggle={() => toggleSection('apiKey')}>
        <OpenRouterApiKeySection workspace={props} runtime={runtime} />
      </OpenRouterCollapsibleSection>

      <OpenRouterCollapsibleSection title={sectionTitles.models} expanded={runtime.sectionsExpanded.models} onToggle={() => toggleSection('models')}>
        <OpenRouterModelsSection workspace={props} runtime={runtime} />
      </OpenRouterCollapsibleSection>

      <OpenRouterCollapsibleSection title={sectionTitles.test} expanded={runtime.sectionsExpanded.test} onToggle={() => toggleSection('test')}>
        <OpenRouterModelTestSection workspace={props} runtime={runtime} />
      </OpenRouterCollapsibleSection>
    </>
  );

  if (props.embedded) {
    return <div className="admin-openrouter-panel">{content}</div>;
  }

  return (
    <section className="panel workspace-panel admin-workspace">
      {content}
    </section>
  );
};

export { O as OpenRouterWorkspace };
