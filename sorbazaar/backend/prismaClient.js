// MongoDB data-access layer for Sorbazaar.
// Provides Prisma-compatible method names (findMany/findFirst/create/update/delete/count...)
// implemented directly on the native mongodb driver. Keeps route code mostly unchanged.
// Relations are EMBEDDED (images/variants/faqs/items on the parent doc) rather than
// cross-collection, which is the idiomatic MongoDB pattern.

const { getDB, toId, toApiDoc, toApiDocs, ObjectId } = require('./config/db');

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function convertIdValue(key, v) {
  return key === '_id' ? toId(v) : v;
}

// Convert a Prisma-style `where` object to a Mongo filter.
function buildFilter(where = {}) {
  const out = {};
  for (const [k, v] of Object.entries(where || {})) {
    if (k === 'OR') { out.$or = (v || []).map(buildFilter); continue; }
    if (k === 'AND') { out.$and = (v || []).map(buildFilter); continue; }
    if (k === 'NOT') {
      const sub = buildFilter(v && typeof v === 'object' ? v : {});
      if (sub && Object.keys(sub).length) out.$nor = [sub];
      continue;
    }

    const targetKey = (k === 'id') ? '_id' : k;

    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      if ('contains' in v) { out[targetKey] = new RegExp(escapeRegExp(v.contains), 'i'); }
      else if ('equals' in v) { out[targetKey] = convertIdValue(targetKey, v.equals); }
      else if ('notIn' in v) { out[targetKey] = { $nin: (v.notIn || []).map(x => convertIdValue(targetKey, x)) }; }
      else if ('not' in v) { out[targetKey] = { $ne: convertIdValue(targetKey, v.not) }; }
      else if ('in' in v) { out[targetKey] = { $in: (v.in || []).map(x => convertIdValue(targetKey, x)) }; }
      else if ('has' in v) { out[targetKey] = v.has; }
      else if ('hasSome' in v) { out[targetKey] = { $in: v.hasSome }; }
      else if ('lte' in v || 'lt' in v || 'gte' in v || 'gt' in v) {
        const r = {};
        if ('lte' in v) r.$lte = v.lte;
        if ('lt' in v) r.$lt = v.lt;
        if ('gte' in v) r.$gte = v.gte;
        if ('gt' in v) r.$gt = v.gt;
        out[targetKey] = r;
      }
      else if ('some' in v) { out[targetKey] = { $elemMatch: buildFilter(v.some) }; }
      else if ('is' in v) { out[targetKey] = buildFilter(v.is); }
      else { out[targetKey] = buildFilter(v); }
    } else {
      out[targetKey] = convertIdValue(targetKey, v);
    }
  }
  return out;
}

function buildOrder(orderBy) {
  if (!orderBy) return {};
  const list = Array.isArray(orderBy) ? orderBy : [orderBy];
  const sort = {};
  for (const o of list) {
    for (const [k, dir] of Object.entries(o || {})) sort[k] = dir === 'desc' ? -1 : 1;
  }
  return sort;
}

// Unwrap Prisma relational `{ create: [...] }` / `{ create: {...} }` into a plain value
// so embedded arrays/objects are stored on the parent doc.
function normalizeRelation(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(normalizeRelation);
  if ('create' in value) return normalizeRelation(value.create);
  if ('set' in value) return normalizeRelation(value.set);
  const out = {};
  for (const [k, v] of Object.entries(value)) out[k] = normalizeRelation(v);
  return out;
}

function normalizeNested(data) {
  const out = {};
  for (const [k, v] of Object.entries(data || {})) out[k] = normalizeRelation(v);
  return out;
}

// Apply Prisma `select` (flat booleans + nested object selects) to a doc.
function applySelectValue(val, sel) {
  if (sel === true) return val;
  if (Array.isArray(val)) {
    if (sel && typeof sel === 'object') {
      const base = ('select' in sel && sel.select) ? sel.select : sel;
      let arr = val;
      if ('take' in sel) arr = arr.slice(0, Number(sel.take));
      return arr.map(v => applySelectValue(v, base));
    }
    return val;
  }
  if (val && typeof val === 'object' && sel && typeof sel === 'object') {
    const base = ('select' in sel && sel.select) ? sel.select : sel;
    const out = {};
    for (const key of Object.keys(base || {})) {
      if (key === 'take' || key === 'orderBy' || key === 'where') continue;
      const sub = base[key];
      if (sub === true && key in val) out[key] = val[key];
      else if (val[key] !== undefined && sub && typeof sub === 'object') {
        out[key] = applySelectValue(val[key], sub);
      }
    }
    return out;
  }
  return val;
}

