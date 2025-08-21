import { NextRequest, NextResponse } from 'next/server';
import { serverClient } from '@/src/lib/amplifyServerClient';

export async function POST(req: NextRequest) {
  const { prompt, context } = await req.json();

  // 1) Call the typed AI "generation" route
  const { data: scored, errors } = await serverClient.queries.scoreTask({
    prompt, context,
  });
  if (errors?.length) {
    return NextResponse.json({ error: errors }, { status: 400 });
  }

  // 2) Persist to your per-owner model (server-side only)
  const { data: saved, errors: saveErr } =
    await serverClient.models.Analysis.create(
      { prompt, context, result: scored! },
      { authMode: 'userPool' } // ensures owner is attached
    );

  if (saveErr?.length) {
    return NextResponse.json({ error: saveErr }, { status: 500 });
  }

  // 3) Return the structured result (and record id) to the client
  return NextResponse.json({
    id: saved?.id,
    result: saved?.result,   // { rating, summary, reasoning, risks[], recommendations[] }
  });
}
