export function getInteractionType(eventName: string | null) {
  if (!eventName) {
    return null;
  }

  if (eventName.startsWith('key')) {
    return 'keyboard';
  }

  if (eventName.includes('input') || eventName.startsWith('composition')) {
    return 'text';
  }

  if (
    eventName.includes('click') ||
    eventName.startsWith('mouse') ||
    eventName.startsWith('pointer') ||
    eventName.startsWith('touch') ||
    eventName === 'contextmenu'
  ) {
    return 'pointer';
  }

  return eventName;
}
