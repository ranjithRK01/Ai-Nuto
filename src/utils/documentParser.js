const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Parse PDF document
 * @param {Buffer} buffer - PDF file buffer
 * @returns {Promise<Object>} - Parsed document data
 */
const parsePDF = async (buffer) => {
  try {
    console.log('🔄 Parsing PDF document...');
    const result = await pdfParse(buffer);
    
    if (!result.text || result.text.trim().length === 0) {
      throw new Error('No text content found in PDF');
    }
    
    console.log('✅ PDF parsed successfully', result);
    return {
      text: result.text,
      pages: result.numpages,
      info: result.info,
      type: 'pdf'
    };
  } catch (error) {
    console.error('❌ PDF parsing failed:', error.message);
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
};

/**
 * Parse DOCX document
 * @param {Buffer} buffer - DOCX file buffer
 * @returns {Promise<Object>} - Parsed document data
 */
const parseDOCX = async (buffer) => {
  try {
    console.log('🔄 Parsing DOCX document...');
    const result = await mammoth.extractRawText({ buffer });
    
    if (!result.value || result.value.trim().length === 0) {
      throw new Error('No text content found in DOCX');
    }
    
    console.log('✅ DOCX parsed successfully');
    return {
      text: result.value,
      messages: result.messages,
      type: 'docx'
    };
  } catch (error) {
    console.error('❌ DOCX parsing failed:', error.message);
    throw new Error(`DOCX parsing failed: ${error.message}`);
  }
};

/**
 * Parse text file
 * @param {Buffer} buffer - Text file buffer
 * @returns {Promise<Object>} - Parsed document data
 */
const parseText = async (buffer) => {
  try {
    console.log('🔄 Parsing text document...');
    const text = buffer.toString('utf-8');
    
    if (!text || text.trim().length === 0) {
      throw new Error('No text content found in file');
    }
    
    console.log('✅ Text file parsed successfully');
    return {
      text: text,
      type: 'text'
    };
  } catch (error) {
    console.error('❌ Text parsing failed:', error.message);
    throw new Error(`Text parsing failed: ${error.message}`);
  }
};

/**
 * Parse document based on file type
 * @param {Buffer} buffer - File buffer
 * @param {string} mimeType - File MIME type
 * @param {string} filename - Original filename
 * @returns {Promise<Object>} - Parsed document data
 */
const parseDocument = async (buffer, mimeType, filename) => {
  const extension = filename.split('.').pop().toLowerCase();
  
  try {
    switch (mimeType) {
      case 'application/pdf':
        return await parsePDF(buffer);
      
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
        return await parseDOCX(buffer);
      
      case 'text/plain':
        return await parseText(buffer);
      
      default:
        // Try to parse based on file extension
        switch (extension) {
          case 'pdf':
            return await parsePDF(buffer);
          case 'docx':
          case 'doc':
            return await parseDOCX(buffer);
          case 'txt':
            return await parseText(buffer);
          default:
            throw new Error(`Unsupported file type: ${mimeType} (${extension})`);
        }
    }
  } catch (error) {
    throw new Error(`Document parsing failed: ${error.message}`);
  }
};

/**
 * Validate document file
 * @param {Buffer} buffer - File buffer
 * @param {string} mimeType - File MIME type
 * @param {string} filename - Original filename
 * @returns {boolean} - Whether file is valid
 */
const validateDocument = (buffer, mimeType, filename) => {
  // Check file size (10MB limit)
  if (buffer.length > 10 * 1024 * 1024) {
    throw new Error('File size exceeds 10MB limit');
  }
  
  // Check if file is empty
  if (buffer.length === 0) {
    throw new Error('File is empty');
  }
  
  // Check file signature for PDF
  if (mimeType === 'application/pdf') {
    const pdfSignature = buffer.slice(0, 4).toString('ascii');
    if (pdfSignature !== '%PDF') {
      throw new Error('Invalid PDF file signature');
    }
  }
  
  return true;
};

module.exports = {
  parseDocument,
  validateDocument,
  parsePDF,
  parseDOCX,
  parseText
}; 