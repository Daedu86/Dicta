import type { useOpenRouterWorkspaceRuntime } from './useOpenRouterWorkspaceRuntime';

export type OpenRouterWorkspaceRuntime = ReturnType<typeof useOpenRouterWorkspaceRuntime>;
export type OpenRouterWorkspaceSectionId = keyof OpenRouterWorkspaceRuntime['sectionsExpanded'];
