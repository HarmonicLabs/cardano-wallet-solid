# @harmoniclabs/cardano-wallet-solid

CIP-30 wallet layer for SolidJS: a headless reactive store, plus an optional
SUID connect button.

Supersedes two older packages, both now deprecated:

| package | why it was replaced |
|---|---|
| [`@harmoniclabs/use-cardano-wallet`](https://github.com/HarmonicLabs/use-cardano-wallet) | React-only (zustand + immer + a `react` peer dep) |
| [`cardano-wallet-connect-solidjs-component`](https://github.com/HarmonicLabs/cardano-wallet-connect-solidjs-component) | discarded the enabled CIP-30 API and persisted only a wallet name, so every call site had to `enable()` the extension again |

## Install

```bash
npm install @harmoniclabs/cardano-wallet-solid
```

`solid-js` is a peer dependency. `@suid/material` and `@suid/icons-material`
are optional peers, needed only for the `/suid` entrypoint.

## Headless core

```tsx
import { initWallet, wallet, connect, disconnect, refetchBalance } from '@harmoniclabs/cardano-wallet-solid';

// once, at the app root: detect injected wallets + auto-reconnect the last one
onMount(() => initWallet());

// `wallet` is a Solid store — reads are fine-grained and reactive
<Show when={wallet.isConnected} fallback={<button onClick={() => connect('eternl')}>Connect</button>}>
  <p>{wallet.address}</p>
  <p>{wallet.lovelaceBalance} lovelace</p>
</Show>
```

The same plain reads work outside a reactive scope, which is what non-component
code (transaction signing, UTxO watching) needs:

```ts
const api = wallet.api;          // the enabled CIP-30 handle
if (!api) throw new Error('no wallet connected');
const utxos = (await api.getUtxos()) ?? [];
```

### State

| field | |
|---|---|
| `isConnected` / `isConnecting` / `isRefetchingBalance` | status flags |
| `detectedWallets` | `WalletInfo[]` — everything CIP-30 shaped on `window.cardano` |
| `address` / `rewardAddress` | bech32, network-correct |
| `connectedWallet` / `selectedWallet` | `WalletInfo` |
| `lovelaceBalance` | `number \| null` |
| `api` | the enabled CIP-30 handle |
| `network` | `NetworkId.MAINNET \| NetworkId.TESTNET` |

## SUID button

```tsx
import { CardanoWalletConnect } from '@harmoniclabs/cardano-wallet-solid/suid';

<CardanoWalletConnect showName />
```

Props: `showName`, `buttonVariant`, `buttonColor`, `connectLabel`. Supplying a
variant or color hands styling back to your SUID theme instead of the built-in
gradient.

## Wallet detection is fully dynamic

Detection duck-types every `window.cardano` entry for `enable()` and
`isEnabled()`. There is **no allowlist**: a wallet released after this package
shipped is detected with no change here, listed under whatever name it reports
for itself, sorted alphabetically with no wallet privileged.

`KnownWallet` and `walletPrettyNames` exist only as conveniences — a typed enum
for common keys, and display names for wallets that inject none. Neither
filters anything.

> The previous implementation filtered detection through an eight-name list, so
> a user whose only wallet was Yoroi or NuFi was told none was installed.

## Note on network ids

A Cardano address header byte packs `(addressType << 4) | networkId`, so the
network id is the **low nibble** and the byte must never be compared whole:

```ts
(header & 0x0f) === NetworkId.MAINNET   // correct
header === NetworkId.MAINNET            // wrong for every non-base address
```

The whole-byte form is silent on testnet and only misbehaves in production —
a mainnet reward address (`0xe1`) bech32s as `stake_test`, a mainnet enterprise
address (`0x61`) as `addr_test`. It shipped that way in
`@harmoniclabs/use-cardano-wallet@0.0.3`. `test/networkId.test.ts` is the
regression gate; use the exported `networkIdOf()` rather than reading the byte
yourself.

## Development

```bash
npm install
npm run build       # tsup, two entrypoints
npm test            # vitest
npm run typecheck
```

## License

MIT
