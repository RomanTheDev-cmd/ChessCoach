import {test} from 'node:test';
import assert from 'node:assert/strict';
import {moveOffset,shouldRecordInterrupt} from '../src/ui.mjs';

test('move offset starts the piece at the source, not on the opposite side (e2->e4)', () => {
  const src = {left: 100, top: 500}; // e2
  const dst = {left: 100, top: 340}; // e4 (выше по экрану)
  const o = moveOffset(src, dst);
  assert.equal(o.dx, 0);
  assert.equal(o.dy, 160);
  // картинка уже стоит в dst; смещение должно вернуть её в src
  assert.equal(dst.top + o.dy, src.top);
  assert.equal(dst.left + o.dx, src.left);
});

test('move offset is zero only when source and destination coincide', () => {
  const p = {left: 10, top: 20};
  assert.deepEqual(moveOffset(p, {...p}), {dx: 0, dy: 0});
});

test('an interrupted lesson is recorded also when its phase is done (close during engine assessment)', () => {
  const base = {saved: false, page: 0};
  assert.equal(shouldRecordInterrupt({...base, phase: 'done'}), true);
  assert.equal(shouldRecordInterrupt({...base, phase: 'train'}), true);
  assert.equal(shouldRecordInterrupt({...base, phase: 'quiz'}), true);
  assert.equal(shouldRecordInterrupt({...base, phase: 'demo'}), true);
  assert.equal(shouldRecordInterrupt({...base, page: 1, phase: 'read'}), true);
});

test('an untouched or already saved lesson is not recorded again', () => {
  const base = {saved: false, page: 0};
  assert.equal(shouldRecordInterrupt({...base, phase: 'intro'}), false);
  assert.equal(shouldRecordInterrupt({...base, phase: 'read'}), false);
  assert.equal(shouldRecordInterrupt({...base, saved: true, phase: 'done'}), false);
  assert.equal(shouldRecordInterrupt(null), false);
  assert.equal(shouldRecordInterrupt(undefined), false);
});
