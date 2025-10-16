import OpenAI from 'openai';

interface ProductJSON {
    productName: string;
}

const openai = new OpenAI({
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    apiKey: "AIzaSyDGKnaSVefE6R4tqNOJ1ia6zcxUDKMjq04"
});

export async function ProcessText(blockofText: string): Promise<ProductJSON> {
    const completion = await openai.chat.completions.create({
        model: "gemini-2.0-flash",
        messages: [
            {
                role: "system",
                content: `Extract product information from OCR text.
                Return ONLY valid JSON in this exact format:
                {
                    "productName": "extracted product name here"
                }
                
                Complete incomplete letters and fix typos.
                Handle messy formatting.
                If you cannot determine the product name, use "Unknown Product".`
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
    if (!parsed.productName || typeof parsed.productName !== 'string') {
        throw new Error('Invalid response structure: missing or invalid productName');
    }

    console.log('Extracted product:', parsed);
    return parsed;
}
