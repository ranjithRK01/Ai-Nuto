const fs = require('fs');
const pdfParse = require('pdf-parse');

// Try different PDF.js import paths based on version
let pdfjsLib = null;
try {
  // Try the legacy build first (for older versions)
  pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
} catch (error) {
  try {
    // Try the main build (for newer versions)
    pdfjsLib = require('pdfjs-dist/build/pdf.js');
  } catch (error2) {
    try {
      // Try the ES5 build (for very old versions)
      pdfjsLib = require('pdfjs-dist/es5/build/pdf.js');
    } catch (error3) {
      console.warn(
        '⚠️  PDF.js not available for fallback parsing. Only pdf-parse will be used.'
      );
      pdfjsLib = null;
    }
  }
}

/**
 * Enhanced PDF parser with multiple fallback methods
 * @param {Buffer} dataBuffer - PDF file buffer
 * @returns {Promise<Object>} - Parsed PDF data
 */
const parsePDF = async (dataBuffer) => {
  let result = null;
  let error = null;

  // Method 1: Try pdf-parse first
  try {
    console.log('🔄 Attempting to parse PDF with pdf-parse...');
    result = await pdfParse(dataBuffer);
    if (result && result.text && result.text.trim().length > 0) {
      console.log('✅ PDF parsed successfully with pdf-parse');
      return result;
    }
  } catch (err) {
    console.log('❌ pdf-parse failed:', err.message);
    error = err;
  }

  // Method 2: Try PDF.js as fallback (if available)
  if (pdfjsLib) {
    try {
      console.log('🔄 Attempting to parse PDF with PDF.js...');
      const loadingTask = pdfjsLib.getDocument({ data: dataBuffer });
      const pdf = await loadingTask.promise;

      let fullText = '';
      const numPages = pdf.numPages;

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(' ');
        fullText += pageText + '\n';
      }

      if (fullText.trim().length > 0) {
        console.log('✅ PDF parsed successfully with PDF.js');
        return {
          text: fullText,
          numpages: numPages,
          info: {},
          metadata: {},
        };
      }
    } catch (err) {
      console.log('❌ PDF.js failed:', err.message);
      if (!error) error = err;
    }
  } else {
    console.log('⚠️  PDF.js not available, skipping fallback method');
  }

  // If all methods failed, throw the original error
  throw error || new Error('All PDF parsing methods failed');
};

/**
 * Validate PDF file before processing
 * @param {Buffer} dataBuffer - PDF file buffer
 * @returns {boolean} - Whether PDF is valid
 */
const validatePDF = (dataBuffer) => {
  // Check if file starts with PDF signature
  const pdfSignature = dataBuffer.slice(0, 4).toString('ascii');
  if (pdfSignature !== '%PDF') {
    throw new Error('File is not a valid PDF (missing PDF signature)');
  }

  // Check file size
  if (dataBuffer.length < 100) {
    throw new Error('PDF file is too small to be valid');
  }

  return true;
};

/**
 * Try to repair common PDF issues
 * @param {Buffer} dataBuffer - PDF file buffer
 * @returns {Buffer} - Potentially repaired PDF buffer
 */
const attemptPDFRepair = (dataBuffer) => {
  const data = dataBuffer.toString('binary');

  // Check for truncated XRef table (common issue)
  if (data.includes('xref') && !data.includes('trailer')) {
    console.log(
      '⚠️  Detected potential XRef table corruption, attempting repair...'
    );

    // Try to find the last complete object and add a basic trailer
    const lines = data.split('\n');
    let lastObjectIndex = -1;

    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].match(/^\d+ \d+ obj$/)) {
        lastObjectIndex = i;
        break;
      }
    }

    if (lastObjectIndex > 0) {
      // Add a basic trailer
      const repairedData = data + '\ntrailer\n<</Root 1 0 R>>\n%%EOF';
      return Buffer.from(repairedData, 'binary');
    }
  }

  return dataBuffer;
};

module.exports = {
  parsePDF,
  validatePDF,
  attemptPDFRepair,
};
