/**
 * GAM (GeneXus Access Manager) Service
 * Integración con el sistema de autenticación GAM de OSEP
 * 
 * URL Base: https://test17.osep.gob.ar/APP_OSEP_TEST
 * Documentación: GAM_Authentication_Documentation.md
 */

const axios = require('axios');
const emailService = require('./emailService');
const parametrosRepository = require('./repositories/parametrosRepository');

let fileConfig = null;
try {
  // eslint-disable-next-line global-require
  fileConfig = require('./config.json');
} catch {
  fileConfig = null;
}

// Configuración GAM desde variables de entorno o config.json
const GAM_BASE_URL_RAW = process.env.GAM_BASE_URL || fileConfig?.gam?.baseUrl || 'http://localhost:8081/PRODUCTO_APP_SHEMA_DESA1JavaEnvironment';
const GAM_BASE_URL = String(GAM_BASE_URL_RAW).replace(/\/+$/, '');
const GAM_CLIENT_ID = process.env.GAM_CLIENT_ID || fileConfig?.gam?.clientId || null;
const GAM_CLIENT_SECRET = process.env.GAM_CLIENT_SECRET || fileConfig?.gam?.clientSecret || null;

// Timeout para requests GAM (30 segundos)
const GAM_TIMEOUT = fileConfig?.gam?.timeout || 30000;
const GAM_ENABLED_CACHE_TTL_MS = 60 * 1000;

const gamEnabledCache = {
  value: null,
  expiresAt: 0
};

if (!GAM_CLIENT_ID || !GAM_CLIENT_SECRET) {
  console.warn('⚠️  Configuración GAM incompleta: falta clientId/clientSecret (config.json o variables de entorno)');
}

/**
 * Determina si GAM esta habilitado por parametro de sistema.
 * Parametro: SEGURIDAD_APP.HabilitarGAM
 * Valores soportados: S/N, true/false, 1/0
 *
 * @param {Object} [options]
 * @param {boolean} [options.forceRefresh=false] - Ignora cache y consulta BD
 * @returns {Promise<boolean>} true si GAM esta habilitado
 */
async function isGAMEnabled(options = {}) {
  const { forceRefresh = false } = options;
  const now = Date.now();

  if (!forceRefresh && gamEnabledCache.value !== null && gamEnabledCache.expiresAt > now) {
    return gamEnabledCache.value;
  }

  try {
    const parametro = await parametrosRepository.findOne('SEGURIDAD_APP', 'HabilitarGAM');
    const rawValue = String(parametro?.nusisvalpa ?? 'S').trim().toUpperCase();
    const enabled = ['S', 'SI', 'TRUE', '1', 'Y', 'YES'].includes(rawValue);

    gamEnabledCache.value = enabled;
    gamEnabledCache.expiresAt = now + GAM_ENABLED_CACHE_TTL_MS;

    console.log(`🔐 Modo GAM: ${enabled ? 'HABILITADO' : 'DESHABILITADO'} (SEGURIDAD_APP.HabilitarGAM=${rawValue})`);
    return enabled;
  } catch (error) {
    console.warn('⚠️  No se pudo leer SEGURIDAD_APP.HabilitarGAM; se asume GAM habilitado:', error.message || error);
    gamEnabledCache.value = true;
    gamEnabledCache.expiresAt = now + GAM_ENABLED_CACHE_TTL_MS;
    return true;
  }
}

/**
 * Registra un nuevo usuario en GAM
 * Endpoint: POST /rest/Nucleo/NURegistroUsuario
 * 
 * @param {Object} userData - Datos del usuario
 * @param {string} userData.email - Email del usuario (también será el UserName)
 * @param {string} userData.password - Contraseña
 * @param {string} userData.firstName - Nombre
 * @param {string} userData.lastName - Apellido
 * @param {string} userData.telefono - Teléfono
 * @param {string} userData.nroAfiliado - Número de afiliado (formato: XX-XXXXXX-XX)
 * @param {string} userData.documento - DNI sin puntos
 * @param {string} userData.cuil - CUIL sin guiones
 * @param {string} userData.sexo - Sexo (M/F)
 * @param {string} userData.fechaNacimiento - Fecha nacimiento (YYYY-MM-DD)
 * @param {number} userData.canMiembrosFamiliar - Cantidad de miembros del grupo familiar
 * @returns {Promise<Object>} { success, userId, message }
 */
