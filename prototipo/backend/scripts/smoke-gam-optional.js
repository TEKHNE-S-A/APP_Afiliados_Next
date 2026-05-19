const db = require('../db/connection');
const axios = require('axios');

async function setFlag(value) {
  await db.query(
    "UPDATE nusispar SET nusisvalpa = $1 WHERE nusisgrupa = 'SEGURIDAD_APP' AND nusistippa = 'HabilitarGAM'",
    [value]
  );
}

async function hitGamLogin(label) {
  const response = await axios.post('http://127.0.0.1:3000/gam/login', {}, {
    timeout: 5000,
    validateStatus: () => true,
  });

  console.log(`${label}: status=${response.status}`);
  console.log(`${label}: body=${JSON.stringify(response.data)}`);
}

async function main() {
  await setFlag('S');
  await hitGamLogin('FLAG_S');

  await setFlag('N');
  await hitGamLogin('FLAG_N');

  await setFlag('S');
  await hitGamLogin('FLAG_RESTORE_S');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Smoke test failed:', error.message);
    process.exit(1);
  });
