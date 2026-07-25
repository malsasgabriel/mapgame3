import assert from 'node:assert/strict';
import test from 'node:test';
import { BuyShopItem } from '../domain/use-cases/BuyShopItem';
import { MovePlayer } from '../domain/use-cases/MovePlayer';
import { getWorldCollectibles, WORLD_LANDMARKS } from '../domain/world';
import { MemoryPlayerRepository, makePlayer } from './helpers';

test('movement clamps teleport attempts and derives distance server-side', async () => {
  const repo = new MemoryPlayerRepository([makePlayer({ x: 1000, y: 900, walkKm: 0 })]);
  const result = await new MovePlayer(repo).execute({ id: 'test-player', x: 2360, y: 1760, walkKm: 99999 });
  assert.ok(result);
  assert.ok(Math.hypot(result.player.x - 1000, result.player.y - 900) <= 220.0001);
  assert.ok(result.player.walkKm > 0 && result.player.walkKm < 1);
});

test('landmarks are discovered only by actual server-side proximity', async () => {
  const repo = new MemoryPlayerRepository([makePlayer({ x: 1291, y: 1193, discovered: [] })]);
  const result = await new MovePlayer(repo).execute({
    id: 'test-player', x: 1291, y: 1193,
    // A malicious browser may claim any landmark; this payload is ignored.
    discovered: ['holmenkollen', 'gruner'],
  });
  assert.ok(result);
  assert.deepEqual(result.discoveries, ['palace']);
  assert.deepEqual(result.player.discovered, ['palace']);
  assert.equal(result.player.coins, 1270);
  assert.equal(result.player.xp, 670);
  assert.ok(Math.abs(result.player.lat - 59.917) < 0.001);
  assert.ok(Math.abs(result.player.lng - 10.7276) < 0.001);
});

test('shop catalog is authoritative and an owned item equips without a second charge', async () => {
  const repo = new MemoryPlayerRepository([makePlayer({ coins: 500 })]);
  const shop = new BuyShopItem(repo);
  const purchased = await shop.execute({ playerId: 'test-player', itemId: 'hat_cap' });
  assert.ok(purchased);
  assert.equal(purchased.player.coins, 380);
  assert.equal(purchased.player.hat, '🧢');

  const equipped = await shop.execute({ playerId: 'test-player', itemId: 'hat_cap' });
  assert.ok(equipped);
  assert.equal(equipped.player.coins, 380);
  await assert.rejects(() => shop.execute({ playerId: 'test-player', itemId: 'forged_free_crown' }), /UNKNOWN_SHOP_ITEM/);
});

test('real Oslo landmark coordinates stay aligned with the map projection', () => {
  assert.deepEqual(WORLD_LANDMARKS, [
    { id: 'opera', x: 1594, y: 1406 }, { id: 'palace', x: 1291, y: 1193 },
    { id: 'vigeland', x: 960, y: 968 }, { id: 'akershus', x: 1404, y: 1418 },
    { id: 'akerbrygge', x: 1224, y: 1395 }, { id: 'karljohan', x: 1428, y: 1283 },
    { id: 'holmenkollen', x: 576, y: 158 }, { id: 'gruner', x: 1644, y: 1058 },
  ]);
});

test('daily world generation is deterministic and bounded', () => {
  const date = new Date('2026-07-26T12:00:00.000Z');
  const one = getWorldCollectibles(date);
  const two = getWorldCollectibles(date);
  assert.deepEqual(one, two);
  assert.equal(one.length, 22);
  assert.ok(one.every(item => item.x >= 100 && item.x <= 2300 && item.y >= 100 && item.y <= 1700));
});
