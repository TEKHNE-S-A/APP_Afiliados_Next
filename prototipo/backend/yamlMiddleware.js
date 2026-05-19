// yamlMiddleware.js
// Middleware para parsear request bodies en formato YAML

const yaml = require('js-yaml')

/**
 * Middleware que parsea tanto JSON como YAML basado en Content-Type
 * Soporta:
 * - application/json (procesado por express.json)
 * - application/yaml, application/x-yaml, text/yaml
 */
function yamlParser(req, res, next) {
  const contentType = req.get('Content-Type') || ''
  
  // Detectar si es YAML
  const isYaml = contentType.includes('application/yaml') || 
                 contentType.includes('application/x-yaml') || 
                 contentType.includes('text/yaml')
  
  if (!isYaml) {
    // No es YAML, pasar al siguiente middleware (probablemente express.json)
    return next()
  }
  
  // Es YAML - parsear manualmente
  let rawBody = ''
  
  req.on('data', (chunk) => {
    rawBody += chunk.toString('utf8')
  })
  
  req.on('end', () => {
    try {
      if (rawBody.trim() === '') {
        req.body = {}
      } else {
        // Parsear YAML
        req.body = yaml.load(rawBody)
      }
      next()
    } catch (error) {
      console.error('❌ Error parseando YAML:', error.message)
      res.status(400).json({
        error: 'YAML_PARSE_ERROR',
        message: `Error parseando YAML: ${error.message}`
      })
    }
  })
  
  req.on('error', (error) => {
    console.error('❌ Error leyendo request body:', error.message)
    res.status(400).json({
      error: 'REQUEST_ERROR',
      message: 'Error leyendo el cuerpo de la petición'
    })
  })
}

module.exports = yamlParser
