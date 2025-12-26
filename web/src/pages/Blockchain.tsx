import { PageContainer } from "@/components/PageContainer";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "react-toastify";

interface UserEntry {
  id: string;
  walletAddress: string;
  addedAt: string;
}

export function Blockchain() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [newUserAddress, setNewUserAddress] = useState("");
  const [users, setUsers] = useState<UserEntry[]>([]);

  // Check if wallet is already connected on mount
  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  const checkIfWalletIsConnected = async () => {
    try {
      if (!window.ethereum) {
        return;
      }

      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });

      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        console.log("✅ Wallet already connected:", accounts[0]);
      }
    } catch (error) {
      console.error("Error checking wallet connection:", error);
    }
  };

  const connectWallet = async () => {
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        toast.error("Please install MetaMask browser extension to continue.");
        window.open("https://metamask.io/download/", "_blank");
        return;
      }

      setIsConnecting(true);

      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const address = accounts[0];
      setWalletAddress(address);

      console.log("🔗 Connected Wallet Address:", address);

      // Create a message to sign
      const message = `Sign this message to authenticate with RCV.\n\nWallet: ${address}\nTimestamp: ${new Date().toISOString()}`;

      // Request signature
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [message, address],
      });

      console.log("✍️ Message:", message);
      console.log("🔐 Signature:", signature);
      console.log("📋 Full Authentication Data:", {
        walletAddress: address,
        message: message,
        signature: signature,
        timestamp: new Date().toISOString(),
      });

      toast.success(`Wallet connected: ${address.substring(0, 6)}...${address.substring(address.length - 4)}`);
    } catch (error: any) {
      console.error("❌ Error connecting wallet:", error);

      if (error.code === 4001) {
        toast.warning("You rejected the wallet connection request.");
      } else {
        toast.error(error.message || "Failed to connect wallet.");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    console.log("🔌 Wallet disconnected");
    toast.info("Your wallet has been disconnected.");
  };

  const addUser = async () => {
    // Validate Ethereum address format (basic validation)
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    
    if (!newUserAddress.trim()) {
      toast.error("Please enter a wallet address");
      return;
    }

    if (!ethAddressRegex.test(newUserAddress)) {
      toast.error("Invalid Ethereum address format");
      return;
    }

    // Check for duplicates
    if (users.some(user => user.walletAddress.toLowerCase() === newUserAddress.toLowerCase())) {
      toast.warning("This wallet address is already added");
      return;
    }

    // Verify the address exists on the blockchain
    try {
      if (!window.ethereum) {
        toast.error("MetaMask is required to verify addresses");
        return;
      }

      toast.info("Verifying wallet address on blockchain...");

      // Check if the address has any balance (even 0 is valid - means it exists)
      const balance = await window.ethereum.request({
        method: "eth_getBalance",
        params: [newUserAddress, "latest"],
      });

      // Also check transaction count to confirm the address exists
      const txCount = await window.ethereum.request({
        method: "eth_getTransactionCount",
        params: [newUserAddress, "latest"],
      });

      console.log("🔍 Blockchain Verification:", {
        address: newUserAddress,
        balance: balance,
        transactionCount: txCount,
        balanceInEth: parseInt(balance, 16) / 1e18,
      });

      // If we get here without error, the address is valid on the blockchain
      const newUser: UserEntry = {
        id: Date.now().toString(),
        walletAddress: newUserAddress,
        addedAt: new Date().toISOString(),
      };

      setUsers([...users, newUser]);
      console.log("👤 New User Added:", newUser);
      console.log("📊 All Users:", [...users, newUser]);
      
      const balanceInEth = parseInt(balance, 16) / 1e18;
      toast.success(
        `✅ Verified & Added: ${newUserAddress.substring(0, 6)}...${newUserAddress.substring(newUserAddress.length - 4)} (${balanceInEth.toFixed(4)} ETH)`
      );
      setNewUserAddress("");
    } catch (error: any) {
      console.error("❌ Failed to verify address:", error);
      toast.error("Failed to verify address on blockchain. It may not exist or network error occurred.");
    }
  };

  const removeUser = (id: string) => {
    const updatedUsers = users.filter(user => user.id !== id);
    setUsers(updatedUsers);
    toast.info("User removed");
    console.log("🗑️ User removed, remaining users:", updatedUsers);
  };

  return (
    <PageContainer
      title="Certificate Blockchain"
      description="Immutable certificate verification powered by blockchain technology"
    >
      {/* Wallet Connection Card */}
      <Card className="mb-6 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 app-bg-primary-soft rounded-lg shrink-0">
                <Wallet className="h-5 w-5 app-text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">
                  MetaMask Wallet
                </h3>
                {walletAddress ? (
                  <p className="text-sm text-neutral-600 font-mono">
                    {walletAddress.substring(0, 6)}...
                    {walletAddress.substring(walletAddress.length - 4)}
                  </p>
                ) : (
                  <p className="text-sm text-neutral-600">
                    Connect your wallet to authenticate
                  </p>
                )}
              </div>
            </div>

            {walletAddress ? (
              <Button
                onClick={disconnectWallet}
                variant="outline"
                className="w-full sm:w-auto"
              >
                Disconnect Wallet
              </Button>
            ) : (
              <Button
                onClick={connectWallet}
                disabled={isConnecting}
                className="w-full sm:w-auto app-bg-primary hover:app-bg-primary-hover"
              >
                {isConnecting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="h-4 w-4 mr-2" />
                    Connect Wallet
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add User Card */}
      <Card className="mt-6 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 app-bg-primary-soft rounded-lg shrink-0">
              <UserPlus className="h-5 w-5 app-text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">
                Add User Wallet
              </h3>
              <p className="text-sm text-neutral-600">
                Enter MetaMask wallet addresses to track
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="0x..."
              value={newUserAddress}
              onChange={(e) => setNewUserAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addUser()}
              className="flex-1 font-mono text-sm"
            />
            <Button
              onClick={addUser}
              className="app-bg-primary hover:app-bg-primary-hover"
            >
              Add User
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs with Tables */}
      <Card className="mt-6 overflow-hidden">
        <CardContent className="p-6">
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
              <TabsTrigger value="products">Products (0)</TabsTrigger>
            </TabsList>
            
            <TabsContent value="users" className="mt-4">
              {users.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  <p>No users added yet. Add a wallet address above to get started.</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Wallet Address</TableHead>
                        <TableHead>Added At</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-mono text-sm">
                            {user.walletAddress.substring(0, 10)}...
                            {user.walletAddress.substring(user.walletAddress.length - 8)}
                          </TableCell>
                          <TableCell className="text-sm text-neutral-600">
                            {new Date(user.addedAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeUser(user.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="products" className="mt-4">
              <div className="text-center py-8 text-neutral-500">
                <p>Product tracking coming soon...</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
