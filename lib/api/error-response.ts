import { NextResponse } from 'next/server';
import type { ApiErrorDetails, ApiErrorDto } from '@/lib/api/error-dto';

type ApiErrorResponseOptions<TDetails extends ApiErrorDetails> = {
  status: number;
  code: string;
  message: string;
  details?: TDetails;
};

export function apiErrorResponse<TDetails extends ApiErrorDetails = ApiErrorDetails>(
  options: ApiErrorResponseOptions<TDetails>,
): NextResponse<ApiErrorDto<TDetails>> {
  return NextResponse.json(
    {
      ok: false,
      code: options.code,
      message: options.message,
      ...(options.details ? { details: options.details } : {}),
    },
    { status: options.status },
  );
}
