import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const testDir = path.join(process.cwd(), 'test-pdfs');
    if (!fs.existsSync(testDir)) {
      return NextResponse.json({ files: [] });
    }

    const fileNames = fs.readdirSync(testDir).filter(f => f.endsWith('.pdf'));
    const files = fileNames.map(name => {
      const filePath = path.join(testDir, name);
      const buffer = fs.readFileSync(filePath);
      const base64 = buffer.toString('base64');
      return {
        name,
        size: buffer.length,
        base64: `data:application/pdf;base64,${base64}`,
      };
    });

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error reading sample pdfs:', error);
    return NextResponse.json({ files: [] });
  }
}
