async function findActiveWorkable() {
  const candidates = [
    'pleo', 'bringg', 'safetyculture', 'supermetrics', 'homerun', 'haptik', 'grofers', 'curefit', 'urban-company', 'udaan', 'razorpay'
  ];
  for (const c of candidates) {
    try {
      const res = await fetch(`https://apply.workable.com/api/v1/widget/accounts/${c}?details=true`);
      if (res.ok) {
        const data = await res.json();
        console.log(`Workable account "${c}" -> status 200, jobs:`, data.jobs?.length);
        if (data.jobs?.length > 0) {
          console.log(`  First job: "${data.jobs[0].title}" in ${data.jobs[0].location?.city || data.jobs[0].location?.country}`);
        }
      } else {
        // 404
      }
    } catch (e: any) {
      // err
    }
  }
}
findActiveWorkable();
