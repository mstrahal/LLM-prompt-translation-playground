export interface DiffToken {
  type: 'added' | 'removed' | 'common';
  value: string;
}

export function diffWords(oldStr: string, newStr: string): DiffToken[] {
  if (!oldStr) {
    return [{ type: 'added', value: newStr }];
  }
  if (!newStr) {
    return [{ type: 'removed', value: oldStr }];
  }

  // Split strings into words and whitespaces, so we preserve spaces
  const tokenize = (str: string) => {
    return str.split(/(\s+)/).filter(token => token.length > 0);
  };

  const oldWords = tokenize(oldStr);
  const newWords = tokenize(newStr);

  const n = oldWords.length;
  const m = newWords.length;

  // Initialize DP table
  const dp: number[][] = Array(n + 1).fill(0).map(() => Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find differences
  const result: DiffToken[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      result.unshift({ type: 'common', value: oldWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', value: newWords[j - 1] });
      j--;
    } else {
      result.unshift({ type: 'removed', value: oldWords[i - 1] });
      i--;
    }
  }

  // Merge contiguous tokens of the same type for cleaner rendering
  const merged: DiffToken[] = [];
  for (const token of result) {
    const last = merged[merged.length - 1];
    if (last && last.type === token.type) {
      last.value += token.value;
    } else {
      merged.push({ ...token });
    }
  }

  return merged;
}
