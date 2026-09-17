const axios = require('axios');

const BASE = 'http://localhost:5000/api';

async function run() {
  try {
    console.log('\n=== 1. Creating services ===');
    const billPayment = await axios.post(`${BASE}/services`, {
      name: `Bill Payment ${Date.now()}`,
      estimatedDuration: 3,
      description: 'Quick bill settlement'
    });
    const accountOpening = await axios.post(`${BASE}/services`, {
      name: `Account Opening ${Date.now()}`,
      estimatedDuration: 20,
      description: 'New account setup'
    });
    console.log('Created:', billPayment.data.name, '|', accountOpening.data.name);

    console.log('\n=== 2. Creating counter ===');
    const counter = await axios.post(`${BASE}/counters`, {
      counterNumber: Math.floor(Math.random() * 1000)
    });
    console.log('Counter created:', counter.data.counterNumber, counter.data._id);

    console.log('\n=== 3. Creating tokens ===');
    const tokenA = await axios.post(`${BASE}/tokens`, {
      phoneNumber: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
      name: 'Regular Customer (long job)',
      serviceId: accountOpening.data._id
    });
    console.log('Token A:', tokenA.data.customer.name, '-', tokenA.data.service.name);

    const tokenB = await axios.post(`${BASE}/tokens`, {
      phoneNumber: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
      name: 'Gold Customer (quick job)',
      serviceId: billPayment.data._id
    });
    console.log('Token B:', tokenB.data.customer.name, '-', tokenB.data.service.name);

    console.log('\n(Manually upgrade Token B\'s customer to Gold in mongosh to see the full effect, then re-run just the queue check)');

    console.log('\n=== 4. Fetching sorted queue ===');
    const queue = await axios.get(`${BASE}/tokens/queue`);
    console.log('Crowd level:', queue.data.crowdLevel);
    queue.data.queue.forEach((t, i) => {
      console.log(
        `  #${i + 1} | ${t.customer.name} | ${t.service.name} | loyalty=${t.customer.loyaltyLevel} | score=${t.priorityScore}`
      );
    });

    console.log('\n=== 5. Calling next customer ===');
    const called = await axios.post(`${BASE}/tokens/call-next`, {
      counterId: counter.data._id
    });
    console.log('Called:', called.data.customer?.name || called.data.message);

    if (called.data._id) {
      console.log('\n=== 6. Completing token ===');
      const completed = await axios.post(`${BASE}/tokens/complete`, {
        tokenId: called.data._id
      });
      console.log('Completed:', completed.data.status);
    }

    console.log('\n✅ Full flow test finished successfully.\n');
  } catch (err) {
    console.error('\n❌ Test failed:', err.response?.data || err.message);
  }
}

run();