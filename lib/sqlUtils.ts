export function parseSql(sql: string): string[] {
  const lines = sql.split(/\r?\n/);
  const statements: string[] = [];
  let current: string[] = [];
  let inTrigger = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') continue;
    current.push(line);
    const upper = trimmed.toUpperCase();
    if (!inTrigger && upper.startsWith('CREATE TRIGGER')) {
      inTrigger = true;
    }
    if (inTrigger && upper === 'END;') {
      statements.push(current.join('\n'));
      current = [];
      inTrigger = false;
      continue;
    }
    if (!inTrigger && upper.endsWith(';')) {
      statements.push(current.join('\n'));
      current = [];
    }
  }
  return statements;
}

