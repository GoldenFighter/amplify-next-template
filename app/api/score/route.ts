// import { NextRequest, NextResponse } from 'next/server';
// import { serverClient } from '@/lib/amplifyServerClient';

// export async function POST(req: NextRequest) {
//   try {
//     const { prompt, context } = await req.json();

//     console.log("Server API: Received request:", { prompt, context });

//     // 1) Call the typed AI "generation" route
//     const { data: scored, errors } = await serverClient.scoreTask({
//       prompt, context,
//     });
    
//     console.log("Server API: scoreTask result:", { scored, errors });
    
//     if (error: errors }, { status: 400 });
//     }

//     // 2) Persist to your per-owner model (server-side only)
//     const { data: saved, errors: saveErr } =
//       await serverClient.models.Analysis.create({
//         prompt, context, result: scored!
//       });

//     console.log("Server API: Analysis.create result:", { saved, saveErr });

//     if (saveErr?.length) {
//       console.error("Server API: Analysis.create errors:", saveErr);
//       return NextResponse.json({ error: saveErr }, { status: 500 });
//     }

//     // 3) Return the structured result (and record id) to the client
//     return NextResponse.json({
//       id: saved?.id,
//       result: saved?.result,   // { rating, summary, reasoning, risks[], recommendations[] }
//     });
//   } catch (error) {
//     console.error("Server API: Unexpected error:", error);
//     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
//     }
//   }
// }

export {};

