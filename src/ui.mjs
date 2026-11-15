export function moveOffset(src, dst) { return { dx: src.left - dst.left, dy: src.top - dst.top }; }
export function shouldRecordInterrupt(session) {
  return !!session && !session.saved && (session.page > 0 || session.phase === 'train' || session.phase === 'quiz' || session.phase === 'demo' || session.phase === 'done');
}

// Track the whole move, including its engine assessment and automatic reply.
export function runStudyOperation(session, operation) {
  if (!session) return Promise.resolve();
  session.operations ??= new Set();
  const pending = operation();
  session.operations.add(pending);
  return pending.finally(() => session.operations.delete(pending));
}
export async function waitForStudyOperations(session) {
  while (session.operations?.size) await Promise.all([...session.operations]);
}
