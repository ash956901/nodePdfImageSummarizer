# 📄 Node PDF & Image Summarizer

> **Note:** The express server was just for scaffolding, the main code lies in scripts folder.

##  How to Run:

### 1. Clone the repo:

```bash
git clone https://github.com/ash956901/nodePdfImageSummarizer.git
```
### 2. Install dependencies in your system:

#### For Mac OS:

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

#### For Linux:

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

### 3. Install project dependencies:

```bash
npm i 
```

### 4. Configure environment variables:
Create a `.env` file in the root directory with the following variables:

```bash
GEMINI_KEY=your_gemini_api_key
PDFTOPPM_PATH=your_pdf_poppler_binaries_path(which pdftoppm)
```

### 5. Create temporary directory:

```bash
mkdir -p scripts/temp
```

### 6. Set path to pdftoppm executable:

#### For Mac:

```bash
export PDFTOPPM_PATH="/opt/homebrew/bin/pdftoppm"  # For Apple Silicon Macs
# or
export PDFTOPPM_PATH="/usr/local/bin/pdftoppm"     # For Intel Macs
```

#### For Linux:

```bash
export PDFTOPPM_PATH="/usr/bin/pdftoppm"
```

##  Running the Scripts:

### Processing PDF documents:
```bash
node scripts/pdf.js path/to/your/document.pdf
```

### Processing images:
```bash
node scripts/image.js path/to/your/image.jpg
```

### Example queries to try:
- "Summarize this document"
- "Extract all the MCQs with answers"
- "List all key points from the text"

### Viewing results:
Check `output.html` in the root directory for results (especially for Hindi text) or view output in the console for English documents.


## 🔧 Troubleshooting:

### Common Issues

#### 📌 pdftoppm not found
- Ensure the `PDFTOPPM_PATH` is correctly set to the location of the pdftoppm executable
- Use `which pdftoppm` command to find the correct path

#### 📌 Memory issues with large PDFs
- For large documents, increase Node.js memory:
  ```bash
  NODE_OPTIONS=--max-old-space-size=4096 node scripts/pdf.js large_document.pdf
  ```

#### 📌 Hindi text rendering issues in console
- Check the HTML output file for proper rendering of Hindi text
- Make sure you have `hin.traineddata` in `tessdata` folder (both in scripts folder and in root)

#### 📌 OCR quality issues
For better OCR results with low-quality scans, try:
- Setting a higher DPI value in the runPdftoppmOnePage function
- Using preprocessing on images before OCR

### OS-Specific Issues

#### Windows
- If you get "spawn pdftoppm ENOENT" errors, ensure the path in `PDFTOPPM_PATH` uses double backslashes or forward slashes

#### macOS
- On Apple Silicon Macs, ensure you're using the correct path (`/opt/homebrew/bin/pdftoppm`)

#### Linux
- If you get permission errors, ensure the current user has access to the temp directory


## Acknowledgements
- [pdf.js](https://mozilla.github.io/pdf.js/) for PDF parsing
- [pdf-poppler](https://www.freedesktop.org/wiki/Software/poppler/) for converting PDF pages to images
- [Tesseract.js](https://tesseract.projectnaptha.com/) for OCR
- [Sharp](https://sharp.pixelplumbing.com/) for image processing
- [Google Gemini AI](https://ai.google.dev/) for text processing