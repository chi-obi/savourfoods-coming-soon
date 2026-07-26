export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, city, userType, businessName } = req.body;

  if (!name || !email || !city || !userType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const baseUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Signups`;
  const headers = {
    Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
    'Content-Type': 'application/json',
  };

  try {
    // Step 1: Check if this email already exists
    const filterFormula = encodeURIComponent(`LOWER({Email}) = "${email.toLowerCase().trim()}"`);
    const checkRes = await fetch(`${baseUrl}?filterByFormula=${filterFormula}&maxRecords=1`, {
      headers,
    });

    if (!checkRes.ok) {
      console.error('Airtable lookup error:', await checkRes.json());
      return res.status(502).json({ error: 'Failed to verify signup' });
    }

    const checkData = await checkRes.json();

    if (checkData.records.length > 0) {
      return res.status(409).json({ error: 'duplicate', message: "You're already on the list!" });
    }

    // Step 2: Create the new record
    const createRes = await fetch(baseUrl, {
      method: 'POST',
      headers,
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
    });

    if (!createRes.ok) {
      const errorData = await createRes.json();
      console.error('Airtable create error:', errorData);
      return res.status(502).json({ error: 'Failed to save signup' });
    }

    return res.status(200).json({ status: 'success' });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}