// import { globalProductBlockchain } from "../controllers/scan/Scan"
import { DB } from "../typeorm/data-source";

export const searchProductInBlockchain = (searchTerm: string) => {
    // Blockchain must already be implemented
    // if (!globalProductBlockchain) {
    //     return null;
    // }

    // const blockchain = globalProductBlockchain.blockhain;
    // for (let i = 0; i < blockchain.length; i++) {
    //     const block = blockchain[i];
    //     const product = block.data.productName;

    //     if (product.toLowerCase() === searchTerm.toLowerCase()) {
    //         return block;
    //     }
    // }

    // return null;
}

export const getAllProductsInBlockchain = () => {
    // if (!globalProductBlockchain) {
    //     return [];
    // }
    // return globalProductBlockchain.blockhain;
}