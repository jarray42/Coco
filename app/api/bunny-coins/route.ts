import { NextResponse } from 'next/server';
import { getLatestCryptoJsonFilename } from '../../../utils/bunny-client';

// Force dynamic rendering - prevent static analysis during build
export const dynamic = 'force-dynamic'


export async function GET() {
  try {
    const filename = await getLatestCryptoJsonFilename();
    return NextResponse.json({ filename });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 