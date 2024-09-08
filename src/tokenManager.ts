// tokenManager.ts
let token: string | null = null;

export const getToken = (): string | null => {
  return token;
};

export const setToken = (newToken: string): void => {
  token = newToken;
};

export const clearToken = (): void => {
  token = null;
};