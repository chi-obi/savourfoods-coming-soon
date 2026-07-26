export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, city, userType, businessName } = req.body;

  if (!name || !email || !city || !userType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const airtableRes = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Signups`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            Name: name,
            Email: email,
            Phone: phone || '',
            City: city,
            'User Type': userType,
            'Business Name': businessName || '',
            'Submitted At': new Date().toISOString(),
          },
        }),
      }
    );

    if (!airtableRes.ok) {
      const errorData = await airtableRes.json();
      console.error('Airtable error:', errorData);
      return res.status(502).json({ error: 'Failed to save signup' });
    }

    return res.status(200).json({ status: 'success' });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}