import { BaseWallet, JsonRpcProvider } from "ethers";

if (!process.env.SEPOLIA_INFURA_URL) {
    throw new Error("SEPOLIA_INFURA_URL is not defined in environment variables");
}

const provider = new JsonRpcProvider(
    process.env.SEPOLIA_INFURA_URL
)

export const connectToProvider = async () => {
    try {
        const network = await provider.getNetwork();
        console.log(`Connected to Ethereum network: ${network.name} (Chain ID: ${network.chainId})`);
        return provider;
    } catch (error) {
        console.error("Failed to connect to Ethereum provider:", error);
        throw error;
    }
}

export const getProvider = () => {
    return provider;
}

export const isInitialized = (): boolean => {
    return provider !== undefined;
}

export const getNetworkInfo = async () => {
    if (!isInitialized()) {
        throw new Error("Blockchain provider is not initialized");
    }
    const network = await provider.getNetwork();
    return network;
}

export const validateWallet = (wallet:BaseWallet): boolean => {
    if (!wallet || !wallet.address) {
        throw new Error("Invalid wallet provided");
    }
    return true;
}

export const authorizeWallet = async (wallet:BaseWallet, requiredBalanceInEth: number): Promise<boolean> => {
    if (!isInitialized()) {
        throw new Error("Blockchain provider is not initialized");
    }
    return true;
}

export const addDataToBlockchain = async (wallet:BaseWallet, pdfHash: string) => {
    // We are adding only the hash to the blockchain for verification
    if (!isInitialized()) {
        throw new Error("Blockchain provider is not initialized");
    }

    if (!pdfHash) {
        throw new Error("PDF hash is required to add data to blockchain");
    }

    const tx = await wallet.sendTransaction({
        to: wallet.address, // Sending to yourself
        value: 0,           // 0 ETH
        data: pdfHash
    });

    console.log("Transaction sent! Waiting for mining...");
    console.log(`Tx Hash: ${tx.hash}`);

    // Wait for confirmation
    const receipt = await tx.wait();

    if (receipt?.status !== 1) {
        throw new Error("Transaction failed");
    }
    console.log("Success! Block Number: " + receipt.blockNumber);
    console.log("View your data here: https://sepolia.etherscan.io/tx/" + tx.hash);
}



