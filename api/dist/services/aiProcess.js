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
exports.ProcessText = ProcessText;
const openai_1 = __importDefault(require("openai"));
const openai = new openai_1.default({
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    apiKey: "AIzaSyDGKnaSVefE6R4tqNOJ1ia6zcxUDKMjq04"
});
function ProcessText(blockofText) {
    return __awaiter(this, void 0, void 0, function* () {
        const completion = yield openai.chat.completions.create({
            model: "gemini-2.5-flash",
            messages: [
                {
                    role: "system",
                    content: `
                You are in the Philippines, and you are 
                Extract product information from OCR text.
                Return ONLY valid JSON in this exact format:
                {
                    "productName": "extracted product name here",
                    "LTONum": "extracted lto number here",
                    "CFPRNum": "extracted CFPR number here",
                    "ManufacturedBy": "extracted manufacturer",
                    "ExpiryDate": "extracted date" 
                }
                Complete incomplete letters and fix typos.
                Handle messy formatting.
                If you cannot determine some fields, use "Unknown".`
                },
                {
                    role: "user",
                    content: blockofText
                }
            ],
            response_format: { type: "json_object" }
        });
        const content = completion.choices[0].message.content;
        if (!content) {
            throw new Error('No response from AI');
        }
        // Parse and validate
        const parsed = JSON.parse(content);
        // Validate the structure
        if (!parsed.productName ||
            !parsed.CFPRNum ||
            !parsed.LTONum ||
            !parsed.ManufacturedBy ||
            !parsed.ExpiryDate ||
            typeof parsed.productName !== 'string' ||
            typeof parsed.CFPRNum !== 'string' ||
            typeof parsed.LTONum !== 'string' ||
            typeof parsed.ManufacturedBy !== 'string' ||
            typeof parsed.ExpiryDate !== 'string') {
            throw new Error('Invalid response structure: missing or invalid productName');
        }
        console.log('Extracted product:', parsed);
        return parsed;
    });
}
//# sourceMappingURL=aiProcess.js.map