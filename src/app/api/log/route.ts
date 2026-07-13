import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const logPath = path.join(process.cwd(), 'out.txt');
    fs.appendFileSync(logPath, JSON.stringify(body, null, 2) + '\n---\n');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
