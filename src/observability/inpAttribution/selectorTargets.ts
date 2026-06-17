import { MAX_SELECTOR_LENGTH } from './constants';
import { cleanAttribute, cleanToken } from './selectorSanitizers';
import type { SelectorTarget } from './types';

function isSelectorTarget(target: unknown): target is SelectorTarget {
  return typeof target === 'object' && target !== null && 'tagName' in target;
}

function readIterableClassList(classList: Iterable<string>) {
  return Array.from(classList);
}

function readIndexedClassList(classList: { length: number; item(index: number): string | null }) {
  return Array.from({ length: classList.length }, (_, index) => classList.item(index)).filter(
    (classItem): classItem is string => Boolean(classItem),
  );
}

function readClassNamesFromClassList(classList: SelectorTarget['classList']) {
  if (!classList) {
    return [];
  }

  const iterableClassList = classList as Iterable<string>;
  if (typeof iterableClassList[Symbol.iterator] === 'function') {
    return readIterableClassList(iterableClassList);
  }

  const indexedClassList = classList as { length: number; item(index: number): string | null };
  if (typeof indexedClassList.length === 'number' && typeof indexedClassList.item === 'function') {
    return readIndexedClassList(indexedClassList);
  }

  return [];
}

function readClassNamesFromClassName(className: SelectorTarget['className']) {
  if (typeof className === 'string') {
    return className.split(/\s+/);
  }

  if (className && typeof className.baseVal === 'string') {
    return className.baseVal.split(/\s+/);
  }

  return [];
}

function readClassNames(target: SelectorTarget) {
  const classListNames = readClassNamesFromClassList(target.classList);

  if (classListNames.length > 0) {
    return classListNames;
  }

  return readClassNamesFromClassName(target.className);
}

function buildClassSelector(target: SelectorTarget) {
  return readClassNames(target)
    .map(cleanToken)
    .filter(Boolean)
    .slice(0, 3)
    .map((className) => `.${className}`)
    .join('');
}

function buildAttributeSelector(target: SelectorTarget, attribute: 'role' | 'type') {
  const value = target.getAttribute?.(attribute);

  return value ? `[${attribute}="${cleanAttribute(value)}"]` : '';
}

function getSelectorPart(target: SelectorTarget) {
  const tag = cleanToken((target.tagName ?? 'element').toLowerCase()) || 'element';
  const id = target.id ? `#${cleanToken(target.id)}` : '';
  const classes = buildClassSelector(target);
  const roleSelector = buildAttributeSelector(target, 'role');
  const typeSelector = buildAttributeSelector(target, 'type');

  return `${tag}${id}${classes}${roleSelector}${typeSelector}`;
}

function collectSelectorParts(target: SelectorTarget) {
  const parts: string[] = [];
  let currentTarget: SelectorTarget | null = target;

  for (let depth = 0; currentTarget && depth < 4; depth += 1) {
    parts.unshift(getSelectorPart(currentTarget));

    if (currentTarget.id) {
      break;
    }

    currentTarget = currentTarget.parentElement ?? null;
  }

  return parts;
}

export function getInteractionTargetSelector(target: unknown) {
  if (!isSelectorTarget(target)) {
    return null;
  }

  return collectSelectorParts(target).join(' > ').slice(0, MAX_SELECTOR_LENGTH) || null;
}
