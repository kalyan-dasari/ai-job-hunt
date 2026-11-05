async function inspectWorkableV1() {
  const res = await fetch('https://apply.workable.com/api/v1/widget/accounts/mercari-india?details=true');
  const data = await res.json();
  console.log('Account:', data.name);
  console.log('Jobs length:', data.jobs?.length);
  if (data.jobs?.length > 0) {
    console.log('Sample job keys:', Object.keys(data.jobs[0]));
    console.log('Sample job:', JSON.stringify(data.jobs[0], null, 2));
  }
}
inspectWorkableV1();
