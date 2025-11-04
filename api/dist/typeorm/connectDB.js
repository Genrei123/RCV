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
Object.defineProperty(exports, "__esModule", { value: true });
const data_source_1 = require("./data-source");
/**
 * Connects to the database and initializes the data source.
 *
 * This function attempts to establish a connection to the database and initialize the data source.
 * If successful, it logs a success message to the console. If an error occurs, it logs the error and exits the process.
 *
 * @async
 * @returns {Promise<void>}
 */
const ConnectDatabase = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield data_source_1.DB.initialize();
        console.log('Data Source has been initialized!');
    }
    catch (error) {
        console.error('Error during Data Source initialization:', error);
        process.exit(1);
    }
});
exports.default = ConnectDatabase;
//# sourceMappingURL=connectDB.js.map