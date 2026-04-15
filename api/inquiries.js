// api/inquiries.js
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const INQ_TABLE = process.env.AIRTABLE_INQ_TABLE || 'Inquiries';
const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}/${INQ_TABLE}`;

const headers = {
  'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
  'Content-Type': 'application/json',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const r = await fetch(`${BASE_URL}?sort[0][field]=createdTime&sort[0][direction]=desc`, { headers });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json(data);
      const inquiries = (data.records || []).map(rec => ({
        id: rec.id,
        name: rec.fields.name || '',
        contact: rec.fields.contact || '',
        item: rec.fields.item || '',
        message: rec.fields.message || '',
        status: rec.fields.status || 'new',
        createdTime: rec.createdTime,
      }));
      return res.status(200).json({ inquiries });
    }

    if (req.method === 'POST') {
      const { name, contact, item, message } = req.body;
      const r = await fetch(BASE_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          records: [{ fields: { name, contact, item: item||'', message: message||'', status: 'new' } }]
        })
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json(data);

      // LINE 通知管理員（若有設定）
      const lineToken = process.env.LINE_TOKEN;
      const adminUid = process.env.LINE_ADMIN_USER_ID;
      if (lineToken && adminUid) {
        const itemMap = {nose:'隆鼻',eyes:'雙眼皮',face:'輪廓整形',filler:'填充',other:'其他'};
        await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${lineToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: adminUid,
            messages: [{ type: 'text', text: `📩 新諮詢！\n姓名：${name}\n聯絡：${contact}\n項目：${itemMap[item]||item||'未填'}\n${message?'留言：'+message:''}` }]
          })
        }).catch(()=>{});
      }

      return res.status(201).json({ ok: true });
    }

    if (req.method === 'PATCH') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const r = await fetch(`${BASE_URL}/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields: { status: req.body.status } })
      });
      if (!r.ok) { const d = await r.json(); return res.status(r.status).json(d); }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
