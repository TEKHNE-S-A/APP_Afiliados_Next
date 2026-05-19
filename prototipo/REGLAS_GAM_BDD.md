# GitHub Copilot – Implementation Rules
## Mobile Affiliates Application
### GeneXus 18 + External GAM + Beneficiaries SOAP

This document defines mandatory rules for GitHub Copilot code generation.
Copilot must implement exactly what is described here.

---

## 1. Architecture

- Authentication and session management are handled by External GAM.
- Application database stores user data (NUUsuari).
- Beneficiary data must be validated against the Beneficiaries SOAP service.

---

## 2. Registration and Login

### 2.1 User exists in GAM but not in Application Database

- Create user record in application database.
- Use registration form data validated against Beneficiaries SOAP.
- Set NUUsuId with the UserId provided by External GAM.
- Do NOT create a new user in GAM.

---

### 2.2 User does not exist in GAM

- Allow full registration using form data.
- Create user in External GAM.
- Create corresponding records in application database (NUUsuari).

---

## 3. Session Management

- Session is managed by External GAM.
- Closing the app does NOT close the session.
- Session ends only when:
  - User logs out from Profile menu.
  - GAM invalidates the session.

- On application startup:
  - If a valid session exists → bypass login using cached data.
  - If no session exists → show login screen.

---

## 4. Password Recovery

- Password recovery must be available on login screen.
- Send recovery email to address registered in GAM / NUUsuari.
- Display masked email:
  - First 3 characters visible.
  - Domain visible from '@'.
  - Example: mar***@domain.com

---

## 5. Registration Validations

- Do not allow duplicate emails for different users.
- If email belongs to the same user:
  - Inform that a previous registration already exists.

---

## 6. Account Deactivation

- Account deactivation must be:
  - Logical in application database (set deactivation date in NUUsuari).
  - Complete deletion in External GAM.
- Do not physically delete application records.

---

## 7. Constraints

- Do not add features.
- Do not infer unspecified behavior.
- Implement exactly what is described.
