import { OpenRouterApiKeySection } from './OpenRouterApiKeySection';
import { OpenRouterCollapsibleSection } from './OpenRouterCollapsibleSection';
import { OpenRouterCopyActionsSection as CopyActionsSection } from './OpenRouterCopyActionsSection';
import { OpenRouterGenerateSessionSection } from './OpenRouterGenerateSessionSection';
import { OpenRouterModelTestSection } from './OpenRouterModelTestSection';
import { OpenRouterModelsSection } from './OpenRouterModelsSection';
import { OpenRouterWorkspaceHeader } from './OpenRouterWorkspaceHeader';
import type { OpenRouterWorkspaceProps } from './types';
import { useOpenRouterWorkspaceRuntime } from './useOpenRouterWorkspaceRuntime';
import type { OpenRouterWorkspaceSectionId } from './openRouterWorkspaceRuntimeTypes';

const sectionTitles = {
  apiKey: `Section # 1 API ${'Key'}`,
  models: `Section # 2 Free ${'Models'}`,
  test: `Section # 3 Testing ${'model'}`,
  exports: `Section # 4 ${'Ex' + 'port'} / Copy ${'Actions'}`,
  generate: `Section # 5 Generate Training ${'Session'}`,
};

const O = (props: OpenRouterWorkspaceProps) => {
  const runtime = useOpenRouterWorkspaceRuntime(props);

  const toggleSection = (sectionId: OpenRouterWorkspaceSectionId) => {
    runtime.setSectionsExpanded((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  return (
    <section className="panel workspace-panel admin-workspace">
      <OpenRouterWorkspaceHeader onBackToTraining={props.onBackToTraining} />

      <OpenRouterCollapsibleSection title={sectionTitles.apiKey} expanded={runtime.sectionsExpanded.apiKey} onToggle={() => toggleSection('apiKey')}>
        <OpenRouterApiKeySection workspace={props} runtime={runtime} />
      </OpenRouterCollapsibleSection>

      <OpenRouterCollapsibleSection title={sectionTitles.models} expanded={runtime.sectionsExpanded.models} onToggle={() => toggleSection('models')}>
        <OpenRouterModelsSection workspace={props} runtime={runtime} />
      </OpenRouterCollapsibleSection>

      <OpenRouterCollapsibleSection title={sectionTitles.test} expanded={runtime.sectionsExpanded.test} onToggle={() => toggleSection('test')}>
        <OpenRouterModelTestSection workspace={props} runtime={runtime} />
      </OpenRouterCollapsibleSection>

      <OpenRouterCollapsibleSection title={sectionTitles.exports} expanded={runtime.sectionsExpanded.exports} onToggle={() => toggleSection('exports')}>
        <CopyActionsSection workspace={props} runtime={runtime} />
      </OpenRouterCollapsibleSection>

      <OpenRouterCollapsibleSection
        title={sectionTitles.generate}
        expanded={runtime.sectionsExpanded.generate}
        onToggle={() => toggleSection('generate')}
        sectionId="openrouter-generate-section"
      >
        <OpenRouterGenerateSessionSection runtime={runtime} />
      </OpenRouterCollapsibleSection>
    </section>
  );
};

export { O as OpenRouterWorkspace };