async function registerUserGAM(userData) {
  try {
    console.log('🔐 Registrando usuario en GAM:', {
      email: userData.email,
      nroAfiliado: userData.nroAfiliado
    });

    const requestBody = {
      FormaReg: 'APP',
      RegistracionConNroAfiliado: userData.nroAfiliado,
      RegistracionConDocumento: userData.documento,
      RegistracionConCUIL: userData.cuil,
      SoyAfiliado: true,
      UserName: userData.email,
      Email: userData.email,
      Telefono: userData.telefono,
      FirstName: userData.firstName,
      LastName: userData.lastName,
      Password: userData.password,
      ConfirmPassword: userData.password,
      Sexo: userData.sexo,
      TitularNro: userData.titularNro || '',
      FechaNAcimiento: userData.fechaNacimiento, // Typo intencional: GAM usa "FechaNAcimiento"
      NroAfiliado: userData.nroAfiliado,
      CanMiembrosFamiliar: userData.canMiembrosFamiliar || 1
    };

    console.log('📤 RequestBody completo a GAM:', JSON.stringify(requestBody, null, 2));

    const response = await axios.post(
      `${GAM_BASE_URL}/rest/Nucleo/NURegistroUsuario`,
      requestBody,
      {
        timeout: GAM_TIMEOUT,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Registro GAM exitoso - Respuesta completa:', JSON.stringify(response.data, null, 2));
    
    // Verificar si GAM retornó error
    if (response.data.isOK === false || (response.data.ErrorMessages && response.data.ErrorMessages.length > 0)) {
      const errorMsg = response.data.ErrorMessages?.[0]?.Description || 'Error desconocido en GAM';
      console.error('❌ GAM rechazó el registro:', errorMsg);
      const err = new Error(errorMsg);
      err.success = false;
      err.statusCode = 400;
      err.details = response.data;
      throw err;
    }
    
    // Buscar userId en diferentes ubicaciones posibles
    let userId = response.data.userId || response.data.UsuarioId || response.data.UserGUID || 
                   response.data.GUID || response.data.Id || response.data.id;
    
    console.log('🔍 userId buscado en respuesta GAM:', userId);
    console.log('🔍 Datos para login:', { email: userData.email, hasPassword: !!userData.password });
    
    // Si GAM no devolvió userId, hacer login para obtenerlo
    if (!userId && userData.email && userData.password) {
      console.log('⚠️ GAM no devolvió userId, intentando login + userinfo para obtenerlo...');
      try {
        // 1. Login para obtener access_token
        const loginResult = await loginGAM(userData.email, userData.password);
        console.log('🔍 Login exitoso, access_token obtenido');
        
        // 2. Llamar a /oauth/userinfo para obtener el GUID
        if (loginResult.access_token) {
          console.log('🔍 Obteniendo GUID desde /oauth/userinfo...');
          const userInfo = await getUserInfo(loginResult.access_token);
          console.log('🔍 UserInfo obtenido:', JSON.stringify(userInfo, null, 2));
          
          userId = userInfo.GUID || userInfo.guid || userInfo.Id || userInfo.id;
          console.log('✅ userId (GUID) obtenido via userinfo:', userId);
          
          // Agregar token y GUID a la respuesta
          if (userId) {
            response.data.access_token = loginResult.access_token;
            response.data.expires_in = loginResult.expires_in;
            response.data.GUID = userId;
          }
        } else {
          console.error('❌ Login no devolvió access_token');
        }
      } catch (loginError) {
        console.error('❌ Error al obtener userId via login/userinfo:', loginError);
        console.error('❌ Stack:', loginError.stack);
        // No fallar aquí, continuar sin userId
      }
    }
    
    if (!userId) {
      console.warn('⚠️ No se pudo obtener userId de GAM');
      // No throw, devolver success pero sin userId
      return {
        success: true,
        userId: null,
        message: response.data.message || 'Usuario registrado exitosamente (sin userId)',
        data: response.data,
        warning: 'GAM no devolvió userId'
      };
    }
    
    console.log('🔍 userId extraído:', userId);
    console.log('🔍 Todas las claves en response.data:', Object.keys(response.data));

    return {
      success: true,
      userId: userId,
      message: response.data.message || 'Usuario registrado exitosamente',
      data: response.data
    };

  } catch (error) {
    console.error('❌ Error en registro GAM:', error.response?.data || error.message);
    const err = new Error(error.response?.data?.error || error.message || 'Error en GAM');
    err.success = false;
    err.statusCode = error.response?.status || error.statusCode || 500;
    err.details = error.response?.data || error.details;
    throw err;
  }
}

/**
 * Login OAuth2 en GAM
 * Endpoint: POST /oauth/access_token
 * 
 * @param {string} username - Email/username del usuario
 * @param {string} password - Contraseña
 * @returns {Promise<Object>} { access_token, token_type, expires_in, user_id, scope }
 */
async function loginGAM(username, password) {
  try {
    console.log('🔐 Login GAM OAuth2:', { username });

    const params = new URLSearchParams({
      grant_type: 'GAMLocal',
      scope: 'gam_user_data gam_user_roles gam_user_additional_data',
      client_id: GAM_CLIENT_ID,
      client_secret: GAM_CLIENT_SECRET,
      username: username,
      password: password,
      authentication_type_name: 'GAM_Remoto'
    });

    const response = await axios.post(
      `${GAM_BASE_URL}/oauth/access_token`,
      params,
      {
        timeout: GAM_TIMEOUT,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('✅ Login GAM exitoso:', {
      user_id: response.data.user_id,
      token_type: response.data.token_type,
      expires_in: response.data.expires_in,
      has_refresh_token: !!response.data.refresh_token
    });

    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token, // Incluir refresh_token si GAM lo provee
      token_type: response.data.token_type || 'Bearer',
      expires_in: response.data.expires_in,
      user_id: response.data.user_id,
      scope: response.data.scope
    };

  } catch (error) {
    console.error('❌ Error en login GAM:', error.response?.data || error.message);
    throw {
      success: false,
      error: error.response?.data?.error || 'Credenciales inválidas',
      statusCode: error.response?.status,
      details: error.response?.data
    };
  }
}

/**
 * Refresca access_token usando refresh_token
 * Endpoint: POST /oauth/access_token
 * 
 * @param {string} refreshToken - Refresh token OAuth2
 * @returns {Promise<Object>} { access_token, refresh_token, token_type, expires_in }
 */
async function refreshAccessToken(refreshToken) {
  try {
    console.log('🔄 Refrescando access_token con refresh_token GAM');

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: GAM_CLIENT_ID,
      client_secret: GAM_CLIENT_SECRET
    });

    const response = await axios.post(
      `${GAM_BASE_URL}/oauth/access_token`,
      params,
      {
        timeout: GAM_TIMEOUT,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('✅ Token refrescado exitosamente:', {
      token_type: response.data.token_type,
      expires_in: response.data.expires_in,
      has_new_refresh_token: !!response.data.refresh_token
    });

    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token || refreshToken, // Usar nuevo o mantener el actual
      token_type: response.data.token_type || 'Bearer',
      expires_in: response.data.expires_in,
      user_id: response.data.user_id,
      scope: response.data.scope
    };

  } catch (error) {
    console.error('❌ Error refrescando token GAM:', error.response?.data || error.message);
    throw {
      success: false,
      error: error.response?.data?.error || 'Refresh token inválido o expirado',
      statusCode: error.response?.status,
      details: error.response?.data
    };
  }
}

/**
 * Obtiene información del usuario autenticado
 * Endpoint: GET /oauth/userinfo
 * 
 * @param {string} accessToken - Token de acceso OAuth2
 * @returns {Promise<Object>} Información del usuario
 */
async function getUserInfo(accessToken) {
  try {
    console.log('🔐 Obteniendo info usuario GAM');

    const response = await axios.get(
      `${GAM_BASE_URL}/oauth/userinfo`,
      {
        timeout: GAM_TIMEOUT,
        headers: {
          'Authorization': `OAuth ${accessToken}`,
          'GeneXus-Agent': 'ExternalClient'
        }
      }
    );

    console.log('✅ Info usuario GAM obtenida:', {
      user_id: response.data.user_id,
      username: response.data.username
    });
    console.log('📋 Respuesta GAM COMPLETA:', JSON.stringify(response.data, null, 2));

    return response.data;

  } catch (error) {
    console.error('❌ Error obteniendo info usuario GAM:', error.response?.data || error.message);
    if (error.response) {
      console.error('📋 Detalles rechazo GAM:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      })
    }
    throw {
      success: false,
      error: error.response?.data?.error || error.message,
      statusCode: error.response?.status
    };
  }
}

/**
 * Valida si un usuario existe en GAM
 * Endpoint: POST /rest/Nucleo/NUValidoUsuario
 * 
 * @param {Object} validationData - Datos para validación
 * @returns {Promise<Object>} { valid, message, userExists, isActive }
 */
async function validateUserGAM(validationData) {
  try {
    console.log('🔐 Validando usuario GAM:', {
      nroAfiliado: validationData.nroAfiliado
    });

    const requestBody = {
      FormaReg: 'APP',
      RegistracionConNroAfiliado: validationData.nroAfiliado,
      RegistracionConDocumento: validationData.documento,
      RegistracionConCUIL: validationData.cuil,
      SoyAfiliado: true,
      Sexo: validationData.sexo,
      TitularNro: validationData.titularNro || '',
      FechaNAcimiento: validationData.fechaNacimiento, // Typo intencional
      NroAfiliado: validationData.nroAfiliado,
      CanMiembrosFamiliar: validationData.canMiembrosFamiliar || 1
    };

    const response = await axios.post(
      `${GAM_BASE_URL}/rest/Nucleo/NUValidoUsuario`,
      requestBody,
      {
        timeout: GAM_TIMEOUT,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Validación GAM exitosa:', response.data);

    return response.data;

  } catch (error) {
    console.error('❌ Error en validación GAM:', error.response?.data || error.message);
    throw {
      success: false,
      error: error.response?.data?.error || error.message,
      statusCode: error.response?.status
    };
  }
}

/**
 * Cambia la contraseña de un usuario
 * Endpoint: POST /rest/Nucleo/NUCambiaContrasenaUsuario
 * 
 * @param {string} accessToken - Token de acceso OAuth2
 * @param {string} username - Username/email del usuario
 * @param {string} currentPassword - Contraseña actual
 * @param {string} newPassword - Nueva contraseña
 * @returns {Promise<Object>} { success, message }
 */
async function changePasswordGAM(accessToken, username, currentPassword, newPassword) {
  try {
    console.log('🔐 Cambiando contraseña GAM:', { username });

    const requestBody = {
      isPasswordExpired: 0,
      UserName: username,
      UserPassword: currentPassword,
      UserPasswordNew: newPassword,
      UserPasswordNewConf: newPassword
    };

    const response = await axios.post(
      `${GAM_BASE_URL}/rest/Nucleo/NUCambiaContrasenaUsuario`,
      requestBody,
      {
        timeout: GAM_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `OAuth ${accessToken}`
        }
      }
    );

    console.log('✅ Contraseña cambiada exitosamente');

    return {
      success: true,
      message: response.data.message || 'Contraseña cambiada exitosamente'
    };

  } catch (error) {
    console.error('❌ Error cambiando contraseña GAM:', error.response?.data || error.message);
    throw {
      success: false,
      error: error.response?.data?.error || error.message,
      statusCode: error.response?.status
    };
  }
}

/**
 * Envía código de validación por email
 * NUEVO: Envía email desde backend usando emailService (SMTP configurado en BD)
 * 
 * @param {string} email - Email del usuario
 * @param {number} codigoValidacion - Código de validación (4 dígitos)
 * @param {string} userName - Nombre del usuario (opcional)
 * @returns {Promise<Object>} { success, message, emailSent, maskedEmail }
 */
async function sendValidationCodeEmail(email, codigoValidacion, userName = null) {
  try {
    console.log('🔐 Enviando código validación desde backend:', { 
      email: emailService.maskEmail(email),
      codigo: codigoValidacion 
    });

    // Enviar email desde backend usando emailService
    const result = await emailService.sendValidationCodeEmail(email, codigoValidacion, userName);

    console.log('✅ Código validación enviado desde backend:', {
      messageId: result.messageId,
      maskedEmail: result.maskedEmail
    });

    return {
      success: true,
      message: `Código de validación enviado a ${result.maskedEmail}`,
      emailSent: true,
      maskedEmail: result.maskedEmail
    };

  } catch (error) {
    console.error('❌ Error enviando código validación:', error);
    throw {
      success: false,
      error: error.error || error.message,
      statusCode: 500
    };
  }
}

/**
 * Inicia recuperación de contraseña
 * NUEVO: Envía email desde backend usando emailService (SMTP configurado en BD)
 * 
 * @param {string} email - Email del usuario
 * @param {string} userName - Nombre del usuario (opcional)
 * @returns {Promise<Object>} { success, message, emailSent, maskedEmail }
 */
async function passwordRecoveryGAM(email, userName = null) {
  try {
    console.log('🔐 Recuperación contraseña - Enviando desde backend:', { email: emailService.maskEmail(email) });

    // Construir link de recuperación (por ahora mock, GAM debe proveer el link real)
    const recoveryToken = Buffer.from(`${email}:${Date.now()}`).toString('base64');
    const recoveryLink = `${GAM_BASE_URL}/password-reset?token=${recoveryToken}`;

    // Enviar email desde backend usando emailService
    const result = await emailService.sendPasswordRecoveryEmail(email, recoveryLink, userName);

    console.log('✅ Email de recuperación enviado desde backend:', {
      messageId: result.messageId,
      maskedEmail: result.maskedEmail
    });

    return {
      success: true,
      message: `Email de recuperación enviado a ${result.maskedEmail}`,
      emailSent: true,
      maskedEmail: result.maskedEmail
    };

  } catch (error) {
    console.error('❌ Error en recuperación contraseña:', error);
    throw {
      success: false,
      error: error.error || error.message,
      statusCode: 500
    };
  }
}

/**
 * Anula/cancela un registro de usuario
 * Endpoint: POST /rest/Nucleo/NUAnulaRegistracion
 * 
 * @param {string} accessToken - Token de acceso OAuth2
 * @returns {Promise<Object>} { success, message }
 */
async function cancelRegistrationGAM(accessToken) {
  try {
    console.log('🔐 Anulando registro GAM');

    const response = await axios.post(
      `${GAM_BASE_URL}/rest/Nucleo/NUAnulaRegistracion`,
      {},
      {
        timeout: GAM_TIMEOUT,
        headers: {
          'Authorization': `OAuth ${accessToken}`
        }
      }
    );

    console.log('✅ Registro anulado');

    return {
      success: true,
      message: response.data.message || 'Registro anulado exitosamente'
    };

  } catch (error) {
    console.error('❌ Error anulando registro GAM:', error.response?.data || error.message);
    throw {
      success: false,
      error: error.response?.data?.error || error.message,
      statusCode: error.response?.status
    };
  }
}

/**
 * Cierra sesión en GAM (revoca token)
 * Endpoint: GET /oauth/logout
 * 
 * @param {string} accessToken - Token de acceso GAM
 * @returns {Promise<Object>} { success, message }
 */
async function logoutGAM(accessToken) {
  try {
    console.log('🚪 Cerrando sesión en GAM');

    const response = await axios.get(
      `${GAM_BASE_URL}/oauth/logout`,
      {
        timeout: GAM_TIMEOUT,
        headers: {
          'Authorization': `OAuth ${accessToken}`,
          'GeneXus-Agent': 'ExternalClient'
        }
      }
    );

    console.log('✅ Sesión GAM cerrada exitosamente');

    return {
      success: true,
      message: 'Sesión cerrada'
    };

  } catch (error) {
    console.error('❌ Error cerrando sesión GAM:', error.response?.data || error.message);
    throw {
      success: false,
      error: error.response?.data?.error || error.message,
      statusCode: error.response?.status
    };
  }
}

/**
 * Verifica si un usuario existe en GAM por email/username
 * Implementa REGLA 2.1: Usuario existe en GAM pero no en BD local
 * 
 * Estrategia: Intenta login con credenciales dummy para detectar si usuario existe
 * - Error "credenciales inválidas" → Usuario EXISTE
 * - Error "usuario no encontrado" → Usuario NO EXISTE
 * 
 * @param {string} email - Email/username del usuario
 * @returns {Promise<Object>} { exists: boolean, userId: string|null, isActive: boolean|null }
 */
async function checkUserExistsInGAM(email) {
  try {
    console.log('🔍 Verificando existencia usuario en GAM:', email);

    // Estrategia: Intentar login con password dummy
    // Si usuario NO existe → GAM retorna error específico
    // Si usuario existe → GAM retorna "credenciales inválidas"
    
    const dummyPassword = `__CHECK_USER_${Date.now()}__`;
    
    try {
      // Intentar login (esperamos que falle)
      await loginGAM(email, dummyPassword);
      
      // Si llega aquí, el password dummy funcionó (muy improbable)
      // Considerar que el usuario existe
      console.log('⚠️  Login exitoso con password dummy (caso excepcional)');
      return {
        exists: true,
        userId: null,
        isActive: true
      };
      
    } catch (loginError) {
      // Analizar error para determinar si usuario existe
      const errorMsg = String(loginError.error || loginError.message || '').toLowerCase();
      const errorDetails = String(JSON.stringify(loginError.details || {})).toLowerCase();
      
      console.log('🔍 Error login GAM:', { errorMsg, errorDetails });
      
      // Patrones que indican que el usuario NO EXISTE
      const userNotFoundPatterns = [
        'usuario no encontrado',
        'user not found',
        'usuario no existe',
        'user does not exist',
        'usuário não encontrado',
        'invalid_user',
        'user_not_found'
      ];
      
      // Patrones que indican que el usuario EXISTE (pero password incorrecto)
      const invalidCredentialsPatterns = [
        'credenciales inválidas',
        'invalid credentials',
        'credenciais inválidas',
        'incorrect password',
        'contraseña incorrecta',
        'senha incorreta',
        'invalid_grant',
        'authentication failed'
      ];
      
      // Verificar si usuario NO existe
      const userNotFound = userNotFoundPatterns.some(pattern => 
        errorMsg.includes(pattern) || errorDetails.includes(pattern)
      );
      
      if (userNotFound) {
        console.log('✅ Usuario NO existe en GAM');
        return {
          exists: false,
          userId: null,
          isActive: null
        };
      }
      
      // Verificar si credenciales inválidas (usuario EXISTE)
      const invalidCreds = invalidCredentialsPatterns.some(pattern =>
        errorMsg.includes(pattern) || errorDetails.includes(pattern)
      );
      
      if (invalidCreds) {
        console.log('✅ Usuario EXISTE en GAM (credenciales inválidas)');
        
        // Intentar obtener userId haciendo una validación alternativa
        // Si no es posible, retornar null y el flujo deberá obtenerlo después del login
        return {
          exists: true,
          userId: null, // Se obtendrá después con login real
          isActive: true
        };
      }
      
      // Error desconocido - por precaución asumir que usuario NO existe
      console.warn('⚠️  Error desconocido verificando GAM, asumiendo usuario NO existe');
      console.warn('   Error:', errorMsg);
      return {
        exists: false,
        userId: null,
        isActive: null
      };
    }
    
  } catch (error) {
    console.error('❌ Error inesperado en checkUserExistsInGAM:', error);
    // Por seguridad, asumir que no existe y permitir registro normal
    return {
      exists: false,
      userId: null,
      isActive: null
    };
  }
}

/**
 * Verifica si un token de acceso GAM es válido
 * Endpoint: GET /oauth/userinfo
 * 
 * @param {string} accessToken - Token de acceso OAuth2
 * @returns {Promise<Object>} { valid: boolean, userId?: string }
 */
async function verifyTokenGAM(accessToken) {
  try {
    console.log('🔐 Verificando validez del token GAM...');

    const response = await axios.get(
      `${GAM_BASE_URL}/oauth/userinfo`,
      {
        timeout: GAM_TIMEOUT,
        headers: {
          'Authorization': `OAuth ${accessToken}`,
          'GeneXus-Agent': 'ExternalClient'
        }
      }
    );

    console.log('✅ Token GAM válido:', {
      userId: response.data.sub || response.data.user_id
    });

    return {
      valid: true,
      userId: response.data.sub || response.data.user_id
    };

  } catch (error) {
    if (error.response?.status === 401) {
      console.log('❌ Token GAM inválido o expirado');
      return {
        valid: false,
        error: 'Token inválido o expirado'
      };
    }

    console.error('❌ Error verificando token GAM:', error.response?.data || error.message);
    throw {
      success: false,
      error: error.response?.data?.error || 'Error al verificar token',
      statusCode: error.response?.status,
      details: error.response?.data
    };
  }
}

/**
 * Obtiene el estado de un usuario GAM por su GUID.
 * Usa client_credentials para autenticar como admin y luego
 * consulta el endpoint de administración de usuarios GAM.
 *
 * @param {string} guid - GUID del usuario GAM (nuusuid)
 * @returns {Promise<{available:boolean, isActive:boolean, isDeleted:boolean, isEnabledInRepository:boolean}>}
 *   Si GAM no está disponible, available=false y los demás campos son null.
 */
async function getGAMUserStateByGUID(guid) {
  try {
    if (!guid || !GAM_CLIENT_ID || !GAM_CLIENT_SECRET) {
      return { available: false, isActive: null, isDeleted: null, isEnabledInRepository: null };
    }

    // 1) Obtener token admin vía client_credentials
    const tokenParams = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: GAM_CLIENT_ID,
      client_secret: GAM_CLIENT_SECRET,
    });

    let adminToken;
    try {
      const tokenResp = await axios.post(
        `${GAM_BASE_URL}/oauth/access_token`,
        tokenParams,
        { timeout: GAM_TIMEOUT, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      adminToken = tokenResp.data.access_token;
    } catch (tokenErr) {
      console.warn('⚠️  getGAMUserStateByGUID: no se pudo obtener token admin vía client_credentials:', tokenErr.message || tokenErr.error);
      return { available: false, isActive: null, isDeleted: null, isEnabledInRepository: null };
    }

    if (!adminToken) {
      return { available: false, isActive: null, isDeleted: null, isEnabledInRepository: null };
    }

    // 2) Consultar estado del usuario por GUID
    // GeneXus GAM expone el usuario por GUID en /rest/gam/user/{guid}
    const userResp = await axios.get(
      `${GAM_BASE_URL}/rest/gam/user/${encodeURIComponent(guid)}`,
      {
        timeout: GAM_TIMEOUT,
        headers: {
          'Authorization': `OAuth ${adminToken}`,
          'GeneXus-Agent': 'ExternalClient',
        }
      }
    );

    const u = userResp.data || {};
    // Normalizar campos con nombres posibles en distintas versiones GAM
    const isActive              = !!(u.IsActive              ?? u.isActive              ?? u.active              ?? true);
    const isDeleted             = !!(u.IsDeleted             ?? u.isDeleted             ?? u.deleted             ?? false);
    const isEnabledInRepository = !!(u.IsEnabledInRepository ?? u.isEnabledInRepository ?? u.enabledInRepository ?? true);

    console.log(`✅ getGAMUserStateByGUID [${guid}]:`, { isActive, isDeleted, isEnabledInRepository });
    return { available: true, isActive, isDeleted, isEnabledInRepository };

  } catch (error) {
    console.warn(`⚠️  getGAMUserStateByGUID [${guid}]: GAM no disponible o error:`, error.response?.status, error.message);
    return { available: false, isActive: null, isDeleted: null, isEnabledInRepository: null };
  }
}

module.exports = {
  registerUserGAM,
  loginGAM,
  getUserInfo,
  logoutGAM,
  validateUserGAM,
  changePasswordGAM,
  sendValidationCodeEmail,
  passwordRecoveryGAM,
  cancelRegistrationGAM,
  checkUserExistsInGAM,
  isGAMEnabled,
  refreshAccessToken,
  verifyTokenGAM,
  getGAMUserStateByGUID, // Estado usuario por GUID (WS_VALIDAR_AFILIADO)
  GAM_BASE_URL,
  GAM_CLIENT_ID
};
