/** Reproducible local SQLite trigger/index write-amplification diagnostic.
 * This is NOT a Cloudflare D1 billing measurement or official AML volume.
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

const schema = readFileSync(new URL('../schema.sql', import.meta.url), 'utf8');
const sampleCount = Number(process.env.WRITE_SAMPLE_COUNT || 300);
if (!Number.isSafeInteger(sampleCount) || sampleCount < 20 || sampleCount > 10000) throw Error('WRITE_SAMPLE_COUNT must be 20..10000');
function makeRecord(i, variant) {
  if (variant === 'routine') return 'assistant: src/cache/parserConfig.ts confirmed cache invalidation, tests passed; retry worked for issue ' + (i % 50) + '.';
  let x = i + 17;
  const fragments = [];
  for (let j = 0; j < 95; j++) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    fragments.push('symbol_' + x.toString(36) + '_step' + j);
  }
  return 'user: repository/src/module_' + (i % 20) + '/parser.ts ' + fragments.join(' ');
}
function measure(variant) {
  const db = new DatabaseSync(':memory:');
  db.exec(schema);
  const write = db.prepare('INSERT INTO memories(user_id,session_id,request_id,part,content,signals,created_at) VALUES(?,?,?,?,?,?,?)');
  const before = Number(db.prepare('SELECT total_changes() AS n').get().n);
  let rawBytes = 0;
  for (let i = 0; i < sampleCount; i++) {
    const content = makeRecord(i, variant);
    rawBytes += Buffer.byteLength(content, 'utf8');
    write.run('u' + (i % 11), 's' + i, 'r' + i, 0, content, '', '2026-10-26T00:00:00Z');
  }
  const changes = Number(db.prepare('SELECT total_changes() AS n').get().n) - before;
  const physicalBytes = Number(db.prepare('PRAGMA page_count').get().page_count) * Number(db.prepare('PRAGMA page_size').get().page_size);
  const count = Number(db.prepare('SELECT count(*) AS n FROM memories').get().n);
  if (count !== sampleCount) throw Error('Unsuccessful insertion');
  db.close();
  return { variant, records: count, totalSQLiteChanges: changes, SQLiteChangesPerEvidence: +(changes / count).toFixed(2), originalMB: +(rawBytes / 1e6).toFixed(3), SQLiteMB: +(physicalBytes / 1e6).toFixed(3) };
}
const scenarios = [measure('routine'), measure('diverse')];
console.log(JSON.stringify({ evidence: 'Local SQLite only; total_changes includes FTS trigger/internal table activity; NOT Cloudflare billable D1 row-write accounting', sampleCount, scenarios, cautions: ['No claim D1 per-day quotas are calculated from total_changes()', 'Record counts are not token counts', 'Synthetic fixtures are not organizer Add payloads', 'Cloudflare D1 row writes and full evaluation concurrency require independent remote measurement'] }, null, 2));
