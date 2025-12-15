import { z } from 'zod';

export const apiErrorSchema = z.object({
  status: z.string().default('error'),
  code: z.string().optional(),
  message: z.string(),
  details: z.any().optional(),
});

export type ApiErrorResponse = z.infer<typeof apiErrorSchema>;

export interface PaginatedResponse<T> {
  data: T;
  total?: number;
  page?: number;
  pageSize?: number;
}

export interface ApiResult<T> {
  status: 'success' | 'error';
  code?: string;
  message?: string;
  data?: T;
}

export class ApiError extends Error {
  statusCode: number;
  code?: string;
  details?: unknown;

  constructor(message: string, statusCode = 500, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
