// Simple CLI to pin files to Pinata using a local PINATA_JWT.
// Usage: ts-node scripts/pinata-upload.ts <file1> <file2> ...

import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';

async function upload(filePath: string): Promise<string> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    throw new Error('PINATA_JWT environment variable is required');
  }

  const data = new FormData();
  data.append('file', fs.createReadStream(filePath));

  const res = await axios.post(
    'https://api.pinata.cloud/pinning/pinFileToIPFS',
    data,
    {
      headers: {
        ...data.getHeaders(),
        Authorization: `Bearer ${jwt}`,
      },
    }
  );

  return res.data.IpfsHash as string;
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

