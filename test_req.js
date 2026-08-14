const http = require('http');

function makeRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      const cookies = res.headers['set-cookie'] || [];
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data, cookies }));
    });
    req.on('error', (e) => reject(new Error(`Request failed: ${e.message} (code: ${e.code})`)));
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Request timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  console.log('=== TEST: Login via Next.js Proxy (port 3004) ===');
  const loginBody = JSON.stringify({ email: 'kurniawan3516@gmail.com', kataSandi: 'password123' });
  
  try {
    const loginRes = await makeRequest({
      hostname: '127.0.0.1', port: 3004,
      path: '/api/proxy/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginBody)
      }
    }, loginBody);
    
    console.log('Login Status:', loginRes.status);
    console.log('Set-Cookie headers:', loginRes.cookies);
    
    const parsed = JSON.parse(loginRes.body);
    console.log('Response top-level keys:', Object.keys(parsed));
    
    // Check where the accessToken is in the response
    const tokenInRoot = parsed.accessToken;
    const tokenInData = parsed.data?.accessToken;
    const tokenInDataData = parsed.data?.data?.accessToken;
    
    console.log('accessToken in root:', tokenInRoot ? 'YES' : 'NO');
    console.log('accessToken in .data:', tokenInData ? 'YES' : 'NO');  
    console.log('accessToken in .data.data:', tokenInDataData ? 'YES' : 'NO');
    
    const accessTokenCookie = loginRes.cookies.find(c => c.includes('accessToken='));
    console.log('\nCookie set:', accessTokenCookie ? 'YES ✅' : 'NO ❌');
    if (accessTokenCookie) {
      console.log('Cookie:', accessTokenCookie.substring(0, 100));
      
      // Test protected endpoint with cookie
      const cookieHeader = accessTokenCookie.split(';')[0];
      console.log('\n=== Testing protected endpoint with cookie ===');
      const testRes = await makeRequest({
        hostname: '127.0.0.1', port: 3004,
        path: '/api/proxy/ulasan/admin/all?limit=3',
        method: 'GET',
        headers: { 'Cookie': cookieHeader }
      });
      console.log('Protected Status:', testRes.status);
      const testParsed = JSON.parse(testRes.body);
      console.log('Response:', JSON.stringify(testParsed).substring(0, 200));
    }
  } catch(e) {
    console.error('ERROR:', e.message);
  }
}

main().catch(console.error);
