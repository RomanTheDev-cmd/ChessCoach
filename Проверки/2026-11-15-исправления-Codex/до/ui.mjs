export function moveOffset(src, dst) { return { dx: src.left - dst.left, dy: src.top - dst.top }; }
export function shouldRecordInterrupt(session) {
  return !!session && !session.saved && (session.page > 0 || session.phase === 'train' || session.phase === 'quiz' || session.phase === 'demo' || session.phase === 'done');
}
