/**
 * Test rápido: verificar lógica de detección automática de farmacias
 * 
 * Simula 3 casos:
 * 1. Prestador con rubro y especialidad → NO es farmacia
 * 2. Entidad SIN rubro NI especialidad → ES farmacia (auto-detectada)
 * 3. Prestador con solo rubro (sin especialidad) → NO es farmacia
 */

console.log('🧪 Test lógica detección farmacias\n');

const casos = [
  {
    nombre: 'SANATORIO PASTEUR',
    rubroId: '000000007',
    especialidadId: 'MGR',
    esperado: { esFarmacia: false, rubroFinal: '000000007' }
  },
  {
    nombre: 'FARMACIA CENTRAL',
    rubroId: null,
    especialidadId: null,
    esperado: { esFarmacia: true, rubroFinal: '000000008' }
  },
  {
    nombre: 'CLINICA PRIVADA',
    rubroId: '000000002',
    especialidadId: null,
    esperado: { esFarmacia: false, rubroFinal: '000000002' }
  }
];

casos.forEach((caso, idx) => {
  console.log(`Caso ${idx + 1}: ${caso.nombre}`);
  console.log(`  Input: rubro=${caso.rubroId || 'NULL'}, especialidad=${caso.especialidadId || 'NULL'}`);
  
  // Lógica de detección
  let rubroFinal = caso.rubroId;
  let esFarmacia = false;
  
  if (!caso.rubroId && !caso.especialidadId) {
    rubroFinal = '000000008'; // FARMACIA
    esFarmacia = true;
  }
  
  const emoji = esFarmacia ? '💊' : '🏥';
  const tipo = esFarmacia ? 'FARMACIA (auto-detectada)' : 'PRESTADOR (con rubro)';
  
  console.log(`  ${emoji} Resultado: ${tipo}`);
  console.log(`  Rubro final: ${rubroFinal}`);
  
  // Validar
  const cumple = esFarmacia === caso.esperado.esFarmacia && rubroFinal === caso.esperado.rubroFinal;
  console.log(`  ${cumple ? '✅ PASS' : '❌ FAIL'}\n`);
});

console.log('💡 Regla de negocio:');
console.log('   if (!rubroId && !especialidadId) → Es FARMACIA (rubroId=000000008)');
console.log('   else → Es PRESTADOR (usa rubroId del JSON)');
