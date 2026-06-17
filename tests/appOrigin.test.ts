import { describe, expect, it, vi } from 'vitest';
import { buildAppHomeNavigationPlan, navigateAppHome } from '../src/app/appOrigin';

describe('app home navigation', () => {
  it('uses same-origin SPA navigation for the training Home button', () => {
    const actions = createNavigationActions();

    const plan = navigateAppHome(
      {
        configuredOrigin: '',
        currentOrigin: 'https://dicta-theta.vercel.app',
      },
      actions,
    );

    expect(plan).toEqual({
      href: 'https://dicta-theta.vercel.app/',
      isSameOrigin: true,
    });
    expect(actions.stopFocusedTrainingPlayback).toHaveBeenCalledTimes(1);
    expect(actions.showLeaderboardWorkspace).toHaveBeenCalledTimes(1);
    expect(actions.navigateAppRoute).toHaveBeenCalledWith('/');
    expect(actions.assignLocation).not.toHaveBeenCalled();
  });

  it('keeps full browser navigation when the canonical app origin differs', () => {
    const actions = createNavigationActions();

    const plan = navigateAppHome(
      {
        configuredOrigin: 'https://dicta.example.com',
        currentOrigin: 'https://dicta-theta.vercel.app',
      },
      actions,
    );

    expect(plan).toEqual({
      href: 'https://dicta.example.com/',
      isSameOrigin: false,
    });
    expect(actions.assignLocation).toHaveBeenCalledWith('https://dicta.example.com/');
    expect(actions.stopFocusedTrainingPlayback).not.toHaveBeenCalled();
    expect(actions.showLeaderboardWorkspace).not.toHaveBeenCalled();
    expect(actions.navigateAppRoute).not.toHaveBeenCalled();
  });

  it('treats a configured same-origin app origin as an internal return target', () => {
    expect(buildAppHomeNavigationPlan({
      configuredOrigin: 'https://dicta-theta.vercel.app/',
      currentOrigin: 'https://dicta-theta.vercel.app',
    })).toEqual({
      href: 'https://dicta-theta.vercel.app/',
      isSameOrigin: true,
    });
  });
});

function createNavigationActions() {
  return {
    assignLocation: vi.fn(),
    navigateAppRoute: vi.fn(),
    showLeaderboardWorkspace: vi.fn(),
    stopFocusedTrainingPlayback: vi.fn(),
  };
}
