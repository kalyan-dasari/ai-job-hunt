async function probeRemaining() {
  console.log('--- Probing Workable ---');
  // Workable candidate endpoints
  const workableEndpoints = [
    'https://apply.workable.com/api/v1/widget/accounts/invision?details=true',
    'https://apply.workable.com/api/v3/accounts/invision/jobs',
    'https://apply.workable.com/api/v2/accounts/browserstack/jobs',
    'https://apply.workable.com/api/v1/widget/accounts/browserstack?details=true',
    'https://apply.workable.com/api/v3/accounts/browserstack/jobs',
  ];

  for (const u of workableEndpoints) {
    try {
      const res = await fetch(u, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'application/json',
        }
      });
      console.log(`Workable URL: ${u} -> Status: ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        console.log('Workable sample data keys:', Object.keys(data));
      }
    } catch (e: any) {
      console.log(`Workable error on ${u}: ${e.message}`);
    }
  }

  console.log('\n--- Probing Rippling ---');
  const ripplingEndpoints = [
    'https://api.rippling.com/platform/api/ats/v1/board/replit/jobs',
    'https://ats.rippling.com/api/v1/board/replit/jobs',
    'https://api.rippling.com/platform/api/ats/v1/board/apollo/jobs',
  ];
  for (const u of ripplingEndpoints) {
    try {
      const res = await fetch(u, { headers: { 'User-Agent': 'JobPilotBot/1.0', 'Accept': 'application/json' } });
      console.log(`Rippling URL: ${u} -> Status: ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        console.log('Rippling sample keys:', Object.keys(data));
      }
    } catch (e: any) {
      console.log(`Rippling error on ${u}: ${e.message}`);
    }
  }

  console.log('\n--- Probing Workday ---');
  const workdayUrl = 'https://adobe.wd5.myworkdayjobs.com/wday/cxs/adobe/external_experienced/jobs';
  try {
    const res = await fetch(workdayUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'JobPilotBot/1.0',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ appliedFacets: {}, limit: 5, offset: 0, searchText: '' }),
    });
    console.log(`Workday URL: ${workdayUrl} -> Status: ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log('Workday total:', data.total, 'jobs count:', data.jobPostings?.length);
    } else {
      const txt = await res.text();
      console.log('Workday err body:', txt.slice(0, 200));
    }
  } catch (e: any) {
    console.log(`Workday error: ${e.message}`);
  }
}

probeRemaining();
