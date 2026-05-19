/**
 * LoginScreen — OSEP
 *
 * TODO: Implementar el diseño visual de OSEP.
 *       La lógica de autenticación ya está completa (useAuth).
 */
import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../theme'
import type { NavigationProp } from '@react-navigation/native'
import { getErrorMessage } from '../../utils/errorUtils'
import { APP_VERSION_LABEL } from '../../utils/version'

export default function LoginScreen({ navigation }: { navigation: NavigationProp<Record<string, object | undefined>> }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { signIn, loading } = useAuth()
  const { colors } = useTheme()

  const onSubmit = async () => {
    setError(null)
    Keyboard.dismiss()
    if (!username || !password) {
      setError('Por favor completá todos los campos')
      return
    }
    try {
      await signIn(username, password)
    } catch (e: unknown) {
      const msg = getErrorMessage(e, 'No se pudo iniciar sesión. Intentá nuevamente.')
      setError(msg)
      Alert.alert('Error al iniciar sesión', msg)
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <Image source={require('../../../assets/branding/osep-logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.headerTitle, { color: colors.textOnPrimary }]}>OSEP</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textOnPrimaryMuted }]}>
            Obra Social de Empleados Públicos
          </Text>
        </View>

        {/* ----------------------------------------------------------------
            TODO OSEP: Rediseñar el formulario de login según el design system OSEP.
        ---------------------------------------------------------------- */}
        <View style={[styles.form, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Email / DNI / N° de Afiliado
          </Text>
          <TextInput
            style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground, color: colors.inputText }]}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Ingresá tu usuario"
            placeholderTextColor={colors.inputPlaceholder}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Contraseña</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground, color: colors.inputText }]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Ingresá tu contraseña"
            placeholderTextColor={colors.inputPlaceholder}
          />

          {error ? (
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.buttonPrimary }, loading && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={colors.buttonPrimaryText} />
              : <Text style={[styles.buttonText, { color: colors.buttonPrimaryText }]}>Ingresar</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={[styles.link, { color: colors.primary }]}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={[styles.link, { color: colors.primary }]}>¿No tenés cuenta? Registrate</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.version, { color: colors.textMuted }]}>{APP_VERSION_LABEL}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1 },
  header: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 48,
    paddingHorizontal: 24,
  },
  logo: { width: 140, height: 60, marginBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: '700', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 14, marginTop: 4, textAlign: 'center' },
  form: {
    margin: 24,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 4,
  },
  errorText: { fontSize: 13, marginTop: 8, marginBottom: 4 },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontSize: 16, fontWeight: '700' },
  linkRow: { alignItems: 'center', marginTop: 14 },
  link: { fontSize: 14, fontWeight: '500' },
  version: { textAlign: 'center', fontSize: 11, marginBottom: 24, marginTop: 8 },
})
