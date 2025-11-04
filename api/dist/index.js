"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const setUpApp_1 = __importDefault(require("./setUpApp"));
dotenv_1.default.config();
const { PORT } = process.env;
const initializeApp = () => __awaiter(void 0, void 0, void 0, function* () {
    const app = yield (0, setUpApp_1.default)();
    app.listen(PORT || 3000, () => console.log('Server is running on port: ', PORT));
    // Uncomment to test the blockchain functionality. Very similar talaga siya sa linkedlist.
    // let Product: Product = {
    //   LTONumber: "1234567890",
    //   CFPRNumber: "0987654321",
    //   productName: "Sample Product",
    //   productType: 0,
    //   manufacturerName: "Sample Manufacturer",
    //   distributorName: "Sample Distributor",
    //   importerName: "Sample Importer"
    // }
    // let smashingCoin = new ProductBlockchain(Product);
    // smashingCoin.addNewBlock(new ProductBlock(1, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), Product));
    // smashingCoin.addNewBlock(new ProductBlock(2, new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), Product));
    // console.log(JSON.stringify(smashingCoin, null, 4));
});
// Call the function
// Initialize entry of App for server
initializeApp();
//# sourceMappingURL=index.js.map