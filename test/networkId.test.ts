import { describe, expect, it } from 'vitest';
import { NetworkId, networkIdOf } from '../src/core/store';

/**
 * Regression gate for the bug that split @harmoniclabs/use-cardano-wallet into
 * two divergent 0.0.3 tarballs: the header byte was compared whole
 * (`buf[0] === NetworkId.MAINNET`) instead of masking the low nibble.
 *
 * Header byte = (addressType << 4) | networkId.
 * Every testnet case passes under BOTH implementations, which is exactly why
 * this survived so long — only mainnet non-base addresses expose it.
 */
describe('networkIdOf', () => {
	const cases: Array<[string, number, NetworkId]> = [
		// type 0 — base address (payment + stake)
		['base testnet',       0x00, NetworkId.TESTNET],
		['base mainnet',       0x01, NetworkId.MAINNET],
		// type 6 — enterprise (payment only)
		['enterprise testnet', 0x60, NetworkId.TESTNET],
		['enterprise mainnet', 0x61, NetworkId.MAINNET],
		// type 14 — reward / stake address
		['reward testnet',     0xe0, NetworkId.TESTNET],
		['reward mainnet',     0xe1, NetworkId.MAINNET],
		// type 4 — pointer
		['pointer mainnet',    0x41, NetworkId.MAINNET],
	];

	for (const [name, header, expected] of cases) {
		it(`${name} (0x${header.toString(16).padStart(2, '0')}) → ${NetworkId[expected]}`, () => {
			expect(networkIdOf(Uint8Array.from([header, 0, 0]))).toBe(expected);
		});
	}

	it('rejects the whole-byte comparison that shipped in 0.0.3', () => {
		// mainnet reward: the old check produced TESTNET, bech32ing it `stake_test`
		const mainnetReward = Uint8Array.from([0xe1, 0, 0]);
		expect(mainnetReward[0] === NetworkId.MAINNET).toBe(false);   // the old, wrong result
		expect(networkIdOf(mainnetReward)).toBe(NetworkId.MAINNET);   // the fix
	});
});
