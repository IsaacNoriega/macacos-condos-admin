import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  tenantId?: string;
  userId?: string;
}

export const contextStorage = new AsyncLocalStorage<RequestContext>();

export const getTenantId = (): string | undefined => {
  return contextStorage.getStore()?.tenantId;
};

export const getUserId = (): string | undefined => {
  return contextStorage.getStore()?.userId;
};
