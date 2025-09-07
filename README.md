# nodePdfImageSummarizer

Note:The express server was just for scafoldding, the main code lies in scripts folder

## How to Run :

- Clone the repo:

```bash
git clone https://github.com/ash956901/nodePdfImageSummarizer.git
```
- Install dependencies in your system:

### Mac OS:

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Install Poppler (provides pdftoppm)
brew install poppler

# Install project dependencies
npm install pdfjs-dist@legacy tesseract.js sharp @google/genai dotenv

# Set path for pdftoppm (add to ~/.zshrc or ~/.bash_profile)
echo 'export PDFTOPPM_PATH="/opt/homebrew/bin/pdftoppm"' >> ~/.zshrc
# Or for Intel Macs:
# echo 'export PDFTOPPM_PATH="/usr/local/bin/pdftoppm"' >> ~/.zshrc

# Reload shell config
source ~/.zshrc
```

### Linux 

```bash
# Update package lists
sudo apt update

# Install Node.js and npm
sudo apt install -y nodejs npm

# Install Poppler utils (provides pdftoppm)
sudo apt install -y poppler-utils

# Install Sharp dependencies
sudo apt install -y libvips-dev

# Install project dependencies
npm install pdfjs-dist@legacy tesseract.js sharp @google/genai dotenv

# Set path for pdftoppm (add to ~/.bashrc)
echo 'export PDFTOPPM_PATH="/usr/bin/pdftoppm"' >> ~/.bashrc

# Reload shell config
source ~/.bashrc
```

- execute the following command in the root:

```bash
npm i 
```

- create a .env file with the follwing variables set in the root dir:

```bash
GEMINI_KEY=your_gemini_api_key
PDFTOPPM_PATH=your_pdf_poppler_binaries_path(which pdftoppm)
```

- make a directory called scripts/temp :

```bash
mkdir -p scripts/temp
```

- set the path to pdftoppm executable :

### Mac

```bash
export PDFTOPPM_PATH="/opt/homebrew/bin/pdftoppm"  # For Apple Silicon Macs
# or
export PDFTOPPM_PATH="/usr/local/bin/pdftoppm"     # For Intel Macs
```

### Linux

```bash
export PDFTOPPM_PATH="/usr/bin/pdftoppm"
```

- run the scripts 

### PDF one 
```bash
node scripts/pdf.js path/to/your/document.pdf
```

### Image one

```bash
node scripts/image.js path/to/your/image.jpg
```


- Example queries to run:

"Summarize this document"
"Extract all the MCQs with answers"
"List all key points from the text"


- check the output.html in the root dir for result (or console for english based documents )


## TroubleShooting:

### Common Issues
- pdftoppm not found: Ensure the PDFTOPPM_PATH is correctly set to the location of the pdftoppm executable

- Memory issues with large PDFs: For large documents, increase Node.js memory:

```bash
NODE_OPTIONS=--max-old-space-size=4096 node scripts/pdf.js large_document.pdf
```

- Hindi text rendering issues in console: Check the HTML output file for proper rendering of Hindi text
(make sure you have hin.traineddata in tessdata in scripts folder and in root)

- OCR quality issues: For better OCR results with low-quality scans, try:

Setting a higher DPI value in the runPdftoppmOnePage function,
Using preprocessing on images before OCR

- Specific OS Issues
#### Windows
If you get "spawn pdftoppm ENOENT" errors, ensure the path in PDFTOPPM_PATH uses double backslashes or forward slashes
#### macOS
On Apple Silicon Macs, ensure you're using the correct path (pdftoppm)
#### Linux
If you get permission errors, ensure the current user has access to the temp directory
License
MIT

## Acknowledgements
- pdf.js for PDF parsing
- pdf poppler for converting pdf pages to images
- Tesseract.js for OCR
- Sharp for image processing
- Google Gemini AI for text processing