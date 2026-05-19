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
} from 'react-native'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../theme'
import type { NavigationProp } from '@react-navigation/native'
import { getErrorMessage } from '../utils/errorUtils'
import { APP_VERSION_LABEL } from '../utils/version'

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
      setError('Por favor completa todos los campos')
      return
    }

    try {
      await signIn(username, password)
      // No navegamos manualmente; RootNavigator cambiará al stack autenticado
    } catch (e: unknown) {
      const errorMessage = getErrorMessage(e, 'No se pudo iniciar sesión. Intentá nuevamente.')
      setError(errorMessage)
      Alert.alert('Error al iniciar sesión', errorMessage)
    }
  }

  const handleRecoverPassword = () => {
    navigation.navigate('ForgotPassword')
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.header, { backgroundColor: colors.headerBackground }]}>
          <Text style={[styles.title, { color: colors.textOnPrimary }]}>Bienvenido</Text>
          <Text style={[styles.subtitle, { color: colors.textOnPrimaryMuted }]}>Obra Social - Afiliados</Text>
        </View>

        <View style={styles.form}>
          {error ? <Text style={[styles.error, { backgroundColor: colors.error, borderColor: colors.errorDark }]}>{error}</Text> : null}

          <TextInput
            placeholder="CUIL, DNI o Email"
            placeholderTextColor={colors.inputPlaceholder}
            style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <TextInput
            placeholder="Contraseña"
            placeholderTextColor={colors.inputPlaceholder}
            secureTextEntry
            style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]}
            value={password}
            onChangeText={setPassword}
          />

          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          ) : (
            <>
              <TouchableOpacity style={[styles.button, { backgroundColor: colors.buttonPrimary }]} onPress={onSubmit}>
                <Text style={[styles.buttonText, { color: colors.buttonPrimaryText }]}>Iniciar Sesión</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkButton} onPress={handleRecoverPassword}>
                <Text style={[styles.linkText, { color: colors.primary }]}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.textMuted }]}>o</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>

              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary, { borderColor: colors.primary, backgroundColor: 'transparent' }]}
                onPress={() => navigation.navigate('Register')}
              >
                <Text style={[styles.buttonText, { color: colors.primary }]}>Registrarse</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={[styles.versionFooter, { color: colors.textMuted }]}>{APP_VERSION_LABEL}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: '#2196f3',
    padding: 40,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#e3f2fd',
  },
  form: {
    padding: 20,
    marginTop: 20,
  },
  input: { 
    backgroundColor: '#fff',
    borderWidth: 1, 
    borderColor: '#ddd', 
    padding: 14, 
    marginBottom: 12, 
    borderRadius: 8,
    fontSize: 16,
  },
  sectionLabel: {
    color: '#666',
    marginTop: 4,
    marginBottom: 8,
  },
  error: { 
    backgroundColor: '#f44336',
    color: '#fff',
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 0,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    borderWidth: 2,
    borderColor: '#d32f2f',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loader: {
    marginVertical: 20,
  },
  button: {
    backgroundColor: '#2196f3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#2196f3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonTextSecondary: {
    color: '#2196f3',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#2196f3',
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14,
  },
  versionFooter: {
    textAlign: 'center',
    fontSize: 12,
    color: '#bbb',
    paddingVertical: 20,
    letterSpacing: 0.5,
  },
})

