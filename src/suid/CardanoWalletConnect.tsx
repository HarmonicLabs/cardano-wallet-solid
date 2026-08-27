import { createSignal, Show, For } from 'solid-js';
import { Button, Menu, MenuItem, Box, Typography, Divider, ListItemIcon } from '@suid/material';
import LogoutIcon from '@suid/icons-material/Logout';
import ContentCopyIcon from '@suid/icons-material/ContentCopy';
import RefreshIcon from '@suid/icons-material/Refresh';
import AccountBalanceWalletIcon from '@suid/icons-material/AccountBalanceWallet';
import { wallet, connect, disconnect, refetchBalance, type WalletName } from '../core';

export interface CardanoWalletConnectProps {
  /** show the wallet name next to the balance when connected */
  showName?: boolean;
  /** override the connect button's gradient with a flat SUID variant */
  buttonVariant?: 'text' | 'outlined' | 'contained';
  buttonColor?: 'primary' | 'secondary' | 'inherit';
  /** label shown when no wallet is connected */
  connectLabel?: string;
}

const shortAddr = (a: string) => `${a.slice(0, 8)}…${a.slice(-6)}`;
const ada = (lovelace: number | null) =>
  lovelace === null ? '—' : (lovelace / 1_000_000).toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

export function CardanoWalletConnect(props: CardanoWalletConnectProps = {}) {
  const [anchor, setAnchor] = createSignal<HTMLElement | null>(null);
  const open = () => Boolean(anchor());
  const close = () => setAnchor(null);

  const handleConnect = async (name: WalletName) => {
    close();
    try { await connect(name); }
    catch (e) { console.error('Failed to connect wallet:', e); }
  };

  const copyAddress = () => {
    if (wallet.address) void navigator.clipboard.writeText(wallet.address);
    close();
  };

  const buttonSx = {
    borderRadius: '12px',
    textTransform: 'none' as const,
    fontWeight: 600,
    fontSize: '13.5px',
    padding: '7px 16px',
    color: '#FFFFFF',
    background: 'linear-gradient(90deg, #673AB7 0%, #7E57C2 55%, #4A2F91 100%)',
    boxShadow: '0 6px 18px -10px rgba(103,58,183,0.95)',
    transition: 'transform .18s ease, filter .18s ease',
    '&:hover': { transform: 'translateY(-1px)', filter: 'brightness(1.12)' },
  };

  const plainSx = {
    borderRadius: '12px',
    textTransform: 'none' as const,
    fontWeight: 600,
    fontSize: '13.5px',
    padding: '7px 16px',
  };

  return (
    <>
      <Button
        variant={props.buttonVariant}
        color={props.buttonColor}
        onClick={(e: MouseEvent) => setAnchor(e.currentTarget as HTMLElement)}
        startIcon={
          <Show
            when={wallet.connectedWallet?.icon}
            fallback={<AccountBalanceWalletIcon sx={{ fontSize: '18px' }} />}
          >
            <Box
              component="img"
              src={wallet.connectedWallet!.icon}
              alt=""
              sx={{ width: '17px', height: '17px', borderRadius: '4px' }}
            />
          </Show>
        }
        sx={props.buttonVariant || props.buttonColor ? plainSx : buttonSx}
        disabled={wallet.isConnecting}
      >
        <Show
          when={wallet.isConnected && wallet.address}
          fallback={wallet.isConnecting ? 'Connecting…' : (props.connectLabel ?? 'Connect Wallet')}
        >
          <Box component="span" sx={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <Show when={props.showName && wallet.connectedWallet}>
              <Box component="span" sx={{ opacity: 0.85 }}>{wallet.connectedWallet!.displayName}</Box>
            </Show>
            <Box component="span">{ada(wallet.lovelaceBalance)} ₳</Box>
            <Box
              component="span"
              sx={{
                opacity: 0.75,
                fontFamily: '"Intel One Mono", ui-monospace, monospace',
                fontSize: '11.5px',
                display: { xs: 'none', sm: 'inline' },
              }}
            >
              {shortAddr(wallet.address!)}
            </Box>
          </Box>
        </Show>
      </Button>

      <Menu
        anchorEl={anchor()}
        open={open()}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{
          '& .MuiPaper-root': {
            marginTop: '8px',
            minWidth: '244px',
            borderRadius: '14px',
            backgroundImage: 'none',
            border: '1px solid rgba(255,255,255,0.09)',
            boxShadow: '0 22px 55px -26px rgba(0,0,0,0.8)',
          },
        }}
      >
        <Show
          when={wallet.isConnected}
          fallback={
            <>
              <Typography
                sx={{
                  padding: '10px 16px 6px', fontSize: '10.5px', fontWeight: 700,
                  letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.55,
                }}
              >
                Detected wallets
              </Typography>
              <Show
                when={wallet.detectedWallets.length > 0}
                fallback={
                  <MenuItem disabled sx={{ fontSize: '13px', whiteSpace: 'normal', maxWidth: '244px' }}>
                    No CIP-30 wallet found — install one and reload.
                  </MenuItem>
                }
              >
                <For each={wallet.detectedWallets}>
                  {(w) => (
                    <MenuItem onClick={() => handleConnect(w.name)} sx={{ gap: '10px', fontSize: '14px' }}>
                      <Show
                        when={w.icon}
                        fallback={<AccountBalanceWalletIcon sx={{ fontSize: '19px', opacity: 0.7 }} />}
                      >
                        <Box component="img" src={w.icon} alt="" sx={{ width: '19px', height: '19px', borderRadius: '5px' }} />
                      </Show>
                      {w.displayName}
                    </MenuItem>
                  )}
                </For>
              </Show>
            </>
          }
        >
          <Box sx={{ padding: '12px 16px 10px' }}>
            <Typography sx={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.55 }}>
              {wallet.connectedWallet?.displayName ?? 'Connected'}
              {wallet.network === 0 ? ' · testnet' : wallet.network === 1 ? ' · mainnet' : ''}
            </Typography>
            <Typography
              sx={{
                marginTop: '5px', fontSize: '12px', wordBreak: 'break-all',
                fontFamily: '"Intel One Mono", ui-monospace, monospace', opacity: 0.8,
              }}
            >
              {wallet.address}
            </Typography>
            <Typography sx={{ marginTop: '8px', fontSize: '17px', fontWeight: 700 }}>
              {ada(wallet.lovelaceBalance)} ₳
            </Typography>
          </Box>
          <Divider sx={{ opacity: 0.5 }} />
          <MenuItem onClick={copyAddress} sx={{ fontSize: '14px' }}>
            <ListItemIcon><ContentCopyIcon sx={{ fontSize: '17px' }} /></ListItemIcon>
            Copy address
          </MenuItem>
          <MenuItem
            onClick={() => { void refetchBalance(); close(); }}
            disabled={wallet.isRefetchingBalance}
            sx={{ fontSize: '14px' }}
          >
            <ListItemIcon><RefreshIcon sx={{ fontSize: '17px' }} /></ListItemIcon>
            {wallet.isRefetchingBalance ? 'Refreshing…' : 'Refresh balance'}
          </MenuItem>
          <MenuItem onClick={() => { disconnect(); close(); }} sx={{ fontSize: '14px' }}>
            <ListItemIcon><LogoutIcon sx={{ fontSize: '17px' }} /></ListItemIcon>
            Disconnect
          </MenuItem>
        </Show>
      </Menu>
    </>
  );
}
