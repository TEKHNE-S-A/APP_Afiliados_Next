# GAM Authentication Documentation
## OSEP SHEMA - Autenticación GAM

---

## Table of Contents

1. [Introduction](#introduction)
2. [What is GAM Authentication?](#what-is-gam-authentication)
3. [Environment Variables](#environment-variables)
4. [Authentication Flow](#authentication-flow)
5. [API Endpoints](#api-endpoints)
   - [1.1 Register New User](#11-register-new-user)
   - [1.2 Login GAM (Obtain Token)](#12-login-gam-obtain-token)
   - [1.3 Change Password](#13-change-password)
   - [1.4 Validate GAM User](#14-validate-gam-user)
   - [1.5 Get User Info](#15-get-user-info)
   - [1.6 Cancel Registration](#16-cancel-registration)
   - [1.7 Send Validation Code Email](#17-send-validation-code-email)
   - [1.8 Password Recovery](#18-password-recovery)
6. [Best Practices](#best-practices)
7. [Error Handling](#error-handling)
8. [Security Considerations](#security-considerations)

---

## Introduction

This documentation provides comprehensive information about the GAM (GeneXus Access Manager) Authentication system used in the OSEP SHEMA API. GAM is a robust authentication and authorization framework that manages user access, credentials, and security tokens across the application.

This guide covers all authentication endpoints, including user registration, login, password management, and user validation processes.

---

## What is GAM Authentication?

**GAM (GeneXus Access Manager)** is an enterprise-grade authentication and authorization system that provides:

- **User Management**: Registration, validation, and profile management
- **OAuth2 Authentication**: Secure token-based authentication
- **Password Management**: Change password and recovery functionality
- **Session Management**: Token-based session control
- **Security Features**: Email validation, CUIL/CUIT verification, and multi-factor authentication support

GAM integrates seamlessly with the OSEP SHEMA system to provide secure access to all API endpoints.

---

## Environment Variables

Before using the GAM Authentication endpoints, configure the following environment variables:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `baseUrl` | Base URL of the API server | `https://test17.osep.gob.ar/APP_OSEP_TEST` |
| `access_token` | OAuth2 access token (auto-populated after login) | `87a56d6d-edea-4507-a6c3-bf322228db93!...` |
| `usuarioId` | User ID (auto-populated after login) | `user-12345` |
| `nroAfiliado` | Affiliate number (if applicable) | `07-091994-00` |

**Note**: The `access_token` and `usuarioId` are automatically set after a successful login using the Login GAM endpoint.

---

## Authentication Flow

The typical authentication flow in the OSEP SHEMA system follows these steps:

```
┌─────────────────────────────────────────────────────────────┐
│                    GAM Authentication Flow                   │
└─────────────────────────────────────────────────────────────┘

1. NEW USER PATH:
   ┌──────────────────┐
   │ Register New User│ (1.1)
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ Send Validation  │ (1.7)
   │ Code Email       │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ Validate User    │ (1.4)
   └────────┬─────────┘
            │
            └──────────┐
                       │
2. EXISTING USER PATH: │
   ┌──────────────────┐│
   │ Login GAM        ││ (1.2) ← START HERE
   │ (Obtain Token)   ││
   └────────┬─────────┘│
            │◄─────────┘
            ▼
   ┌──────────────────┐
   │ Token Stored in  │
   │ Environment Vars │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ Access Protected │
   │ Endpoints        │
   └──────────────────┘

3. OPTIONAL OPERATIONS:
   
   ┌──────────────────┐     ┌──────────────────┐
   │ Get User Info    │     │ Change Password  │ (1.3)
   └──────────────────┘     └──────────────────┘
   
   ┌──────────────────┐     ┌──────────────────┐
   │ Password Recovery│     │ Cancel           │ (1.6)
   │                  │(1.8)│ Registration     │
   └──────────────────┘     └──────────────────┘
```

---

## API Endpoints

### 1.1 Register New User

**Endpoint**: `POST {{baseUrl}}/rest/Nucleo/NURegistroUsuario`

**Description**: Registers a new user in the GAM (GeneXus Access Manager) system. This endpoint creates a new user account with affiliate information and personal details.

**Authentication**: None required (public endpoint)

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "FormaReg": "APP",
  "RegistracionConNroAfiliado": "07-0....",
  "RegistracionConDocumento": "31....",
  "RegistracionConCUIL": "2031....",
  "SoyAfiliado": true,
  "UserName": "usuario@gmail.com",
  "Email": "usurio@gmail.com",
  "Telefono": "383488888",
  "FirstName": "JUAN CARLOS",
  "LastName": "PEREZ",
  "Password": "mipassword",
  "ConfirmPassword": "mipassword",
  "Sexo": "M",
  "TitularNro": "",
  "FechaNAcimiento": "1999-12-31",
  "NroAfiliado": "07-0....",
  "CanMiembrosFamiliar": 1
}
```

**Request Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `FormaReg` | string | Yes | Registration form type (e.g., "APP") |
| `RegistracionConNroAfiliado` | string | Yes | Affiliate number for registration |
| `RegistracionConDocumento` | string | Yes | Document number (DNI) |
| `RegistracionConCUIL` | string | Yes | CUIL number |
| `SoyAfiliado` | boolean | Yes | Indicates if user is an affiliate |
| `UserName` | string | Yes | Username (typically email) |
| `Email` | string | Yes | User's email address |
| `Telefono` | string | Yes | Phone number |
| `FirstName` | string | Yes | User's first name |
| `LastName` | string | Yes | User's last name |
| `Password` | string | Yes | User's password |
| `ConfirmPassword` | string | Yes | Password confirmation (must match Password) |
| `Sexo` | string | Yes | Gender (M/F) |
| `TitularNro` | string | No | Holder number (if applicable) |
| `FechaNAcimiento` | string | Yes | Date of birth (YYYY-MM-DD format) |
| `NroAfiliado` | string | Yes | Affiliate number |
| `CanMiembrosFamiliar` | integer | Yes | Number of family members |

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "userId": "generated-user-id"
}
```

**Post-Response Script**:
The endpoint includes a test script that logs successful registration:
```javascript
if (pm.response.code === 200) {
    var jsonData = pm.response.json();
    console.log('Usuario registrado exitosamente');
}
```

---

### 1.2 Login GAM (Obtain Token)

**Endpoint**: `POST {{baseUrl}}/oauth/access_token`

**Description**: Authenticates a user via OAuth2 and returns an access token. The token is automatically saved to environment variables for use in subsequent API calls. This is the primary authentication endpoint that must be called before accessing protected resources.

**Authentication**: None required (this endpoint provides authentication)

**Headers**:
```
Content-Type: application/x-www-form-urlencoded
```

**Request Body** (form-urlencoded):
```
grant_type=GAMLocal
scope=gam_user_data+gam_user_roles+gam_user_additional_data
client_id=c26AzH82zzA6U4CVE5...
client_secret=Qkz9ESBUq3GY2CcHXTm....
username=usuraio@gmail.com
password=mipassword
authentication_type_name=GAM_Remoto
```

**Request Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `grant_type` | string | Yes | OAuth2 grant type (use "GAMLocal") |
| `scope` | string | Yes | Requested scopes (user data, roles, additional data) |
| `client_id` | string | Yes | OAuth2 client identifier |
| `client_secret` | string | Yes | OAuth2 client secret |
| `username` | string | Yes | User's email/username |
| `password` | string | Yes | User's password |
| `authentication_type_name` | string | Yes | Authentication type (e.g., "GAM_Remoto") |

**Success Response** (200 OK):
```json
{
  "access_token": "87a56d6d-edea-4507-a6c3-bf322228db93!l2l8Lfrsmv2unlVlf2VdYUhyEnfmYyM....",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user_id": "user-12345",
  "scope": "gam_user_data gam_user_roles gam_user_additional_data"
}
```

**Post-Response Script**:
The endpoint automatically saves the token and user ID to environment variables:
```javascript
if (pm.response.code === 200) {
    var jsonData = pm.response.json();
    if (jsonData.access_token) {
        pm.environment.set('access_token', jsonData.access_token);
        console.log('Token guardado: ' + jsonData.access_token);
    }
    if (jsonData.user_id) {
        pm.environment.set('usuarioId', jsonData.user_id);
    }
}
```

**Important Notes**:
- This endpoint must be called first before accessing any protected endpoints
- The access token is automatically stored in the `access_token` environment variable
- All subsequent API calls will use this token via the collection-level Bearer authentication
- Tokens typically expire after a set period (check `expires_in` field)

---

### 1.3 Change Password

**Endpoint**: `POST {{baseUrl}}/rest/Nucleo/NUCambiaContrasenaUsuario`

**Description**: Allows an authenticated user to change their password. Requires the current password and the new password (with confirmation).

**Authentication**: Required (OAuth Bearer token)

**Headers**:
```
Content-Type: application/json
Authorization: OAuth {{access_token}}
```

**Request Body**:
```json
{
  "isPasswordExpired": 0,
  "UserName": "usuario@gmail.com",
  "UserPassword": "mipassword",
  "UserPasswordNew": "nuevapassword",
  "UserPasswordNewConf": "nuevapassword"
}
```

**Request Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `isPasswordExpired` | integer | Yes | Flag indicating if password is expired (0 or 1) |
| `UserName` | string | Yes | Username/email of the user |
| `UserPassword` | string | Yes | Current password |
| `UserPasswordNew` | string | Yes | New password |
| `UserPasswordNewConf` | string | Yes | New password confirmation (must match UserPasswordNew) |

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Contraseña cambiada exitosamente"
}
```

**Error Response** (400 Bad Request):
```json
{
  "success": false,
  "error": "Las contraseñas no coinciden"
}
```

**Important Notes**:
- The new password must meet the system's password complexity requirements
- `UserPasswordNew` and `UserPasswordNewConf` must match exactly
- The current password (`UserPassword`) must be correct
- User must be authenticated with a valid OAuth token

---

### 1.4 Validate GAM User

**Endpoint**: `POST {{baseUrl}}/rest/Nucleo/NUValidoUsuario`

**Description**: Validates if a user exists and is active in the GAM system. This endpoint is typically used during the registration process to verify user information before completing registration.

**Authentication**: None required (public endpoint)

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "FormaReg": "APP",
  "RegistracionConNroAfiliado": "07-0...",
  "RegistracionConDocumento": "31...",
  "RegistracionConCUIL": "2031...",
  "SoyAfiliado": true,
  "Sexo": "M",
  "TitularNro": "",
  "FechaNAcimiento": "1999-12-31",
  "NroAfiliado": "07-0...",
  "CanMiembrosFamiliar": 1
}
```

**Request Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `FormaReg` | string | Yes | Registration form type |
| `RegistracionConNroAfiliado` | string | Yes | Affiliate number for validation |
| `RegistracionConDocumento` | string | Yes | Document number (DNI) |
| `RegistracionConCUIL` | string | Yes | CUIL number |
| `SoyAfiliado` | boolean | Yes | Indicates if user is an affiliate |
| `Sexo` | string | Yes | Gender (M/F) |
| `TitularNro` | string | No | Holder number |
| `FechaNAcimiento` | string | Yes | Date of birth (YYYY-MM-DD) |
| `NroAfiliado` | string | Yes | Affiliate number |
| `CanMiembrosFamiliar` | integer | Yes | Number of family members |

**Success Response** (200 OK):
```json
{
  "valid": true,
  "message": "Usuario válido",
  "userExists": true,
  "isActive": true
}
```

**Error Response** (400 Bad Request):
```json
{
  "valid": false,
  "message": "Usuario no encontrado o inactivo"
}
```

---

### 1.5 Get User Info

**Endpoint**: `GET {{baseUrl}}/oauth/userinfo`

**Description**: Retrieves detailed information about the currently authenticated user. This endpoint returns user profile data, roles, and additional information based on the OAuth token.

**Authentication**: Required (OAuth Bearer token)

**Headers**:
```
Authorization: OAuth {{access_token}}
GeneXus-Agent: ExternalClient
```

**Request Body**: None (GET request)

**Success Response** (200 OK):
```json
{
  "user_id": "user-12345",
  "username": "usuario@gmail.com",
  "email": "usuario@gmail.com",
  "first_name": "JUAN CARLOS",
  "last_name": "PEREZ",
  "roles": ["user", "affiliate"],
  "additional_data": {
    "nroAfiliado": "07-0...",
    "telefono": "383488888"
  }
}
```

**Important Notes**:
- Requires a valid OAuth access token
- The `GeneXus-Agent: ExternalClient` header is required for proper API identification
- Returns user data based on the scopes granted during authentication
- Useful for retrieving current user context in applications

---

### 1.6 Cancel Registration

**Endpoint**: `POST {{baseUrl}}/rest/Nucleo/NUAnulaRegistracion`

**Description**: Cancels or revokes a user registration. This endpoint can be used to deactivate a user account or cancel a pending registration.

**Authentication**: Required (OAuth Bearer token)

**Headers**:
```
Authorization: OAuth {{access_token}}
```

**Request Body**: None

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Registro anulado exitosamente"
}
```

**Error Response** (400 Bad Request):
```json
{
  "success": false,
  "error": "No se pudo anular el registro"
}
```

**Important Notes**:
- Requires authentication with a valid OAuth token
- This action may be irreversible depending on system configuration
- Use with caution as it may permanently deactivate the user account

---

### 1.7 Send Validation Code Email

**Endpoint**: `POST {{baseUrl}}/rest/Nucleo/NUEnvioMailValidacion`

**Description**: Sends a validation code to the user's email address. This is typically used during the registration process or for two-factor authentication.

**Authentication**: None required (public endpoint)

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "ModoTest": 0,
  "EnviarToken": 0,
  "UsuaMai": "mail@usuario.com",
  "CodigoValidacion": 1234
}
```

**Request Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ModoTest` | integer | Yes | Test mode flag (0 = production, 1 = test) |
| `EnviarToken` | integer | Yes | Flag to send token (0 = no, 1 = yes) |
| `UsuaMai` | string | Yes | User's email address |
| `CodigoValidacion` | integer | Yes | Validation code to send |

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Código de validación enviado exitosamente",
  "emailSent": true
}
```

**Error Response** (400 Bad Request):
```json
{
  "success": false,
  "error": "Error al enviar el correo electrónico"
}
```

**Important Notes**:
- The validation code should be generated securely on the server side
- In production, set `ModoTest` to 0
- The email must be a valid, registered email address
- Validation codes typically expire after a set period

---

### 1.8 Password Recovery

**Endpoint**: `POST {{baseUrl}}/rest/Nucleo/NUEnvioMailRecuPassword`

**Description**: Initiates the password recovery process by sending a password reset link or code to the user's registered email address.

**Authentication**: None required (public endpoint)

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "UsuaMail": "mail@usuario.com"
}
```

**Request Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `UsuaMail` | string | Yes | User's registered email address |

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Correo de recuperación enviado exitosamente",
  "emailSent": true
}
```

**Error Response** (404 Not Found):
```json
{
  "success": false,
  "error": "Email no encontrado en el sistema"
}
```

**Important Notes**:
- The email must be registered in the system
- A password reset link or code will be sent to the provided email
- Reset links typically expire after a set period (e.g., 24 hours)
- For security, the response should not reveal whether the email exists in the system

---

## Best Practices

### 1. Token Management
- **Store tokens securely**: Never expose access tokens in client-side code or logs
- **Token refresh**: Implement token refresh logic before expiration
- **Token revocation**: Revoke tokens when users log out or when security is compromised

### 2. Password Security
- **Strong passwords**: Enforce minimum password complexity requirements
  - Minimum 8 characters
  - Mix of uppercase, lowercase, numbers, and special characters
- **Password hashing**: Ensure passwords are hashed on the server side (never store plain text)
- **Password expiration**: Consider implementing password expiration policies

### 3. Registration Flow
1. Validate user data before registration (use endpoint 1.4)
2. Register the user (endpoint 1.1)
3. Send validation code (endpoint 1.7)
4. Verify the validation code
5. Complete registration

### 4. Authentication Flow
1. Call Login GAM endpoint (1.2) with user credentials
2. Store the returned `access_token` securely
3. Include the token in all subsequent API requests
4. Handle token expiration gracefully

### 5. Error Handling
- Implement proper error handling for all endpoints
- Provide user-friendly error messages
- Log errors for debugging (without exposing sensitive data)
- Implement retry logic for transient failures

### 6. Security Considerations
- **HTTPS only**: Always use HTTPS in production
- **Rate limiting**: Implement rate limiting to prevent brute force attacks
- **Input validation**: Validate all input data on both client and server side
- **CORS**: Configure CORS properly to prevent unauthorized access

### 7. Testing
- Test all authentication flows in a staging environment
- Use the `ModoTest` flag for testing email functionality
- Verify token expiration and refresh mechanisms
- Test error scenarios (invalid credentials, expired tokens, etc.)

---

## Error Handling

### Common HTTP Status Codes

| Status Code | Description | Common Causes |
|-------------|-------------|---------------|
| 200 | Success | Request completed successfully |
| 400 | Bad Request | Invalid request parameters or malformed JSON |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource not found (e.g., user doesn't exist) |
| 500 | Internal Server Error | Server-side error |

### Error Response Format

All error responses follow this general format:

```json
{
  "success": false,
  "error": "Error message description",
  "errorCode": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common Error Scenarios

#### 1. Invalid Credentials (Login)
```json
{
  "success": false,
  "error": "Credenciales inválidas",
  "errorCode": "INVALID_CREDENTIALS"
}
```

#### 2. Token Expired
```json
{
  "success": false,
  "error": "Token expirado",
  "errorCode": "TOKEN_EXPIRED"
}
```

#### 3. User Already Exists (Registration)
```json
{
  "success": false,
  "error": "El usuario ya existe",
  "errorCode": "USER_ALREADY_EXISTS"
}
```

#### 4. Password Mismatch
```json
{
  "success": false,
  "error": "Las contraseñas no coinciden",
  "errorCode": "PASSWORD_MISMATCH"
}
```

#### 5. Invalid Email Format
```json
{
  "success": false,
  "error": "Formato de email inválido",
  "errorCode": "INVALID_EMAIL_FORMAT"
}
```

---

## Security Considerations

### 1. OAuth2 Security
- **Client credentials**: Keep `client_id` and `client_secret` confidential
- **Token storage**: Store tokens securely (use secure storage mechanisms)
- **Token transmission**: Always transmit tokens over HTTPS
- **Token scope**: Request only the minimum required scopes

### 2. Password Security
- **Minimum complexity**: Enforce strong password requirements
- **Hashing**: Use strong hashing algorithms (bcrypt, Argon2)
- **Salt**: Always use unique salts for each password
- **No plain text**: Never store or transmit passwords in plain text

### 3. Data Protection
- **PII protection**: Protect personally identifiable information (PII)
- **CUIL/CUIT**: Handle national identification numbers securely
- **Email addresses**: Validate and sanitize email addresses
- **Phone numbers**: Validate phone number formats

### 4. API Security
- **Rate limiting**: Implement rate limiting on authentication endpoints
  - Login: 5 attempts per 15 minutes
  - Registration: 3 attempts per hour
  - Password recovery: 3 attempts per hour
- **CAPTCHA**: Consider implementing CAPTCHA for public endpoints
- **IP blocking**: Block suspicious IP addresses after repeated failures

### 5. Session Management
- **Token expiration**: Set reasonable token expiration times (e.g., 1 hour)
- **Refresh tokens**: Implement refresh token mechanism for long-lived sessions
- **Logout**: Properly invalidate tokens on logout
- **Concurrent sessions**: Consider limiting concurrent sessions per user

### 6. Audit and Monitoring
- **Logging**: Log all authentication attempts (success and failure)
- **Monitoring**: Monitor for suspicious patterns (brute force, credential stuffing)
- **Alerts**: Set up alerts for security events
- **Audit trail**: Maintain an audit trail of user actions

### 7. Compliance
- **GDPR**: Ensure compliance with data protection regulations
- **Data retention**: Implement appropriate data retention policies
- **User consent**: Obtain proper user consent for data processing
- **Right to deletion**: Implement user data deletion mechanisms

---

## Appendix

### A. OAuth2 Scopes

The following scopes are available in the GAM authentication system:

| Scope | Description |
|-------|-------------|
| `gam_user_data` | Access to basic user profile data |
| `gam_user_roles` | Access to user roles and permissions |
| `gam_user_additional_data` | Access to additional user information (affiliate data, etc.) |

### B. Date Format

All date fields use the ISO 8601 format: `YYYY-MM-DD`

Example: `1985-04-05` (April 5, 1985)

### C. Gender Codes

| Code | Description |
|------|-------------|
| `M` | Male (Masculino) |
| `F` | Female (Femenino) |

### D. Contact Information

For technical support or questions about the GAM Authentication system, please contact:

- **Technical Support**: support@osep.gob.ar
- **API Documentation**: https://api.osep.gob.ar/docs
- **Developer Portal**: https://developers.osep.gob.ar

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024 | Initial documentation release |

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**API Version**: OSEP_SHEMA_PREPRO_U9.v18

---

*This documentation is maintained by the OSEP SHEMA development team. For updates or corrections, please submit a request through the developer portal.*
