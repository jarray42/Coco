import { NextResponse } from 'next/server';
import { getLatestCryptoJsonFilename } from '../../../utils/bunny-client';

export async function GET() {
  try {
    const filename = await getLatestCryptoJsonFilename();
    return NextResponse.json({ filename });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 