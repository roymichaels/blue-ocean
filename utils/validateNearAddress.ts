export default function validateNearAddress(address: string): boolean {
  return /^[a-z0-9._-]{2,64}$/.test(address);
}
