const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate RAG response using Gemini as a Human-Friendly Nutrition Specialist
 * @param {string} question - User question
 * @param {Array} relevantChunks - Relevant text chunks
 * @param {string} planId - Plan identifier
 * @returns {Promise<Object>} - AI response with citations
 */
const generateRAGResponse = async (question, relevantChunks, planId) => {
  try {
    // Safety-critical keywords where we must refer to nutritionist
    const safetyKeywords = ["allergy", "diabetes", "pregnant", "blood pressure", "cholesterol", "kidney", "liver"];

    // Check if question contains a safety keyword
    if (safetyKeywords.some(k => question.toLowerCase().includes(k))) {
      return {
        answer: "This might need a personalized approach. Please ask your nutritionist to be safe.",
        citations: [],
        confidence: 0,
        chunksUsed: 0
      };
    }

    // If no exact chunks, try fuzzy matching with all available plan text
    let chunksToUse = [];
    if (relevantChunks && relevantChunks.length > 0) {
      chunksToUse = relevantChunks;
    } else {
      // fallback fuzzy match search
      const allPlanChunks = await getAllPlanChunks(planId); // you should implement this to load all meal plan text
      const matches = allPlanChunks.filter(chunk => {
        const score = stringSimilarity.compareTwoStrings(
          question.toLowerCase(),
          chunk.text.toLowerCase()
        );
        return score >= 0.5; // lower threshold for fuzzy match
      });
      chunksToUse = matches;
    }

    // If still no matches, provide a safe generic response
    if (chunksToUse.length === 0) {
      return {
        answer: "Your plan doesn’t mention this exactly, but generally a light snack like fruit or nuts is fine unless advised otherwise.",
        citations: [],
        confidence: 0.4,
        chunksUsed: 0
      };
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Build context from relevant chunks (max 5 to avoid overload)
    const context = chunksToUse
      .slice(0, 5)
      .map((chunk, index) => `[Chunk ${index + 1}]: ${chunk.text}`)
      .join("\n\n");

    const prompt = `
You are a friendly nutrition specialist answering questions based on a meal plan.

RULES:
1. Keep answers short (max 3 lines), clear, and in everyday language.
2. If the plan says yes, confirm confidently.
3. If the plan says no, explain why.
4. If not exact but similar, give the closest advice and mention it's not exact.
5. Only say "Ask your nutritionist" for safety/medical concerns.
6. Give simple, practical alternatives if possible.
7. Be encouraging.

NUTRITION PLAN:
${context}

USER QUESTION: ${question}

Give a short, friendly answer (max 3 lines) based only on the plan above.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const answer = response.text();

    const citations = extractCitations(answer, chunksToUse);
    const confidence = calculateConfidence(chunksToUse);

    return {
      answer,
      citations,
      confidence,
      chunksUsed: chunksToUse.length
    };

  } catch (error) {
    console.error("Error generating RAG response:", error);
    return {
      answer: "Sorry, I can't answer right now. Try again later or ask your nutritionist.",
      citations: [],
      confidence: 0,
      chunksUsed: 0
    };
  }
};

/**
 * Generate plan summary using Gemini
 * @param {Array} chunks - All plan chunks
 * @returns {Promise<Object>} - Plan summary
 */
const generatePlanSummary = async (chunks) => {
  try {
    if (!chunks || chunks.length === 0) {
      return {
        summary: "No meal plan found.",
        sections: []
      };
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Combine all chunks for summary
    const fullText = chunks.map(chunk => chunk.text).join('\n\n');

    const prompt = `Summarize this meal plan in simple terms:

1. What type of meals are included?
2. Main food groups mentioned

MEAL PLAN:
${fullText}

Format as:
SUMMARY: [2-3 simple sentences]
SECTIONS: [comma-separated list]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summaryText = response.text();

    // Parse the response
    const summaryMatch = summaryText.match(/SUMMARY:\s*(.+?)(?=\n|$)/i);
    const sectionsMatch = summaryText.match(/SECTIONS:\s*(.+?)(?=\n|$)/i);

    const summary = summaryMatch ? summaryMatch[1].trim() : "Meal plan with daily nutrition guidelines.";
    const sections = sectionsMatch 
      ? sectionsMatch[1].split(',').map(s => s.trim()).filter(s => s.length > 0)
      : ['Daily Meals'];

    return {
      summary: summary,
      sections: sections
    };

  } catch (error) {
    console.error('Error generating plan summary:', error);
    
    return {
      summary: "Meal plan with daily nutrition guidelines.",
      sections: ['Daily Meals']
    };
  }
};

/**
 * Extract citations from AI response
 * @param {string} answer - AI response text
 * @param {Array} chunks - Relevant chunks used
 * @returns {Array} - Array of citations
 */
const extractCitations = (answer, chunks) => {
  const citations = [];
  
  // Look for chunk references in the answer
  chunks.forEach((chunk, index) => {
    const chunkWords = chunk.text.split(' ').slice(0, 10).join(' ').toLowerCase();
    if (answer.toLowerCase().includes(chunkWords.substring(0, 50))) {
      citations.push({
        chunkIndex: index + 1,
        text: chunk.text.substring(0, 100) + '...',
        section: chunk.metadata?.sectionTitle || 'Meal Plan'
      });
    }
  });
  
  return citations.slice(0, 3); // Limit to top 3 citations
};

/**
 * Calculate confidence score based on chunk relevance
 * @param {Array} chunks - Relevant chunks
 * @returns {number} - Confidence score (0-1)
 */
const calculateConfidence = (chunks) => {
  if (!chunks || chunks.length === 0) {
    return 0;
  }
  
  // Calculate average similarity score
  const avgScore = chunks.reduce((sum, chunk) => sum + (chunk.score || 0), 0) / chunks.length;
  
  // Normalize to 0-1 range
  return Math.min(Math.max(avgScore, 0), 1);
};

module.exports = {
  generateRAGResponse,
  generatePlanSummary,
  extractCitations,
  calculateConfidence
}; 