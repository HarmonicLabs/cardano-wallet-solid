// Headless CIP-30 wallet layer for SolidJS.
//
// Supersedes @harmoniclabs/use-cardano-wallet (React/zustand/immer) and
// cardano-wallet-connect-solidjs-component (which discarded the enabled API and
// persisted only a wallet name). Same behaviour as the former — detection,
// connect with address/balance/reward derivation, auto-reconnect via
// localStorage — on Solid store state with no framework-foreign deps.
//
// Usage:
//   - components: read `wallet.address`, `wallet.api`, ... (reactive createStore)
//   - non-reactive code (tx signing, utxo watching): the same plain reads
//   - app root calls `initWallet()` once (detection + auto-reconnect)
import { createStore } from 'solid-js/store';
import { Cbor, CborArray, CborUInt } from '@harmoniclabs/cbor';
import { fromHex } from '@harmoniclabs/uint8array-utils';
import { encodeBech32 } from '@harmoniclabs/crypto';
import {
	NetworkId,
	isCip30Provider,
	prettifyWalletKey,
	walletPrettyNames,
	type WalletApi,
	type WalletName,
} from './cip30';

export * from './cip30';

// Same key the previous implementation used — existing users stay auto-connected.
export const WALLET_LS_KEY = 'cardano-wallet-name';

export interface WalletInfo {
	name: WalletName;
	icon?: string | undefined;
	displayName: string;
}

export interface WalletState {
	isConnected: boolean;
	isConnecting: boolean;
	isRefetchingBalance: boolean;
	detectedWallets: WalletInfo[];
	address: string | null;
	rewardAddress: string | null;
	/** the wallet selected to connect (while connecting) */
	selectedWallet: WalletInfo | null;
	/** the wallet currently connected */
	connectedWallet: WalletInfo | null;
	lovelaceBalance: number | null;
	api: WalletApi | null;
	network: NetworkId | null;
}

const defaults: WalletState = {
	isConnected: false,
	isConnecting: false,
	isRefetchingBalance: false,
	detectedWallets: [],
	address: null,
	rewardAddress: null,
	selectedWallet: null,
	connectedWallet: null,
	lovelaceBalance: null,
	api: null,
	network: null,
};

const [wallet, setWallet] = createStore<WalletState>({ ...defaults });
export { wallet };

/**
 * Network id of a Cardano address, from its header byte.
 *
 * The header packs `(addressType << 4) | networkId`, so the network lives in
 * the LOW NIBBLE and the whole byte must never be compared directly. Getting
 * this wrong is silent on testnet — a testnet base address is 0x00 and a
 * testnet reward address is 0xe0, neither of which equals MAINNET either way —
 * so it only shows up in production, where a mainnet reward address (0xe1)
 * would bech32 as `stake_test` and a mainnet enterprise address (0x61) as
 * `addr_test`. See test/networkId.test.ts.
 */
export function networkIdOf(addressBytes: Uint8Array): NetworkId {
	return (addressBytes[0] & 0x0f) as NetworkId;
}

/** CIP-30 getBalance CBOR → lovelaces. Value is either a uint or [coin, multiasset]. */
export function parseBalance(balanceCborHex: string): number {
	const parsed = Cbor.parse(balanceCborHex);
	if (parsed instanceof CborUInt) return Number(parsed.num);
	if (parsed instanceof CborArray && parsed.array[0] instanceof CborUInt)
		return Number((parsed.array[0] as CborUInt).num);
	return 0;
}

function toWalletInfo(walletName: WalletName): WalletInfo {
	const ns = (globalThis as { cardano?: Record<string, { icon?: string; name?: string }> })?.cardano ?? {};
	const injected = ns[walletName];
	return {
		name: walletName,
		// the wallet's own name wins; our table is only a fallback for wallets
		// that inject none, and the key itself is the final fallback
		displayName:
			injected?.name?.trim() ||
			walletPrettyNames[walletName] ||
			prettifyWalletKey(walletName),
		icon: injected?.icon,
	};
}

/**
 * Scan `window.cardano` for anything CIP-30 shaped.
 *
 * FULLY DYNAMIC: nothing is filtered against a name list and no wallet is
 * privileged in the ordering. Any provider exposing `enable()` and
 * `isEnabled()` is listed, under whatever name it reports for itself — so
 * wallets released after this package ships appear with no change here.
 * Results are sorted alphabetically by display name.
 */
export function getDetectedWallets(): void {
	if (typeof window === 'undefined' || !window.cardano) return;
	const ns = window.cardano;
	setWallet(
		'detectedWallets',
		Object.keys(ns)
			.filter((k) => isCip30Provider(ns[k]))
			.map(toWalletInfo)
			.sort((a, b) => a.displayName.localeCompare(b.displayName)),
	);
}

export async function connect(walletName: WalletName): Promise<void> {
	setWallet({ isConnecting: true, selectedWallet: toWalletInfo(walletName) });
	try {
		if (typeof window === 'undefined' || !window.cardano) throw new Error('window.cardano is undefined');
		const entry = window.cardano[walletName];
		if (!entry) throw new Error(`wallet "${walletName}" not injected`);
		const api = (await entry.enable()) as WalletApi;

		let rawAddress = await api.getChangeAddress();
		if (!rawAddress) rawAddress = (await api.getUsedAddresses())[0];
		if (!rawAddress) rawAddress = (await api.getUnusedAddresses())[0];

		let rewardAddress = (await api.getRewardAddresses())[0] ?? null;
		if (rewardAddress) {
			const buf = fromHex(rewardAddress);
			rewardAddress = encodeBech32(networkIdOf(buf) === NetworkId.MAINNET ? 'stake' : 'stake_test', buf);
		}

		const addressBytes = fromHex(rawAddress);
		const lovelace = parseBalance(await api.getBalance());
		const bechAddr = encodeBech32(networkIdOf(addressBytes) === NetworkId.MAINNET ? 'addr' : 'addr_test', addressBytes);

		localStorage.setItem(WALLET_LS_KEY, walletName);
		setWallet({
			isConnecting: false,
			isConnected: true,
			api,
			lovelaceBalance: lovelace,
			rewardAddress,
			address: bechAddr,
			network: networkIdOf(addressBytes),
			connectedWallet: toWalletInfo(walletName),
		});
	} catch (e) {
		console.error('[wallet] connect failed:', e);
		setWallet({ isConnecting: false, selectedWallet: null });
		throw e;
	}
}

export function disconnect(): void {
	localStorage.removeItem(WALLET_LS_KEY);
	// keep detected wallets, reset the rest
	setWallet({ ...defaults, detectedWallets: wallet.detectedWallets });
}

export async function refetchBalance(): Promise<void> {
	const api = wallet.api;
	if (!api) return;
	setWallet('isRefetchingBalance', true);
	try {
		setWallet({ isRefetchingBalance: false, lovelaceBalance: parseBalance(await api.getBalance()) });
	} catch {
		setWallet('isRefetchingBalance', false);
	}
}

/**
 * One-time boot: detect injected wallets and auto-reconnect the remembered one.
 * The short delay lets extensions finish injecting `window.cardano` first
 * (same 10ms trick the previous implementation used); detection re-runs after
 * a longer delay to catch slow injectors.
 */
export function initWallet(): void {
	if (typeof window === 'undefined') return;
	getDetectedWallets();
	setTimeout(() => {
		getDetectedWallets();
		const remembered = localStorage.getItem(WALLET_LS_KEY) as WalletName | null;
		if (remembered && window.cardano?.[remembered]) void connect(remembered).catch(() => {});
	}, 10);
	setTimeout(getDetectedWallets, 1000);
}