function applySelect(doc, select) {
  if (!doc || !select) return doc;
  return applySelectValue(doc, select);
}

function applySelectMany(docs, select) { return docs.map((d) => applySelect(d, select)); }

class MongoModel {
  constructor(name) { this.name = name; }
  get col() { return getDB().collection(this.name); }

  async findMany({ where, orderBy, skip, take, select } = {}) {
    let cursor = this.col.find(buildFilter(where));
    const sort = buildOrder(orderBy);
    if (Object.keys(sort).length) cursor = cursor.sort(sort);
    if (skip) cursor = cursor.skip(parseInt(skip));
    if (take || take === 0) cursor = cursor.limit(parseInt(take));
    const docs = await cursor.toArray();
    let result = docs.map((d) => toApiDoc(d));
    if (select) result = applySelectMany(result, select);
    return result;
  }

  async findFirst({ where, orderBy, take, select } = {}) {
    let cursor = this.col.find(where ? buildFilter(where) : {});
    const sort = buildOrder(orderBy);
    if (Object.keys(sort).length) cursor = cursor.sort(sort);
    if (take || take === 0) cursor = cursor.limit(parseInt(take));
    const doc = await cursor.next();
    if (!doc) return null;
    let result = toApiDoc(doc);
    if (select) result = applySelect(result, select);
    return result;
  }

  async findUnique({ where, select } = {}) {
    return this.findFirst({ where, select });
  }

  async count({ where } = {}) {
    return this.col.countDocuments(where ? buildFilter(where) : {});
  }

  async create({ data } = {}) {
    const insertData = { ...normalizeNested(data || {}) };
    if (!insertData.createdAt) insertData.createdAt = new Date();
    if (this.name === 'products' && !insertData.updatedAt) insertData.updatedAt = new Date();
    const res = await this.col.insertOne(insertData);
    return toApiDoc({ ...insertData, _id: res.insertedId });
  }

  async update({ where, data, select } = {}) {
    const id = toId(where && where.id);
    const set = normalizeNested(data || {});
    delete set.id;
    if (this.name === 'products' && !set.updatedAt) set.updatedAt = new Date();
    const res = await this.col.findOneAndUpdate(
      { _id: id },
      { $set: set },
      { returnDocument: 'after' }
    );
    if (!res || !res.value) throw new Error('Record not found to update');
    let result = toApiDoc(res.value);
    if (select) result = applySelect(result, select);
    return result;
  }

  async delete({ where } = {}) {
    const id = toId(where && where.id);
    const res = await this.col.findOneAndDelete({ _id: id });
    if (!res || !res.value) throw new Error('Record not found');
    return toApiDoc(res.value);
  }

  async deleteMany({ where } = {}) {
    const res = await this.col.deleteMany(where ? buildFilter(where) : {});
    return { count: res.deletedCount };
  }

  async updateMany({ where, data } = {}) {
    const set = normalizeNested(data || {});
    delete set.id;
    const res = await this.col.updateMany(where ? buildFilter(where) : {}, { $set: set });
    return { count: res.modifiedCount, matchedCount: res.matchedCount };
  }

  async createMany({ data } = {}) {
    const rows = Array.isArray(data) ? data : [data];
    const docs = rows.map((r) => normalizeNested(r || {}));
    const withTime = docs.map((r) => ({ ...r, createdAt: r.createdAt || new Date() }));
    const res = await this.col.insertMany(withTime);
    return { count: res.insertedCount };
  }

  get raw() { return this.col; }
}

// Proxy: prisma.user, prisma.product, prisma.orderItem, ... map to Mongo collections
const prisma = new Proxy({}, {
  get(_, model) {
    return new MongoModel(model);
  }
});

module.exports = prisma;