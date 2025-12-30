import { useState, useEffect } from 'react';
import { Wallet, Check, X, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MetaMaskService } from '@/services/metaMaskService';
import { toast } from 'react-toastify';

interface MetaMaskConnectorProps {
  userId?: string;
  userWalletAddress?: string;
  onConnect?: (address: string, isAuthorized: boolean) => void;
  onDisconnect?: () => void;
  showStatus?: boolean;
  compact?: boolean;
}

export function MetaMaskConnector({
  userId,
  userWalletAddress,
  onConnect,
  onDisconnect,
  showStatus = true,
  compact = false
}: MetaMaskConnectorProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOnSepolia, setIsOnSepolia] = useState(false);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);

  // Check MetaMask and session on mount
  useEffect(() => {
    const checkMetaMask = async () => {
      const installed = MetaMaskService.isMetaMaskInstalled();
      setIsMetaMaskInstalled(installed);

      if (installed) {
        // Check if already connected in session
        const sessionWallet = MetaMaskService.getSessionWallet();
        if (sessionWallet) {
          // Verify it's still connected in MetaMask
          const accounts = await MetaMaskService.getConnectedAccounts();
          if (accounts.includes(sessionWallet.toLowerCase())) {
            setConnectedAddress(sessionWallet);
            await checkWalletStatus(sessionWallet);
          } else {
            MetaMaskService.clearSessionWallet();
          }
        }

        // Check network
        const onSepolia = await MetaMaskService.isOnSepolia();
        setIsOnSepolia(onSepolia);
      }
    };

    checkMetaMask();
  }, []);

  // Listen for account and chain changes
  useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        handleDisconnect();
      } else if (accounts[0] !== connectedAddress) {
        setConnectedAddress(accounts[0]);
        MetaMaskService.setSessionWallet(accounts[0]);
        checkWalletStatus(accounts[0]);
      }
    };

    const handleChainChanged = async () => {
      const onSepolia = await MetaMaskService.isOnSepolia();
      setIsOnSepolia(onSepolia);
    };

    if (isMetaMaskInstalled) {
      MetaMaskService.onAccountsChanged(handleAccountsChanged);
      MetaMaskService.onChainChanged(handleChainChanged);
    }

    return () => {
      if (isMetaMaskInstalled) {
        MetaMaskService.removeAccountsListener(handleAccountsChanged);
        MetaMaskService.removeChainListener(handleChainChanged);
      }
    };
  }, [connectedAddress, isMetaMaskInstalled]);

  const checkWalletStatus = async (address: string) => {
    try {
      const result = await MetaMaskService.checkWalletAuthorization(address);
      setIsAuthorized(result.isAuthorized);
      setIsAdmin(result.isAdmin);
      
      // If user ID provided, verify with backend
      if (userId) {
        const verification = await MetaMaskService.verifyWalletWithBackend(userId, address);
        if (verification.success && verification.data) {
          setIsAuthorized(verification.data.canPerformBlockchainOps);
          setIsAdmin(verification.data.isAdmin);
          onConnect?.(address, verification.data.canPerformBlockchainOps);
        }
      } else {
        onConnect?.(address, result.isAuthorized);
      }
    } catch (error) {
      console.error('Error checking wallet status:', error);
    }
  };

  const handleConnect = async () => {
    if (!isMetaMaskInstalled) {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    setIsConnecting(true);
    try {
      const connection = await MetaMaskService.connectWallet();
      
      if (connection) {
        setConnectedAddress(connection.address);
        
        // Check if on Sepolia
        const onSepolia = await MetaMaskService.isOnSepolia();
        setIsOnSepolia(onSepolia);
        
        if (!onSepolia) {
          toast.warning('Please switch to Sepolia network for blockchain operations');
        }
        
        await checkWalletStatus(connection.address);
        toast.success('Wallet connected successfully!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    MetaMaskService.disconnectWallet();
    setConnectedAddress(null);
    setIsAuthorized(false);
    setIsAdmin(false);
    onDisconnect?.();
    toast.info('Wallet disconnected');
  };

  const handleSwitchNetwork = async () => {
    const success = await MetaMaskService.switchToSepolia();
    if (success) {
      setIsOnSepolia(true);
      toast.success('Switched to Sepolia network');
    } else {
      toast.error('Failed to switch network');
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Compact mode for sidebar/header
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {connectedAddress ? (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isAuthorized ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-xs font-mono">{truncateAddress(connectedAddress)}</span>
            <button
              onClick={handleDisconnect}
              className="text-xs text-red-500 hover:text-red-700"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={handleConnect}
            disabled={isConnecting}
            className="text-xs"
          >
            {isConnecting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Wallet className="h-3 w-3 mr-1" />
            )}
            Connect
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-[#005440]" />
          <h3 className="font-semibold text-gray-900">MetaMask Wallet</h3>
        </div>
        {connectedAddress && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDisconnect}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            Disconnect
          </Button>
        )}
      </div>

      {!isMetaMaskInstalled ? (
        <div className="text-center py-4">
          <AlertTriangle className="h-10 w-10 text-yellow-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-3">MetaMask is not installed</p>
          <Button onClick={handleConnect} className="bg-[#f6851b] hover:bg-[#e2761b]">
            Install MetaMask
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </div>
      ) : !connectedAddress ? (
        <div className="text-center py-4">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" 
            alt="MetaMask" 
            className="w-16 h-16 mx-auto mb-3"
          />
          <p className="text-sm text-gray-600 mb-3">
            Connect your MetaMask wallet to perform blockchain operations
          </p>
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="bg-[#f6851b] hover:bg-[#e2761b]"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4 mr-2" />
                Connect Wallet
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Connected Address */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
            <div>
              <p className="text-xs text-gray-500">Connected Address</p>
              <p className="font-mono text-sm">{truncateAddress(connectedAddress)}</p>
            </div>
            <a
              href={`https://sepolia.etherscan.io/address/${connectedAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          {showStatus && (
            <>
              {/* Network Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Network</span>
                <div className="flex items-center gap-2">
                  {isOnSepolia ? (
                    <>
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">Sepolia</span>
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-600">Wrong Network</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSwitchNetwork}
                        className="text-xs"
                      >
                        Switch
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Authorization Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Authorization</span>
                <div className="flex items-center gap-2">
                  {isAuthorized ? (
                    <>
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">Authorized</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm text-yellow-600">Not Authorized</span>
                    </>
                  )}
                </div>
              </div>

              {/* Admin Status */}
              {isAdmin && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Role</span>
                  <span className="text-sm font-medium text-[#005440] bg-[#005440]/10 px-2 py-0.5 rounded">
                    Admin
                  </span>
                </div>
              )}

              {/* Wallet Match Status */}
              {userWalletAddress && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Wallet Match</span>
                  <div className="flex items-center gap-2">
                    {connectedAddress.toLowerCase() === userWalletAddress.toLowerCase() ? (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600">Matched</span>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-600">Mismatch</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Blockchain Operations Status */}
          {!isAuthorized && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
              <p className="text-xs text-yellow-700">
                <AlertTriangle className="h-3 w-3 inline mr-1" />
                Your wallet is not authorized for blockchain operations. 
                Contact an administrator to get access.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MetaMaskConnector;
