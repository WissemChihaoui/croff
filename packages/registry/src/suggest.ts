/** Edit distance, counting a swap of adjacent characters as one edit: typos are mostly swaps. */
function distance(a: string, b: string): number {
  let beforePrevious: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(previous[j]! + 1, current[j - 1]! + 1, previous[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, beforePrevious[j - 2]! + 1);
      }
      current[j] = best;
    }
    beforePrevious = previous;
    previous = current;
  }
  return previous[b.length]!;
}

/** Finds the most likely intended name, or `undefined` if nothing is close. */
export function closest(input: string, candidates: string[]): string | undefined {
  let best: string | undefined;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    // Abbreviations such as "pad" for "padding" are likelier than an edit distance suggests.
    const score =
      candidate.startsWith(input) && input.length >= 2 ? 0.5 : distance(input, candidate);
    if (score < bestScore || (score === bestScore && best !== undefined && candidate < best)) {
      best = candidate;
      bestScore = score;
    }
  }
  return bestScore <= Math.max(1, Math.floor(input.length / 3)) ? best : undefined;
}
