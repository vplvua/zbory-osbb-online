import { NextResponse } from 'next/server';
import { getVoteSheetByToken } from '@/lib/vote/sheet';
import type { VoteSheetResponseDto } from '@/lib/vote/types';

export async function GET(
  _: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;
  const sheet = await getVoteSheetByToken(token);

  if (!sheet) {
    return NextResponse.json({ error: 'Листок не знайдено.' }, { status: 404 });
  }

  const response: VoteSheetResponseDto = { sheet };
  return NextResponse.json(response);
}
