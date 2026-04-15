// api/faq.js
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE = 'FAQ';
const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}/${TABLE}`;
const headers = { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const r = await fetch(`${BASE_URL}?sort[0][field]=order&sort[0][direction]=asc`, { headers });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json(data);
      const faq = (data.records || []).map(rec => ({ q: rec.fields.q || '', a: rec.fields.a || '' }));
      return res.status(200).json({ faq });
    }

    if (req.method === 'PUT') {
      const { faq } = req.body;
      // Delete all existing then re-insert
      const listR = await fetch(BASE_URL, { headers });
      const listData = await listR.json();
      const ids = (listData.records || []).map(r => r.id);
      if (ids.length) {
        const delUrl = BASE_URL + '?' + ids.map(id => `records[]=${id}`).join('&');
        await fetch(delUrl, { method: 'DELETE', headers });
      }
      if (faq.length) {
        await fetch(BASE_URL, {
          method: 'POST', headers,
          body: JSON.stringify({ records: faq.map((item, i) => ({ fields: { q: item.q, a: item.a, order: i } })) })
        });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
