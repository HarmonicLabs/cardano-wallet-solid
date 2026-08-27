// First-party CIP-30 (dApp ↔ wallet web bridge) type definitions.
// No external wallet library — this file plus ./index.ts IS the wallet layer.

export enum NetworkId {
	TESTNET = 0,
	MAINNET = 1,
}

/** hex-encoded bytes */
export type Bytes = string;
/** hex-encoded CBOR */
export type Cbor = string;

export type Paginate = { page: number; limit: number };

type CoseSign1CborHex = string;
type CoseKeyCborHex = string;
export interface Cip30DataSignature {
	key: CoseKeyCborHex;
	signature: CoseSign1CborHex;
}

/** CIP-0103 bulk-sign request */
export type TransactionSignatureRequest = { cbor: Cbor; partialSign?: boolean };
export type SignTxs = (txs: TransactionSignatureRequest[]) => Promise<Cbor[]>;

/**
 * Well-known `window.cardano` keys.
 *
 * This is a CONVENIENCE list, never an allowlist — detection accepts any
 * injected object with a CIP-30 shape. The previous implementation filtered
 * detection through these eight names, so a user whose only wallet was (say)
 * Yoroi or NuFi was told no wallet was installed.
 */
export enum KnownWallet {
	NAMI = 'nami',
	ETERNL = 'eternl',
	FLINT = 'flint',
	BEGIN = 'begin',
	GERO = 'gero',
	TYPHON = 'typhoncip30',
	LACE = 'lace',
	VESPR = 'vespr',
	YOROI = 'yoroi',
	NUFI = 'nufi',
	EXODUS = 'exodus',
	TOKEO = 'tokeo',
}

/** Any key injected into `window.cardano`. Not restricted to {@link KnownWallet}. */
export type WalletName = string;

/** so existing `WalletName.NAMI` call sites keep working */
export const WalletName = KnownWallet;

/**
 * Last-resort display names, consulted ONLY when a wallet injects no `name`
 * of its own. Never used for detection or ordering.
 */
export const walletPrettyNames: Record<string, string> = {
	begin: 'Begin',
	eternl: 'Eternl',
	exodus: 'Exodus',
	flint: 'Flint',
	gero: 'Gero',
	lace: 'Lace',
	nami: 'Nami',
	nufi: 'NuFi',
	tokeo: 'Tokeo',
	typhoncip30: 'Typhon',
	vespr: 'Vespr',
	yoroi: 'Yoroi',
};

/**
 * Turns a bare `window.cardano` key into something presentable, for wallets
 * that inject neither a `name` nor appear in {@link walletPrettyNames}.
 * `typhoncip30` → `Typhon`, `somewallet` → `Somewallet`.
 */
export function prettifyWalletKey(key: string): string {
	const base = key.replace(/cip[-_]?30$/i, '') || key;
	return base.charAt(0).toUpperCase() + base.slice(1);
}

/**
 * Duck-types a `window.cardano` entry as CIP-30.
 *
 * Pages inject all sorts of things into that namespace, so detection keys off
 * the required CIP-30 surface rather than a name list.
 */
export function isCip30Provider(value: unknown): value is InitialApi {
	return (
		!!value &&
		typeof value === 'object' &&
		typeof (value as InitialApi).enable === 'function' &&
		typeof (value as InitialApi).isEnabled === 'function'
	);
}

export interface WalletApi {
	getNetworkId: () => Promise<NetworkId>;
	getUtxos: (amount?: Cbor, paginate?: Paginate) => Promise<Cbor[] | undefined>;
	getBalance: () => Promise<Cbor>;
	getCollateral: (params?: { amount?: Cbor }) => Promise<Cbor[] | null>;
	getUsedAddresses: (paginate?: Paginate) => Promise<Cbor[]>;
	getUnusedAddresses: () => Promise<Cbor[]>;
	getChangeAddress: () => Promise<Cbor>;
	getRewardAddresses: () => Promise<Cbor[]>;
	signTx: (tx: Cbor, partialSign?: boolean) => Promise<Cbor>;
	signData: (addr: string, payload: Bytes) => Promise<Cip30DataSignature>;
	submitTx: (tx: Cbor) => Promise<string>;
	/** CIP-0103 bulk signing — wallets expose it in different places (see lib/txSign) */
	experimental?: { signTxs?: SignTxs };
	cip103?: { signTxs?: SignTxs };
	signTxs?: SignTxs;
}

/** the injected `window.cardano.<name>` entry (pre-enable) */
export interface InitialApi {
	enable: () => Promise<WalletApi>;
	isEnabled: () => Promise<boolean>;
	icon?: string;
	name?: string;
	apiVersion?: string;
}

declare global {
	interface Window {
		cardano?: Record<string, InitialApi>;
	}
}
