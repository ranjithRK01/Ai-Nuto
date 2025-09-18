# PDF Upload Troubleshooting Guide

## 🚨 Common PDF Issues & Solutions

### **1. "bad XRef entry" Error**

**What it means:** The PDF's cross-reference table is corrupted or malformed.

**Solutions:**

- **Try the enhanced parser** (now implemented with fallback methods)
- **Re-save the PDF** in a PDF viewer (Adobe Reader, Chrome, etc.)
- **Convert to different format** and back to PDF
- **Use online PDF repair tools**

### **2. "No text content found" Error**

**What it means:** PDF contains only images, no selectable text.

**Solutions:**

- Ensure PDF has selectable text (try copying text from PDF)
- Use OCR software to extract text
- Convert image-based PDFs to text-based PDFs

### **3. "File is not a valid PDF" Error**

**What it means:** File doesn't have proper PDF signature.

**Solutions:**

- Verify file is actually a PDF (not renamed)
- Check file extension is `.pdf`
- Try downloading the file again

## 🔧 **Enhanced PDF Parser Features**

The backend now includes:

### **Multiple Parsing Methods:**

1. **pdf-parse** (primary method)
2. **PDF.js** (fallback method)
3. **PDF repair attempts** for common issues

### **Validation & Repair:**

- PDF signature validation
- XRef table repair attempts
- File size validation
- Better error messages with suggestions

## 📋 **Testing Your PDF**

### **Step 1: Create a Test PDF**

```bash
node create-test-pdf.js
```

### **Step 2: Convert to PDF**

- Open `test-nutrition-plan.txt` in Word/Google Docs
- Save as PDF
- Or use online converters:
  - https://www.ilovepdf.com/txt_to_pdf
  - https://smallpdf.com/txt-to-pdf

### **Step 3: Test Upload**

```bash
curl -X POST \
  http://localhost:5000/api/upload \
  -F "pdf=@test-nutrition-plan.pdf"
```

## 🛠️ **Manual PDF Repair**

### **For XRef Table Issues:**

Based on [Qoppa's solution](https://kbdeveloper.qoppa.com/how-to-fix-issue-with-invalid-xref-table-entry-in-tex-document-for-pdfs-generated-with-jpdfwriter/), you can manually repair PDFs:

1. **Open PDF in a hex editor** (like HexWorkshop, Notepad++)
2. **Find the "trailer" keyword**
3. **Remove 2 bytes before "trailer"** if they exist
4. **Save the file**

### **For Truncated PDFs:**

According to [PDF-XChange forum](https://forum.pdf-xchange.com/viewtopic.php?t=6413):

1. **Locate the last complete object**
2. **Add a basic trailer dictionary**
3. **Add "%%EOF" marker**

## 📊 **Vector Database Access**

### **View Stored Data:**

```bash
# View all chunks (text only)
curl http://localhost:5000/api/chunks

# View with embeddings (using script)
node view-vectors.js

# Direct MongoDB access
mongosh mongodb://localhost:27017/nutrition-ai
db.chunks.find({})
```

### **Data Structure:**

```javascript
{
  chunkId: "chunk_1234567890_abc123",
  text: "Your nutrition plan text...",
  embedding: [0.123, -0.456, 0.789, ...], // 1536 dimensions
  createdAt: "2024-01-15T10:30:00.000Z"
}
```

## 🎯 **Best Practices**

### **For PDF Creation:**

- Use text-based PDFs (not image-based)
- Avoid password protection
- Keep file size under 10MB
- Use standard PDF viewers to create PDFs

### **For Testing:**

- Start with simple text-based PDFs
- Test with the provided sample nutrition plan
- Verify text is selectable in the PDF
- Check file integrity before uploading

## 🔍 **Debugging Steps**

### **1. Check PDF Properties:**

- File size
- Number of pages
- Text selectability
- Creation method

### **2. Test with Different Tools:**

- Adobe Reader
- Chrome PDF viewer
- Online PDF validators

### **3. Monitor Server Logs:**

```bash
npm run dev
# Watch console output for detailed error messages
```

### **4. Use Enhanced Error Messages:**

The new parser provides:

- Detailed error descriptions
- Technical error codes
- Specific suggestions
- Multiple parsing attempts

## 📞 **Still Having Issues?**

If you continue to have problems:

1. **Try the test PDF** first: `node create-test-pdf.js`
2. **Check server logs** for detailed error messages
3. **Verify MongoDB connection** is working
4. **Test with a simple text file** converted to PDF
5. **Use online PDF repair tools** before uploading

---

**Remember:** The enhanced parser now handles most common PDF issues automatically! 🚀
