const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateGameCode(length = 5): string {
  let result = '';

  for (let index = 0; index < length; index += 1) {
    const randomValues = crypto.getRandomValues(new Uint32Array(1));
    const randomIndex = (randomValues[0] ?? 0) % ALPHABET.length;
    result += ALPHABET[randomIndex];
  }

  return result;
}