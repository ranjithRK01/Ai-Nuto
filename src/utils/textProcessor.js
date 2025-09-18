const crypto = require('crypto');

/**
 * Clean and normalize text
 * @param {string} text - Raw text
 * @returns {string} - Cleaned text
 */
const cleanText = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
    .trim();
};

/**
 * Split text into chunks with overlap
 * @param {string} text - Text to chunk
 * @param {number} chunkSize - Size of each chunk
 * @param {number} overlap - Overlap between chunks
 * @returns {Array} - Array of text chunks
 */
const chunkText = (text, chunkSize = 800, overlap = 150) => {
  if (!text || text.length <= chunkSize) {
    return text ? [text] : [];
  }

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunk = text.slice(start, end);

    // Try to break at sentence boundaries
    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('.');
      const lastNewline = chunk.lastIndexOf('\n');
      const breakPoint = Math.max(lastPeriod, lastNewline);

      if (breakPoint > start + chunkSize * 0.7) {
        chunk = chunk.slice(0, breakPoint + 1);
        start = start + breakPoint + 1;
      } else {
        start = end - overlap;
      }
    } else {
      start = end;
    }

    if (chunk.trim().length > 50) {
      // Only add chunks with meaningful content
      chunks.push(chunk.trim());
    }
  }

  return chunks;
};

/**
 * Extract nutrition-related sections from text
 * @param {string} text - Full text
 * @returns {Array} - Array of nutrition sections
 */
const extractNutritionSections = (text) => {
  const sections = [];
  const lines = text.split('\n');
  let currentSection = '';
  let inNutritionSection = false;

  const nutritionKeywords = [
    'breakfast',
    'lunch',
    'dinner',
    'snack',
    'meal',
    'food',
    'nutrition',
    'diet',
    'eating',
    'calories',
    'protein',
    'carbs',
    'fat',
    'vitamins',
    'minerals',
    'supplements',
    'water',
    'drink',
    'beverage',
    'restrictions',
    'avoid',
    'limit',
    'recommended',
    'serving',
    'portion',
    'grams',
    'oz',
    'cup',
    'tablespoon',
    'teaspoon',
    'piece',
    'slice',
    'whole',
    'half',
  ];

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    const hasNutritionContent = nutritionKeywords.some((keyword) =>
      lowerLine.includes(keyword)
    );

    if (
      hasNutritionContent ||
      line.match(/^(day|week|meal|breakfast|lunch|dinner|snack)/i)
    ) {
      inNutritionSection = true;
      currentSection += line + '\n';
    } else if (inNutritionSection && line.trim().length > 0) {
      currentSection += line + '\n';
    } else if (inNutritionSection && line.trim().length === 0) {
      if (currentSection.trim().length > 0) {
        sections.push(currentSection.trim());
        currentSection = '';
      }
      inNutritionSection = false;
    }
  }

  // Add the last section if it exists
  if (currentSection.trim().length > 0) {
    sections.push(currentSection.trim());
  }

  return sections;
};

/**
 * Generate unique plan ID
 * @returns {string} - Unique plan ID
 */
const generatePlanId = () => {
  return `plan_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
};

/**
 * Process nutrition plan text into chunks
 * @param {string} text - Raw nutrition plan text
 * @returns {Array} - Array of processed chunks
 */
const processNutritionPlan = (text) => {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Clean the text first
  const cleanedText = cleanText(text);

  if (cleanedText.length === 0) {
    return [];
  }

  // Extract nutrition sections
  const nutritionSections = extractNutritionSections(cleanedText);

  // If no nutrition sections found, chunk the entire text
  if (nutritionSections.length === 0) {
    return chunkText(cleanedText).map((chunk, index) => ({
      text: chunk,
      metadata: {
        sectionTitle: 'General Nutrition Plan',
        sectionIndex: 0,
        chunkIndex: index,
        type: 'nutrition_chunk',
      },
    }));
  }

  // Process each nutrition section
  const chunks = [];
  nutritionSections.forEach((section, sectionIndex) => {
    const sectionChunks = chunkText(section);

    sectionChunks.forEach((chunk, chunkIndex) => {
      // Extract section title from first line
      const lines = section.split('\n');
      const sectionTitle = lines[0]?.trim() || `Section ${sectionIndex + 1}`;

      chunks.push({
        text: chunk,
        metadata: {
          sectionTitle: sectionTitle,
          sectionIndex: sectionIndex,
          chunkIndex: chunkIndex,
          type: 'nutrition_chunk',
        },
      });
    });
  });

  return chunks;
};

/**
 * Extract nutrition information from text
 * @param {string} text - Nutrition plan text
 * @returns {Object} - Extracted nutrition information
 */
const extractNutritionInfo = (text) => {
  const lowerText = text.toLowerCase();

  // Extract meals
  const meals = [];
  const mealPatterns = [
    /breakfast[:\s-]+([^.\n]+)/gi,
    /lunch[:\s-]+([^.\n]+)/gi,
    /dinner[:\s-]+([^.\n]+)/gi,
    /snack[:\s-]+([^.\n]+)/gi,
  ];

  mealPatterns.forEach((pattern) => {
    const matches = [...lowerText.matchAll(pattern)];
    matches.forEach((match) => {
      if (match[1] && match[1].trim().length > 0) {
        meals.push(match[1].trim());
      }
    });
  });

  // Extract foods
  const foods = [];
  const foodKeywords = [
    'almonds',
    'walnuts',
    'brazil nuts',
    'pumpkin seeds',
    'broccoli',
    'beans',
    'rice',
    'millet',
    'eggs',
    'paneer',
    'sauerkraut',
    'berries',
    'avocado',
    'chicken',
    'salmon',
    'quinoa',
    'vegetables',
    'fruits',
    'nuts',
    'seeds',
    'grains',
    'protein',
    'vegetables',
    'fruits',
  ];

  foodKeywords.forEach((food) => {
    if (lowerText.includes(food)) {
      foods.push(food);
    }
  });

  // Extract restrictions
  const restrictions = [];
  const restrictionPatterns = [
    /avoid[:\s]+([^.\n]+)/gi,
    /limit[:\s]+([^.\n]+)/gi,
    /no[:\s]+([^.\n]+)/gi,
    /restrict[:\s]+([^.\n]+)/gi,
  ];

  restrictionPatterns.forEach((pattern) => {
    const matches = [...lowerText.matchAll(pattern)];
    matches.forEach((match) => {
      if (match[1] && match[1].trim().length > 0) {
        restrictions.push(match[1].trim());
      }
    });
  });

  // Extract timing information
  const timing = [];
  const timingPatterns = [
    /(\d{1,2}:\d{2}\s*(?:am|pm))/gi,
    /(morning|afternoon|evening|night)/gi,
    /(before|after)\s+(breakfast|lunch|dinner)/gi,
  ];

  timingPatterns.forEach((pattern) => {
    const matches = [...lowerText.matchAll(pattern)];
    matches.forEach((match) => {
      if (match[1] && match[1].trim().length > 0) {
        timing.push(match[1].trim());
      }
    });
  });

  return {
    meals: [...new Set(meals)],
    foods: [...new Set(foods)],
    restrictions: [...new Set(restrictions)],
    timing: [...new Set(timing)],
  };
};

module.exports = {
  cleanText,
  chunkText,
  extractNutritionSections,
  generatePlanId,
  processNutritionPlan,
  extractNutritionInfo,
};
