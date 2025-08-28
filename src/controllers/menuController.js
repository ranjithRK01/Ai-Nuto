const MenuItem = require('../models/MenuItem');

function normalizeTrimmedArray(input) {
  if (!input) return [];
  const arr = Array.isArray(input) ? input : String(input).split(',');
  return arr
    .map(s => String(s).trim())
    .filter(s => s.length > 0)
    .filter((v, i, a) => a.indexOf(v) === i);
}

function mapToServiceCategories(input) {
  const map = {
    breakfast: 'breakfast',
    morning: 'breakfast',
    lunch: 'lunch',
    afternoon: 'lunch',
    dinner: 'dinner',
    night: 'dinner',
    snacks: 'evening',
    beverages: 'evening',
    starters: 'lunch',
    gravy: 'lunch'
  };
  const allowed = new Set(['breakfast','lunch','dinner']);
  const raw = normalizeTrimmedArray(input);
  const mapped = raw.map(x => map[x.toLowerCase()] || x.toLowerCase());
  const result = mapped.filter(x => allowed.has(x));
  return result.length ? Array.from(new Set(result)) : ['lunch'];
}

function buildMenuItemPayload(body) {
  const names = {
    en: {
      full: (body?.names?.en?.full || body?.name || '').trim(),
      short: (body?.names?.en?.short || body?.shortName || '').trim() || undefined
    },
    ta: {
      full: (body?.names?.ta?.full || body?.tamilName || '').trim() || undefined,
      short: (body?.names?.ta?.short || body?.tamilShortName || '').trim() || undefined
    }
  };

  const payload = {
    shopId: (body.shopId || '').trim() || undefined,
    names,
    price: Number(body.price),
    unit: (body.unit || 'piece').trim(),
    categories: mapToServiceCategories(body.categories?.length ? body.categories : body.category),
    synonyms: {
      en: normalizeTrimmedArray(body.synonyms?.en || body.enSynonyms),
      ta: normalizeTrimmedArray(body.synonyms?.ta || body.taSynonyms)
    },
    tags: normalizeTrimmedArray(body.tags),
    isAvailable: body.isAvailable !== undefined ? Boolean(body.isAvailable) : true,
    description: body.description ? String(body.description).trim() : undefined
  };

  if (!payload.names.en.full) {
    throw new Error('English name (names.en.full) is required');
  }
  if (!Number.isFinite(payload.price)) {
    throw new Error('Valid price is required');
  }
  if (!payload.categories || payload.categories.length === 0) {
    payload.categories = ['lunch'];
  }
  return payload;
}

// Create one item
const createMenuItem = async (req, res) => {
  try {
    const payload = buildMenuItemPayload(req.body || {});
    const item = new MenuItem(payload);
    await item.save();
    res.status(201).json({ success: true, item });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Invalid menu item', message: error.message });
  }
};

// Bulk create
const bulkCreateMenuItems = async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : (req.body?.items || []);
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'No items provided' });
    }
    const payloads = items.map(buildMenuItemPayload);
    const result = await MenuItem.insertMany(payloads, { ordered: false });
    res.status(201).json({ success: true, created: result.length, items: result });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Bulk create failed', message: error.message });
  }
};

// List with filters
const listMenuItems = async (req, res) => {
  try {
    const { shopId, q, available, category } = req.query;
    const filter = {};
    if (shopId) filter.shopId = shopId;
    if (available === 'true') filter.isAvailable = true;
    if (available === 'false') filter.isAvailable = false;
    if (category) filter.categories = { $in: Array.isArray(category) ? category : [category] };

    let query = MenuItem.find(filter).select('-__v');
    if (q) {
      query = query.find({ $text: { $search: q } });
    }
    const items = await query.sort({ 'names.en.full': 1 }).lean();
    res.json({ success: true, count: items.length, items });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list menu items', message: error.message });
  }
};

// Get by id
const getMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, item });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Invalid id', message: error.message });
  }
};

// Update
const updateMenuItem = async (req, res) => {
  try {
    const payload = buildMenuItemPayload({ ...req.body, price: req.body.price ?? 0 });
    const item = await MenuItem.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!item) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, item });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Update failed', message: error.message });
  }
};

// Partial update: synonyms/categories/availability
const patchMenuItem = async (req, res) => {
  try {
    const update = {};
    if (req.body.names) update.names = req.body.names;
    if (req.body.categories) update.categories = normalizeTrimmedArray(req.body.categories);
    if (req.body.enSynonyms || (req.body.synonyms && req.body.synonyms.en)) {
      update['synonyms.en'] = normalizeTrimmedArray(req.body.enSynonyms || req.body.synonyms.en);
    }
    if (req.body.taSynonyms || (req.body.synonyms && req.body.synonyms.ta)) {
      update['synonyms.ta'] = normalizeTrimmedArray(req.body.taSynonyms || req.body.synonyms.ta);
    }
    if (req.body.tags) update.tags = normalizeTrimmedArray(req.body.tags);
    if (req.body.isAvailable !== undefined) update.isAvailable = Boolean(req.body.isAvailable);
    if (req.body.price !== undefined) update.price = Number(req.body.price);
    if (req.body.unit) update.unit = String(req.body.unit);

    const item = await MenuItem.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!item) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, item });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Patch failed', message: error.message });
  }
};

// Delete
const deleteMenuItem = async (req, res) => {
  try {
    const result = await MenuItem.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, deleted: true });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Delete failed', message: error.message });
  }
};

// Categories helper
const getCategories = async (req, res) => {
  try {
    const cats = await MenuItem.aggregate([
      { $unwind: '$categories' },
      { $group: { _id: '$categories', count: { $sum: 1 } } },
      { $project: { name: '$_id', count: 1, _id: 0 } },
      { $sort: { name: 1 } }
    ]);
    res.json({ success: true, categories: cats });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch categories', message: error.message });
  }
};

module.exports = {
  createMenuItem,
  bulkCreateMenuItems,
  listMenuItems,
  getMenuItem,
  updateMenuItem,
  patchMenuItem,
  deleteMenuItem,
  getCategories
};


