// api/cases.js — Vercel Serverless Function
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE_ID = process.env.AIRTABLE_TABLE_ID;
const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;

const headers = {
  'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
  'Content-Type': 'application/json',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // GET — 列出案例
    if (req.method === 'GET') {
      const publishedOnly = req.query.published === 'true';
      let url = `${BASE_URL}?sort[0][field]=createdTime&sort[0][direction]=desc`;
      if (publishedOnly) url += `&filterByFormula={status}="published"`;

      const r = await fetch(url, { headers });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json(data);

      const cases = (data.records || []).map(rec => ({
        id: rec.id,
        title: rec.fields.title || '',
        category: rec.fields.category || '',
        desc: rec.fields.desc || '',
        hospital: rec.fields.hospital || '',
        doctor: rec.fields.doctor || '',
        recovery_days: rec.fields.recovery_days || '',
        price_range: rec.fields.price_range || '',
        images: rec.fields.images ? JSON.parse(rec.fields.images) : [],
        status: rec.fields.status || 'draft',
        createdTime: rec.createdTime,
      }));

      return res.status(200).json({ cases });
    }

    // POST — 新增案例
    if (req.method === 'POST') {
      const { title, category, desc, hospital, doctor, recovery_days, price_range, images } = req.body;
      const r = await fetch(BASE_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          records: [{
            fields: {
              title, category, desc,
              hospital: hospital || '',
              doctor: doctor || '',
              recovery_days: recovery_days || '',
              price_range: price_range || '',
              images: JSON.stringify(images || []),
              status: 'draft',
            }
          }]
        })
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json(data);
      return res.status(201).json({ id: data.records[0].id });
    }

    // PATCH — 更新案例（status / 欄位）
    if (req.method === 'PATCH') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'Missing id' });

      const fields = {};
      const allowed = ['title','category','desc','hospital','doctor','recovery_days','price_range','status'];
      for (const k of allowed) {
        if (req.body[k] !== undefined) fields[k] = req.body[k];
      }
      if (req.body.images !== undefined) fields.images = JSON.stringify(req.body.images);

      const r = await fetch(`${BASE_URL}/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields })
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json(data);
      return res.status(200).json({ ok: true });
    }

    // DELETE — 刪除案例
    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'Missing id' });

      const r = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE', headers });
      if (!r.ok) { const d = await r.json(); return res.status(r.status).json(d); }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
