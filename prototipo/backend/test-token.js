const tokenService = require('./tokenService')

async function showSamples(afiliadoId) {
  console.log('TimeoutTokenCredencial (min):', await tokenService.getTimeoutMinutes())
  const now = new Date()
  console.log('Now:', now.toISOString(), 'token:', await tokenService.generateTokenFor(afiliadoId, now))
  const plus1 = new Date(now.getTime() + (await tokenService.getTimeoutMinutes()) * 60 * 1000 + 1000)
  console.log('After interval:', plus1.toISOString(), 'token:', await tokenService.generateTokenFor(afiliadoId, plus1))
  const other = new Date(now.getTime() + 5 * 60 * 1000)
  console.log('After 5min:', other.toISOString(), 'token:', await tokenService.generateTokenFor(afiliadoId, other))
}

showSamples('demo-aff-1').catch(e => console.error(e))
