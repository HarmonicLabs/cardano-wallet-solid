import { describe, expect, it } from 'vitest';
import { fromHex } from '../src/core/store';

describe('fromHex', () => {
	it('decodes bytes', () => {
		expect(Array.from(fromHex('00e1ff'))).toEqual([0x00, 0xe1, 0xff]);
	});
	it('tolerates a 0x prefix', () => {
		expect(Array.from(fromHex('0xe1'))).toEqual([0xe1]);
	});
	it('handles the empty string', () => {
		expect(fromHex('').length).toBe(0);
	});
	it('rejects odd-length input', () => {
		expect(() => fromHex('abc')).toThrow(/odd length/);
	});
	it('rejects non-hex characters', () => {
		expect(() => fromHex('zz')).toThrow(/invalid hex/);
	});
});
