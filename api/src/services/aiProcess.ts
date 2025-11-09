import OpenAI from 'openai';
import * as dotenv from 'dotenv';
dotenv.config();

interface ProductJSON {
    productName: string;
    LTONum: string;
    CFPRNum: string;
    ManufacturedBy: string;
    ExpiryDate: string;
}

const openai = new OpenAI({
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    apiKey: process.env.AI_API_KEY || ''
});

export async function ProcessText(blockofText: string): Promise<ProductJSON> {
    const completion = await openai.chat.completions.create({
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
    })

    const content = completion.choices[0].message.content;
    if (!content) {
        throw new Error('No response from AI');
    }

    // Parse and validate
    const parsed = JSON.parse(content) as ProductJSON;

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
}
