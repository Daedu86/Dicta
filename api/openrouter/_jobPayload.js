import { OPENROUTER_FREE_ROUTER_MODEL, readOpenRouterJobPayload } from './_request.js';

function getRequesterAssignedOpenRouterModel(requester) {
  return typeof requester?.assignedOpenRouterModel === 'string' ? requester.assignedOpenRouterModel.trim() : '';
}

export function resolveOpenRouterJobRequestPayload(requester, requestPayload) {
  const assignedModel = getRequesterAssignedOpenRouterModel(requester);
  if (!assignedModel || requestPayload.model !== OPENROUTER_FREE_ROUTER_MODEL) return requestPayload;
  return { ...requestPayload, model: assignedModel, requestedModel: requestPayload.model };
}

export function readCreateJobPayload(body) {
  return readOpenRouterJobPayload(body);
}

export function resolveCreateJobPayloadForRequester(requester, body) {
  return resolveOpenRouterJobRequestPayload(requester, readCreateJobPayload(body));
}
