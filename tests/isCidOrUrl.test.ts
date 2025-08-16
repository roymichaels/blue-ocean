import isCidOrUrl from '../utils/isCidOrUrl';

describe('isCidOrUrl helper', () => {
  it('detects CID strings and URLs', () => {
    expect(isCidOrUrl('bafybeigdyrzt5u2r6sxcv5a3dyhv6aipjfiv6t5bygbw4s3z6')).toBe(true);
    expect(isCidOrUrl('ipfs://bafybeigdyrzt5u2r6sxcv5a3dyhv6aipjfiv6t5bygbw4s3z6')).toBe(true);
    expect(isCidOrUrl('https://example.com')).toBe(true);
    expect(isCidOrUrl('not-a-cid')).toBe(false);
  });
});
