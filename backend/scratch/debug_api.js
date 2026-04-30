async function debugAPI() {
  const baseURL = 'http://localhost:3000/api';
  try {
    // 1. Login
    console.log('Logging in...');
    const loginRes = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@admin.com', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    if (!token) throw new Error('Login failed: ' + JSON.stringify(loginData));
    console.log('Login success');

    const headers = { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. Get E2E Tenant
    const tenantsRes = await fetch(`${baseURL}/tenants`, { headers });
    const tenantsData = await tenantsRes.json();
    const e2eTenant = tenantsData.tenants.find(t => t.name === 'E2E Test Tenant');
    if (!e2eTenant) throw new Error('E2E Test Tenant not found. Run seed first.');
    console.log('Found E2E Tenant:', e2eTenant._id);

    // 3. Get Unit and User
    const unitsRes = await fetch(`${baseURL}/units?tenantId=${e2eTenant._id}`, { headers });
    const unitsData = await unitsRes.json();
    const unit = unitsData.units[0];
    
    const usersRes = await fetch(`${baseURL}/users?tenantId=${e2eTenant._id}`, { headers });
    const usersData = await usersRes.json();
    const user = usersData.users[0];

    if (!unit || !user) throw new Error('Unit or User missing for E2E Tenant');

    // 4. Resident
    console.log('Creating resident...');
    const rRes = await fetch(`${baseURL}/residents`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tenantId: e2eTenant._id,
        unitId: unit._id,
        name: 'Debug Resident',
        phone: '1112223333',
        email: user.email,
        relationship: 'propietario'
      })
    });
    console.log('Resident status:', rRes.status, await rRes.json());

    // 5. Notice
    console.log('Creating notice...');
    const nRes = await fetch(`${baseURL}/notices`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tenantId: e2eTenant._id,
        title: 'Debug Notice',
        content: 'Content here',
        category: 'info'
      })
    });
    console.log('Notice status:', nRes.status, await nRes.json());

    // 6. Amenity
    console.log('Creating amenity...');
    const aRes = await fetch(`${baseURL}/amenities`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tenantId: e2eTenant._id,
        name: 'Debug Amenity',
        description: 'Desc',
        maxDurationHours: 2
      })
    });
    console.log('Amenity status:', aRes.status, await aRes.json());

  } catch (err) {
    console.error('Debug script error:', err.message);
  }
}

debugAPI();
