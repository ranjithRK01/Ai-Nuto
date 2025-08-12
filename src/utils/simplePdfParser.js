const pdfParse = require('pdf-parse');

/**
 * Simple but robust PDF parser using only pdf-parse
 * @param {Buffer} dataBuffer - PDF file buffer
 * @returns {Promise<Object>} - Parsed PDF data
 */
const parsePDF = async (dataBuffer) => {
  try {
    console.log('🔄 Parsing PDF with pdf-parse...');
    const result = await pdfParse(dataBuffer);
    
    if (result && result.text && result.text.trim().length > 0) {
      console.log('✅ PDF parsed successfully');
      return result;
    } else {
      throw new Error('No text content found in PDF');
    }
  } catch (err) {
    console.error('❌ PDF parsing failed:', err.message);
    throw err;
  }
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

module.exports = {
  parsePDF,
  validatePDF
}; 