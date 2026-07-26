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

    // Step 3: Send confirmation email via Resend
    const isCaterer = userType === 'caterer';
    const subject = isCaterer
      ? "You're on the Savour Foods caterer waitlist!"
      : "You're on the Savour Foods waitlist!";

    const htmlBody = isCaterer
      ? `<div style="font-family: sans-serif; color: #1A1A1A;">
          <h2 style="color: #C0001A;">Welcome to Savour Foods, ${name}!</h2>
          <p>Thanks for signing up as a caterer. We're building a platform to connect 
          you with clients across Lagos and Abuja, and we'll be reaching out with 
          onboarding details before our August launch.</p>
          <p>In the meantime, feel free to reply to this email with any questions.</p>
          <p>— The Savour Foods Team</p>
        </div>`
      : `<div style="font-family: sans-serif; color: #1A1A1A;">
          <h2 style="color: #C0001A;">Welcome to Savour Foods, ${name}!</h2>
          <p>Thanks for joining the waitlist. We're launching soon in Lagos and Abuja, 
          and you'll be among the first to know when the app is live.</p>
          <p>— The Savour Foods Team</p>
        </div>`;

    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Savour Foods <hello@savourfoodsco.com>',
          to: email,
          subject: subject,
          html: htmlBody,
        }),
      });
    } catch (emailErr) {
      // Don't fail the whole request if only the email send fails —
      // the signup itself already succeeded in Airtable.
      console.error('Resend email error:', emailErr);
    }

    return res.status(200).json({ status: 'success' });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}