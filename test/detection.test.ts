import { afterEach, describe, expect, it } from 'vitest';
import { isCip30Provider } from '../src/core/cip30';
import { getDetectedWallets, wallet } from '../src/core/store';

const cip30 = (extra: Record<string, unknown> = {}) => ({
	enable: async () => ({}),
	isEnabled: async () => false,
	...extra,
});

function inject(ns: Record<string, unknown>) {
	(globalThis as any).window = globalThis;
	(globalThis as any).cardano = ns;
}

afterEach(() => {
	delete (globalThis as any).cardano;
});

describe('isCip30Provider', () => {
	it('accepts anything exposing enable + isEnabled', () => {
		expect(isCip30Provider(cip30())).toBe(true);
	});
	it('rejects junk pages put on window.cardano', () => {
		expect(isCip30Provider(undefined)).toBe(false);
		expect(isCip30Provider('nami')).toBe(false);
		expect(isCip30Provider({ enable: async () => ({}) })).toBe(false); // no isEnabled
	});
});

describe('getDetectedWallets', () => {
	it('detects wallets that are NOT in the known list', () => {
		// the old allowlist filter dropped these entirely
		inject({ yoroi: cip30(), somewalletfrom2027: cip30() });
		getDetectedWallets();
		expect(wallet.detectedWallets.map((w) => w.name).sort()).toEqual([
			'somewalletfrom2027',
			'yoroi',
		]);
	});

	it('ignores non-CIP-30 keys', () => {
		inject({ nami: cip30(), __somethingElse: { hello: 1 } });
		getDetectedWallets();
		expect(wallet.detectedWallets.map((w) => w.name)).toEqual(['nami']);
	});

	it("uses the wallet's own name first, our table only as a fallback", () => {
		inject({
			nami: cip30({ name: 'Nami Wallet' }),
			unknownone: cip30({ name: 'Fancy Wallet' }),
			typhoncip30: cip30(),   // injects no name, but IS in the table
			bare: cip30(),          // injects no name and is unknown
		});
		getDetectedWallets();
		const byName = Object.fromEntries(wallet.detectedWallets.map((w) => [w.name, w.displayName]));
		expect(byName['nami']).toBe('Nami Wallet');        // self-reported wins
		expect(byName['unknownone']).toBe('Fancy Wallet');
		expect(byName['typhoncip30']).toBe('Typhon');      // table fallback
		expect(byName['bare']).toBe('Bare');               // prettified key
	});

	it('does not privilege known wallets in the ordering', () => {
		inject({ eternl: cip30({ name: 'Eternl' }), aaunknown: cip30({ name: 'Aardvark' }) });
		getDetectedWallets();
		// purely alphabetical — an unknown wallet may absolutely come first
		expect(wallet.detectedWallets.map((w) => w.displayName)).toEqual(['Aardvark', 'Eternl']);
	});
});
