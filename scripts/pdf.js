//File system module to handle file read/writes
const fs=require("fs");
//path module to resolve paths 
const path=require("path");
//sharp library to convert image to grayscale for better ocr 
const sharp = require("sharp");
//spawn to use child process to run pdfpoppler 
const { spawn } = require('child_process');
//path of binaries of pdfpoppler in your operating system
const PDFTOPPM = process.env.PDFTOPPM_PATH || '/opt/homebrew/bin/pdftoppm';
//Importing pdf.js library for parsing our pdf and get its text 
const pdfJs = require("pdfjs-dist/legacy/build/pdf.js");
//importing google gen ai lib
const {GoogleGenAI}=require("@google/genai");
//env import
require("dotenv").config();
//import readline to get input for cli version
const readline=require("readline");
//import ocr utility from image.js for fallback case
const {extractTextFromImage}=require("./image.js")

// Disable worker (error in node)
pdfJs.GlobalWorkerOptions.workerSrc = null;


//path of the pdf file you are uploading 
const pathPDF=process.argv[2];

//check if the path is there or empty 
if(!pathPDF){
    console.error("Please provide pdf path");
    process.exit(1);
}

//Threshold for text extraction (characters per page)
const TEXT_THRESHOLD=50 

//instantiate the gemini model
const gemini=new GoogleGenAI({apiKey:process.env.GEMINI_KEY});

// helper to run pdftoppm for one page 
function runPdftoppmOnePage(pdfPath, pageNum, outPrefix, outDir, dpi = 300, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    //create directory if it doesnt exist 
    try {
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    } catch (e) {
      return reject(new Error(`Could not create output dir ${outDir}: ${e.message}`));
    }

    //resolving path joining prefix and output directory from params 
    const outPathPrefix = path.join(outDir, outPrefix); 
    //building arguments to run cli pdf poppler 
    const args = ['-png', '-r', String(dpi), '-f', String(pageNum), '-l', String(pageNum), pdfPath, outPathPrefix];

    //run the child process for pdf poppler using the args 
    const proc = spawn(PDFTOPPM, args, { env: process.env });

    //stderr and stdout for error logging 
    let stderr = '';
    let stdout = '';

    //safety timeout incase it doesnt run 
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error(`pdftoppm timed out after ${timeoutMs}ms; stderr: ${stderr}`));
    }, timeoutMs);

    //appending data from standard output and error streams to variable 
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    //error resolvation for process (in case it fails to start or some other error )
    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to spawn pdftoppm (${PDFTOPPM}): ${err.code || err.message}`));
    });

    //clearing timeout on finish and resolving the promise if it executs properly 
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`pdftoppm exited ${code}. stderr: ${stderr}`));
    });
  });
}

//pdf parser utility with ocr fallback(pdf of images case)
async function extractTextFromPDF(pdfPath) {
  //convert to uint8 array because pdf.js only works with binary formats
  const pdfData = new Uint8Array(fs.readFileSync(pdfPath));
  //loading the pdf 
  const loadingPDF = pdfJs.getDocument({ data: pdfData });
  //awaiting its promise 
  const pdfDocument = await loadingPDF.promise;

  let extractedText = '';

  //making a temp directory incase it doesnt exist 
  const tempDir = path.join(__dirname, "temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  //preparing params to call pdfpoppler function 
  const pagePrefix = "page";
  const format = "png";
  const dpi = 300;

  // small timeout helper (used for sharp and OCR)
  const runWithTimeout = (promise, ms, label) => {
    return Promise.race([
      promise,
      new Promise((_, rej) => setTimeout(() => rej(new Error(`${label} timed out after ${ms}ms`)), ms))
    ]);
  };

  //to combat diff patterns pdfpoppler might give while generating images
  //for eg -> page-1.png , page-01.png ,page-001.png ... and so on
  //having a  fallback to handle incase nothing works  
  function findOutputFile(prefix, pageNum, format, dir) {
    const files = fs.readdirSync(dir);
    const candidates = [
      `${prefix}-${pageNum}.${format}`,
      `${prefix}-${String(pageNum).padStart(2, '0')}.${format}`,
      `${prefix}-${String(pageNum).padStart(3, '0')}.${format}`,
      `${prefix}${pageNum}.${format}`,
      `${prefix}${String(pageNum).padStart(2,'0')}.${format}`
    ];
    for (const c of candidates) {
      if (files.includes(c)) return path.join(dir, c);
    }
    const fallback = files.find(f => f.startsWith(prefix + "-") && f.endsWith("." + format) && f.includes(String(pageNum)));
    if (fallback) return path.join(dir, fallback);
    const any = files.find(f => f.startsWith(prefix + "-") && f.endsWith("." + format));
    return any ? path.join(dir, any) : null;
  }

  //iterating for each page
  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str);
    const joinedLen = pageText.join("").length;

    //if length of parsed content less than threshold(it is an image)
    if (joinedLen < TEXT_THRESHOLD) {
      console.log(`Page ${pageNum} appears to be an image.. using OCR`);

      let outputPath = null;
      let grayPath = null;

      try {
        console.log(`> starting pdftoppm convert for page ${pageNum} (dpi ${dpi})`);
        // run pdftoppm for this page (120s timeout).
        const { stderr } = await runPdftoppmOnePage(pdfPath, pageNum, pagePrefix, tempDir, dpi, 120000);
        if (stderr && stderr.trim()) console.log(`pdftoppm stderr: ${stderr}`);

        // find the produced PNG
        outputPath = findOutputFile(pagePrefix, pageNum, format, tempDir);
        if (!outputPath) throw new Error("Converted image not found in temp dir");

        console.log(`> found output at ${outputPath} — converting to grayscale (sharp)`);
        grayPath = outputPath.replace(/\.png$/i, "_gray.png");

        // run sharp with timeout to convert to grayscale for better ocr 
        await runWithTimeout(
          sharp(outputPath).grayscale().toFile(grayPath),
          20000,
          `sharp grayscale page ${pageNum}`
        );
        console.log(`> grayscale saved to ${grayPath}`);

        // OCR with timeout 
        console.log(`> starting OCR on ${grayPath}`);
        const ocrText = await runWithTimeout(
          extractTextFromImage(grayPath),
          60000,
          `OCR page ${pageNum}`
        );
        console.log(`> OCR finished for page ${pageNum} (length ${String(ocrText || "").length})`);

        // append OCR result
        extractedText += `--- Page ${pageNum} (OCR) ---\n${ocrText}\n\n`;

      } catch (err) {
        console.error(`OCR failed for page ${pageNum}:`, err && err.message ? err.message : err);
        extractedText += `--- Page ${pageNum} ---\n${pageText.join(" ")}\n\n`;
      } finally {
        try { if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (e) {}
        try { if (grayPath && fs.existsSync(grayPath)) fs.unlinkSync(grayPath); } catch (e) {}
      }
    } else {
      extractedText += `--- Page ${pageNum} ---\n${pageText.join(" ")}\n\n`;
    }
  }

  return extractedText;
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

//wrtiting to html to avoid console rendering issues 
function saveOutputToHtml(text, filename = 'output.html') {
  const htmlOutput = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>PDF Result</title>
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
      <h1>PDF Text</h1>
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
        const text=await extractTextFromPDF(pathPDF);
        console.log("Extracted Text:\n",text);


        //getting input 
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
        console.error("Error extracting text from the PDF:",err);
    }
}

main();

