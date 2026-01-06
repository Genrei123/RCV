import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { MetaMaskService } from '@/services/metaMaskService';

interface MetaMaskContextType {
  isConnected: boolean;
  walletAddress: string | null;
  isAuthorized: boolean;
  isAdmin: boolean;
  isOnSepolia: boolean;
  isMetaMaskInstalled: boolean;
  connect: (switchAccount?: boolean) => Promise<boolean>;
  disconnect: () => void;
  checkAuthorization: () => Promise<void>;
  switchAccount: () => Promise<boolean>;
}

const MetaMaskContext = createContext<MetaMaskContextType | undefined>(undefined);

export function MetaMaskProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOnSepolia, setIsOnSepolia] = useState(false);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      const installed = MetaMaskService.isMetaMaskInstalled();
      setIsMetaMaskInstalled(installed);

      if (installed) {
        // Check session wallet
        const sessionWallet = MetaMaskService.getSessionWallet();
        if (sessionWallet) {
          const accounts = await MetaMaskService.getConnectedAccounts();
          if (accounts.map(a => a.toLowerCase()).includes(sessionWallet.toLowerCase())) {
            setWalletAddress(sessionWallet);
            setIsConnected(true);
            await checkAuthorizationForWallet(sessionWallet);
          } else {
            MetaMaskService.clearSessionWallet();
          }
        }

        // Check network
        const onSepolia = await MetaMaskService.isOnSepolia();
        setIsOnSepolia(onSepolia);
      }
    };

    init();
  }, []);

  // Listen for account changes
  useEffect(() => {
    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        const newAddress = accounts[0];
        setWalletAddress(newAddress);
        setIsConnected(true);
        MetaMaskService.setSessionWallet(newAddress);
        await checkAuthorizationForWallet(newAddress);
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
  }, [isMetaMaskInstalled]);

  const checkAuthorizationForWallet = async (address: string) => {
    try {
      const result = await MetaMaskService.checkWalletAuthorization(address);
      setIsAuthorized(result.isAuthorized);
      setIsAdmin(result.isAdmin);
    } catch (error) {
      console.error('Error checking authorization:', error);
      setIsAuthorized(false);
      setIsAdmin(false);
    }
  };

  const connect = async (switchAccount: boolean = false): Promise<boolean> => {
    if (!isMetaMaskInstalled) return false;

    try {
      const connection = await MetaMaskService.connectWallet(switchAccount);
      if (connection) {
        setWalletAddress(connection.address);
        setIsConnected(true);
        await checkAuthorizationForWallet(connection.address);
        
        const onSepolia = await MetaMaskService.isOnSepolia();
        setIsOnSepolia(onSepolia);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Connection error:', error);
      return false;
    }
  };

  const switchAccount = async (): Promise<boolean> => {
    return connect(true);
  };

  const disconnect = () => {
    MetaMaskService.disconnectWallet();
    setWalletAddress(null);
    setIsConnected(false);
    setIsAuthorized(false);
    setIsAdmin(false);
  };

  const checkAuthorization = async () => {
    if (walletAddress) {
      await checkAuthorizationForWallet(walletAddress);
    }
  };

  return (
    <MetaMaskContext.Provider
      value={{
        isConnected,
        walletAddress,
        isAuthorized,
        isAdmin,
        isOnSepolia,
        isMetaMaskInstalled,
        connect,
        disconnect,
        checkAuthorization,
        switchAccount
      }}
    >
      {children}
    </MetaMaskContext.Provider>
  );
}

export function useMetaMask() {
  const context = useContext(MetaMaskContext);
  if (context === undefined) {
    throw new Error('useMetaMask must be used within a MetaMaskProvider');
  }
  return context;
}

export default MetaMaskContext;
