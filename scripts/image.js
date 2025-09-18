//File system module to handle file read/writes
const fs=require("fs");
//importing tesseract.js lib for ocr
const {createWorker} = require('tesseract.js');
// Importing Google Generative AI
const { GoogleGenerativeAI } = require("@google/generative-ai");
// env injection
require("dotenv").config();
//import readline to get input for cli version
const readline=require("readline");
//path of the image file you are uploading 
const pathImage=process.argv[2];
//check if the path is there or empty 
if(!pathImage){
    console.error("Please provide image path");
    process.exit(1);
}

// Instantiate the Gemini model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);

//image ocr utility  
async function extractTextFromImage(pathImage){
    //create woker instance 
    const worker=await createWorker()

    //loading the worker into the memory
    await worker.load();

    //loading the languages english+hindi(one custom langauge to test its traineddata file feature)
    await worker.loadLanguage('eng+hin');
    //activating the worker
    await worker.initialize('eng+hin');

    //setting options to bettor recognize other lang 
    await worker.setParameters({
        tessedit_char_whitelist: '', 
        preserve_interword_spaces: '1',
        tessjs_create_pdf: '0'
    });

    //destructing the ocr extracted text
    const {data:{text}}=await worker.recognize(pathImage);

    //terminating the worker and freeing the memory to prevent memory leaks
    await worker.terminate();

    //return the text 
    return text;

}

// Helper function to clean JSON response
function cleanJsonResponse(text) {
    return text
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
}

//formatter/summarizer - utility 
async function formatText(rawText, userPrompt, startNumber = 1) {
    try {
        const prompt = `Extract questions and answers from the following text in the format specified below. 
        If the text is in Hindi, translate it to English before processing.
        
        Text: """${rawText}"""
        
        Format the output as a JSON array of objects with the following structure:
        [
            {
                "question": "The question text",
                "options": ["Option 1", "Option 2", ...],
                "answer": "The correct answer",
                "explanation": "Explanation for the answer"
            },
            ...
        ]
        
        ${userPrompt ? `Additional instructions: ${userPrompt}` : ''}
        `;

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(prompt);
        const rawResponse = result.response.text() || "{}";
        
        // Clean the response before parsing
        const cleanedResponse = cleanJsonResponse(rawResponse);
        
        // Try to parse the JSON response
        try {
            const result = JSON.parse(cleanedResponse);
            return {
                success: true,
                results: Array.isArray(result) ? result : [result],
                startNumber: startNumber
            };
        } catch (e) {
            console.error("Error parsing JSON response:", e);
            console.log("Cleaned response:", cleanedResponse);
            return {
                success: false,
                error: "Failed to parse JSON response",
                rawText: cleanedResponse
            };
        }
    } catch (error) {
        console.error("Error in formatText:", error);
        return {
            success: false,
            error: error.message,
            rawText: rawText
        };
    }
}

//Write to html --> for console limitations of rendering other languages 
function saveOutputToHtml(text, filename = 'output.html') {
  const htmlOutput = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>OCR Result</title>
    <style>
      body {
        font-family: 'Noto Sans', 'Arial Unicode MS', Arial, sans-serif;
        margin: 20px;
        line-height: 1.6;
      }
      .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        border: 1px solid #ddd;
        border-radius: 5px;
      }
      h1 {
        color: #333;
      }
      .extracted-text {
        white-space: pre-wrap;
        background-color: #f5f5f5;
        padding: 15px;
        border-radius: 4px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Extracted Text</h1>
      <div class="extracted-text">${text}</div>
    </div>
  </body>
</html>
`;

  fs.writeFileSync(filename, htmlOutput);
  console.log(`Output saved to ${filename}`);
}

// Save output as JSON file
function saveOutputToJson(obj, filename = 'output.json') {
  fs.writeFileSync(filename, JSON.stringify(obj, null, 2), "utf-8");
  console.log(`✅ JSON output saved to ${filename}`);
}

//main function
async function main(){
    try{
        //extracting the text from pdf
        const text=await extractTextFromImage(pathImage);
        console.log("Extracted Text:\n",text);


        //getting input using readline 
        const rl=readline.createInterface({
            input:process.stdin,
            output:process.stdout,
        });

        //taking input of user query 
        rl.question("Enter your query:\n", async (userPrompt) => {
            const out = await formatText(text, userPrompt);
            saveOutputToJson(out, 'output.json');
            console.log("\nFinal JSON:\n", JSON.stringify(out, null, 2));
            rl.close();
        })


     
    }
    catch(err){
        console.error("Error extracting text from the Image:",err);
    }
}

//exporting to use the image utility in pdf.js/backend server(later)
module.exports={
    extractTextFromImage
}
//to only run this when running the file directly 
if(require.main===module){
    main();
}


