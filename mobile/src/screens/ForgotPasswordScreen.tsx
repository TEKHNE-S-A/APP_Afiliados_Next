import React, { useState, useRef, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { apiPost } from '../services/api'
import type { NavigationProp } from '@react-navigation/native'
import { useTheme } from '../theme'
import { getErrorMessage } from '../utils/errorUtils'

type Step = 'email' | 'code' | 'password' | 'success'

export default function ForgotPasswordScreen({ navigation }: { navigation: NavigationProp<any> }) {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null)
  const { colors } = useTheme()
  const codeInputRef = useRef<TextInput>(null)
  const passwordInputRef = useRef<TextInput>(null)

  // Countdown para reenvío de código
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  // Paso 1: Solicitar código de recuperación
  const handleRequestCode = async () => {
    setError(null)
    if (!email) { setError('Ingresá tu email'); return }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) { setError('Ingresá un email válido'); return }

    setLoading(true)
    try {
      await apiPost('/auth/recover-password', { email: email.trim() })
      setStep('code')
      setCountdown(120) // 2 min para reenvío
      setTimeout(() => codeInputRef.current?.focus(), 300)
    } catch (err: any) {
      setError(getErrorMessage(err, 'No se pudo procesar la solicitud.'))
    } finally {
      setLoading(false)
    }
  }

  // Paso 2: Verificar código
  const handleVerifyCode = async () => {
    setError(null)
    if (!code || code.length !== 6) { setError('Ingresá el código de 6 dígitos'); return }

    setLoading(true)
    try {
      const res = await apiPost('/auth/verify-recovery-code', { email: email.trim(), code: code.trim() })
      setResetToken(res.resetToken)
      setStep('password')
      setRemainingAttempts(null)
      setTimeout(() => passwordInputRef.current?.focus(), 300)
    } catch (err: any) {
      if (err.data?.remainingAttempts !== undefined) {
        setRemainingAttempts(err.data.remainingAttempts)
      }
      if (err.data?.error === 'EXPIRED' || err.data?.error === 'TOO_MANY_ATTEMPTS') {
        setError(err.data?.message || 'Código expirado. Solicitá uno nuevo.')
        setStep('email')
        setCode('')
      } else {
        setError(getErrorMessage(err, 'Código incorrecto.'))
      }
    } finally {
      setLoading(false)
    }
  }

  // Paso 3: Establecer nueva contraseña
  const handleResetPassword = async () => {
    setError(null)
    if (!newPassword || newPassword.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (newPassword !== confirmPassword) { setError('Las contraseñas no coinciden'); return }

    setLoading(true)
    try {
      await apiPost('/auth/reset-password', { email: email.trim(), resetToken, newPassword })
      setStep('success')
    } catch (err: any) {
      if (err.data?.error === 'INVALID_TOKEN') {
        setError('El token expiró. Iniciá el proceso nuevamente.')
        setStep('email')
        setCode('')
        setResetToken('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setError(getErrorMessage(err, 'No se pudo cambiar la contraseña.'))
      }
    } finally {
      setLoading(false)
    }
  }

  // Reenviar código
  const handleResendCode = async () => {
    if (countdown > 0) return
    setError(null)
    setCode('')
    setLoading(true)
    try {
      await apiPost('/auth/recover-password', { email: email.trim() })
      setCountdown(120)
      setRemainingAttempts(null)
      Alert.alert('Código reenviado', 'Revisá tu correo electrónico.')
    } catch (err: any) {
      setError('No se pudo reenviar el código.')
    } finally {
      setLoading(false)
    }
  }

  const renderStepIndicator = () => {
    const steps = ['Email', 'Código', 'Contraseña']
    const currentIdx = step === 'email' ? 0 : step === 'code' ? 1 : step === 'password' ? 2 : 3
    return (
      <View style={styles.stepIndicator}>
        {steps.map((label, idx) => (
          <View key={label} style={styles.stepItem}>
            <View style={[
              styles.stepCircle,
              { backgroundColor: idx <= currentIdx ? colors.primary : colors.inputBorder },
            ]}>
              <Text style={styles.stepNumber}>{idx < currentIdx ? '✓' : idx + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, { color: idx <= currentIdx ? colors.primary : colors.textSecondary }]}>{label}</Text>
          </View>
        ))}
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.surface }]} keyboardShouldPersistTaps="handled">
        {step !== 'success' && renderStepIndicator()}

        {/* ========== PASO 1: EMAIL ========== */}
        {step === 'email' && (
          <>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Recuperar Contraseña</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Ingresá tu email registrado y te enviaremos un código de verificación.
              </Text>
            </View>
            <View style={styles.form}>
              <TextInput
                placeholder="Email"
                placeholderTextColor={colors.inputPlaceholder}
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                editable={!loading}
                onSubmitEditing={handleRequestCode}
                returnKeyType="send"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {loading ? <ActivityIndicator size="large" color={colors.primary} style={styles.loader} /> : (
                <>
                  <TouchableOpacity style={[styles.button, { backgroundColor: colors.buttonPrimary }]} onPress={handleRequestCode}>
                    <Text style={styles.buttonText}>Enviar Código</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.linkButton} onPress={() => navigation.goBack()}>
                    <Text style={[styles.linkText, { color: colors.primary }]}>Volver al Login</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}

        {/* ========== PASO 2: CÓDIGO ========== */}
        {step === 'code' && (
          <>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Verificar Código</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Ingresá el código de 6 dígitos que enviamos a tu correo electrónico.
              </Text>
            </View>
            <View style={styles.form}>
              <TextInput
                ref={codeInputRef}
                placeholder="Código de 6 dígitos"
                placeholderTextColor={colors.inputPlaceholder}
                style={[styles.codeInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]}
                value={code}
                onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                editable={!loading}
                onSubmitEditing={handleVerifyCode}
                returnKeyType="send"
                textAlign="center"
              />
              {remainingAttempts !== null && remainingAttempts < 5 && (
                <Text style={styles.warning}>Intentos restantes: {remainingAttempts}</Text>
              )}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {loading ? <ActivityIndicator size="large" color={colors.primary} style={styles.loader} /> : (
                <>
                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.buttonPrimary }, code.length !== 6 && styles.buttonDisabled]}
                    onPress={handleVerifyCode}
                    disabled={code.length !== 6}
                  >
                    <Text style={styles.buttonText}>Verificar Código</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.resendButton, countdown > 0 && { opacity: 0.5 }]}
                    onPress={handleResendCode}
                    disabled={countdown > 0}
                  >
                    <Text style={[styles.linkText, { color: colors.primary }]}>
                      {countdown > 0 ? `Reenviar código (${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')})` : 'Reenviar código'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.linkButton} onPress={() => { setStep('email'); setCode(''); setError(null) }}>
                    <Text style={[styles.linkText, { color: colors.textSecondary }]}>Cambiar email</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}

        {/* ========== PASO 3: NUEVA CONTRASEÑA ========== */}
        {step === 'password' && (
          <>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Nueva Contraseña</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Ingresá tu nueva contraseña. Debe tener al menos 6 caracteres.
              </Text>
            </View>
            <View style={styles.form}>
              <TextInput
                ref={passwordInputRef}
                placeholder="Nueva contraseña"
                placeholderTextColor={colors.inputPlaceholder}
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                editable={!loading}
                returnKeyType="next"
              />
              <TextInput
                placeholder="Confirmar contraseña"
                placeholderTextColor={colors.inputPlaceholder}
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                editable={!loading}
                onSubmitEditing={handleResetPassword}
                returnKeyType="send"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {loading ? <ActivityIndicator size="large" color={colors.primary} style={styles.loader} /> : (
                <TouchableOpacity style={[styles.button, { backgroundColor: colors.buttonPrimary }]} onPress={handleResetPassword}>
                  <Text style={styles.buttonText}>Cambiar Contraseña</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* ========== ÉXITO ========== */}
        {step === 'success' && (
          <View style={styles.successContainer}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={[styles.title, { color: colors.textPrimary, textAlign: 'center' }]}>¡Contraseña Restablecida!</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, textAlign: 'center', marginBottom: 30 }]}>
              Tu contraseña fue actualizada exitosamente. Ya podés iniciar sesión con tu nueva contraseña.
            </Text>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.buttonPrimary }]} onPress={() => navigation.goBack()}>
              <Text style={styles.buttonText}>Ir al Login</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 10,
    gap: 20,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  header: {
    marginTop: 30,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  codeInput: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 18,
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 10,
    marginBottom: 15,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    padding: 12,
    alignItems: 'center',
    marginTop: 15,
  },
  resendButton: {
    padding: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  error: {
    color: '#f44336',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  warning: {
    color: '#FF9800',
    fontSize: 13,
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  loader: {
    marginVertical: 20,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 80,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
})
