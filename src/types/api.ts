export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface HealthResponse {
  status: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
