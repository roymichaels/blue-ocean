// Simple CLI to pin files to Pinata using a local PINATA_JWT.
// Usage: ts-node scripts/pinata-upload.ts <file1> <file2> ...

import path from 'path';
import { readFile } from 'fs/promises';

async function upload(filePath: string): Promise<string> {
  const jwt =
    process.env.EXPO_PUBLIC_PINATA_JWT || process.env.PINATA_JWT;
  if (!jwt) {
    throw new Error('EXPO_PUBLIC_PINATA_JWT environment variable is required');
  }

  const fileBuffer = await readFile(filePath);
  const form = new FormData();
  form.append('file', new Blob([fileBuffer]), path.basename(filePath));

  const response = await fetch(
    'https://api.pinata.cloud/pinning/pinFileToIPFS',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      body: form,
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Pinata upload failed with status ${response.status}: ${body || response.statusText}`,
    );
  }

  const result = (await response.json()) as { IpfsHash: string };
  return result.IpfsHash;
}

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('Usage: ts-node scripts/pinata-upload.ts <file> [file...]');
    process.exit(1);
  }
  const results = await Promise.all(
    files.map(async (file) => {
      const resolved = path.resolve(file);
      const cid = await upload(resolved);
      return { resolved, cid };
    })
  );

  for (const r of results) {
    console.log(`${r.resolved}: ${r.cid}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

