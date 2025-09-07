//File system module to handle file read/writes
const fs=require("fs");
//importing tesseract.js lib for ocr
const {createWorker} = require('tesseract.js');
//importing google gen ai lib
const {GoogleGenAI}=require("@google/genai");
//env injection
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

//instantiate the gemini model
const gemini=new GoogleGenAI({apiKey:process.env.GEMINI_KEY});

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

//formatter/summarizer - utility 
async function formatText(rawText,userPrompt){
    const prompt=`You are an AI text cleaner and formatter.

Rules:
- Input will contain noisy PDF text with watermarks, headers, and irrelevant content. Remove all of that.
- Follow the user’s query strictly (e.g., if they ask for MCQs, give only MCQs; if they ask for summary, give only clean summary).
- Always return clean, human-readable text.
- Do not output JSON or code blocks.
- Format nicely with clear labels (e.g., "Question 1:", "Option A:", "Answer:", etc. when MCQs are requested).
- Do not add extra explanations beyond what was requested.

User Query:
${userPrompt}

Extracted Text:
${rawText}

`

    const response=await gemini.models.generateContent({
        model:"gemini-2.5-flash",
        contents:prompt,
    });

return response.text || "" ;
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
        rl.question("Enter your query:\n",async(userPrompt)=>{
            const output=await formatText(text,userPrompt);
            saveOutputToHtml(output);
            console.log("\nThe output:\n",output);
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


