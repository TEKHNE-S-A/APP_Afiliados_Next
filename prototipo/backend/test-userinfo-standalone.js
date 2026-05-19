const axios = require('axios');
const config = require('./config.json');

async function testUserInfo() {
  const token = '87a56d6d-edea-4507-a6c3-bf322228db93!Ro84CxHQt5iZ3VX5zMQoljl4OrAbvkYmVXRtoAHAMJhMzhbjxXyMXd6uZxjTrw9tBJk2QWhAcZeQee';
  
  console.log('\n=== TEST USERINFO ===');
  console.log('Token:', token.substring(0, 30) + '...');
  
  try {
    const response = await axios.get(
      `${config.gam.baseUrl}/oauth/userinfo`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('\n✅ UserInfo Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    console.log('\n🔍 GUID:', response.data.GUID);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
  
  process.exit(0);
}

testUserInfo();
