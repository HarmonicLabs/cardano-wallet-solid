import { describe, expect, it } from 'vitest';
import { wallet } from '../src/core/store';

/**
 * Regression gate for the duplicate-store bug: the "./suid" entry ships a
 * `solid`-condition .jsx that inlines the core, so a consumer importing both
 * entries loaded two stores — detection filled one, the connect button read the
 * other, and the wallet list stayed empty forever.
 */
describe('store singleton', () => {
	it('is pinned to a well-known global symbol', () => {
		const key = Symbol.for('@harmoniclabs/cardano-wallet-solid:store');
		const held = (globalThis as any)[key];
		expect(held).toBeDefined();
		expect(held[0]).toBe(wallet);
	});

	it('a second copy of the module reuses the same store', async () => {
		// cache-busted import = a distinct module instance, like a second bundle copy
		const other = await import('../src/core/store?copy=2' as string);
		expect(other.wallet).toBe(wallet);
	});
});
