import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { apiPost } from '../services/api'
import type { NavigationProp } from '@react-navigation/native'
import { useTheme } from '../theme'

export default function RegisterScreen({ navigation }: { navigation: NavigationProp<Record<string, object | undefined>> }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    telefono: '',
    cuil: '',
    dni: '',
    nroAfiliado: '',
    fechaNacimiento: '',
    sexo: '',
    cantidadIntegrantes: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const { colors } = useTheme()

  const handleRegister = async () => {
    try {
      // Validar campos requeridos
      if (!formData.fechaNacimiento || !formData.sexo || !formData.cantidadIntegrantes) {
        Alert.alert('Error', 'Por favor completa los campos requeridos: Fecha de Nacimiento, Sexo y Cantidad de Integrantes')
        return
      }

      if (!formData.cuil && !formData.dni && !formData.nroAfiliado) {
        Alert.alert('Error', 'Debes ingresar al menos uno: CUIL, DNI o N° de Afiliado')
        return
      }

      if (!formData.password || formData.password.length < 8) {
        Alert.alert('Error', 'La contraseña es requerida y debe tener al menos 8 caracteres (requerido por GAM)')
        return
      }

      if (formData.password !== formData.confirmPassword) {
        Alert.alert('Error', 'Las contraseñas no coinciden')
        return
      }

      if (!formData.email) {
        Alert.alert('Error', 'El email es requerido para el registro con GAM')
        return
      }

      setLoading(true)
      setStatusMsg('Validando con SOAP Beneficiarios...')

      // Convertir fecha de DD-MM-YYYY a DD/MM/YYYY para el backend
      const fechaBackend = formData.fechaNacimiento.replace(/-/g, '/')

      // Usar endpoint /register que hace el flujo completo: SOAP → GAM → PostgreSQL
      const response = await apiPost('/register', {
        email: formData.email,
        password: formData.password,
        dni: formData.dni || '',
        cuil: formData.cuil || '',
        nroAfiliado: formData.nroAfiliado || '',
        sexo: formData.sexo || 'M',
        fechaNacimiento: fechaBackend,
        cantidadIntegrantes: parseInt(formData.cantidadIntegrantes) || 1,
        telefono: formData.telefono || '',
        registracionconnroafiliado: formData.nroAfiliado ? 'S' : 'N',
        registracioncondni: formData.dni ? 'S' : 'N',
        registracionconcuil: formData.cuil ? 'S' : 'N'
      }, { timeoutMs: 60000 })

      setStatusMsg('Procesando respuesta...')

      Alert.alert(
        'Registro Exitoso',
        response.message || 'Tu usuario ha sido registrado. Ya puedes iniciar sesión.',
        [
          {
            text: 'Ir a Login',
            onPress: () => navigation.navigate('Login')
          }
        ]
      )

      // Limpiar formulario
      setFormData({
        firstName: '',
        lastName: '',
        cuil: '',
        dni: '',
        nroAfiliado: '',
        fechaNacimiento: '',
        sexo: '',
        cantidadIntegrantes: '',
        email: '',
        telefono: '',
        password: '',
        confirmPassword: ''
      })
    } catch (error: unknown) {
      console.error('Error al registrar:', error)
      const msg = (typeof error === 'object' && error !== null && 'message' in error) ? String((error as Record<string, unknown>)['message']) : String(error)
      if (msg === 'La solicitud excedió el tiempo límite') {
        Alert.alert('Timeout', 'El servicio tardó demasiado. Intenta nuevamente más tarde.')
      } else {
        Alert.alert('Error', msg || 'No se pudo completar el registro')
      }
    } finally {
      setLoading(false)
      setStatusMsg(null)
    }
  }

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.buttonPrimary }]}>
        <Text style={styles.title}>Registro de Afiliado</Text>
        <Text style={styles.subtitle}>Complete sus datos para registrarse</Text>
      </View>

      <View style={styles.form}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Identificación (al menos uno)</Text>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>CUIL</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.inputBorder, color: colors.inputText }]}
            placeholder="20-12345678-9"
            placeholderTextColor={colors.inputPlaceholder}
            value={formData.cuil}
            onChangeText={(text) => updateField('cuil', text)}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>DNI</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.inputBorder, color: colors.inputText }]}
            placeholder="12345678"
            placeholderTextColor={colors.inputPlaceholder}
            value={formData.dni}
            onChangeText={(text) => updateField('dni', text)}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>N° de Afiliado</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.inputBorder, color: colors.inputText }]}
            placeholder="123456789"
            placeholderTextColor={colors.inputPlaceholder}
            value={formData.nroAfiliado}
            onChangeText={(text) => updateField('nroAfiliado', text)}
            keyboardType="numeric"
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Datos Personales *</Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Fecha de Nacimiento * (DD-MM-YYYY)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.inputBorder, color: colors.inputText }]}
            placeholder="DD-MM-YYYY (ej: 19-07-1978)"
            placeholderTextColor={colors.inputPlaceholder}
            value={formData.fechaNacimiento}
            onChangeText={(text) => updateField('fechaNacimiento', text)}
            keyboardType="numeric"
          />
          <Text style={[styles.hint, { color: colors.textMuted }]}>Formato: DD-MM-YYYY (ejemplo: 19-07-1978)</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Sexo *</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={[styles.radioButton, { backgroundColor: colors.surface, borderColor: colors.inputBorder }, formData.sexo === 'M' && styles.radioButtonActive]}
              onPress={() => updateField('sexo', 'M')}
            >
              <Text style={[styles.radioText, { color: colors.textSecondary }, formData.sexo === 'M' && styles.radioTextActive]}>
                Masculino
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.radioButton, { backgroundColor: colors.surface, borderColor: colors.inputBorder }, formData.sexo === 'F' && styles.radioButtonActive]}
              onPress={() => updateField('sexo', 'F')}
            >
              <Text style={[styles.radioText, { color: colors.textSecondary }, formData.sexo === 'F' && styles.radioTextActive]}>
                Femenino
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Cantidad de Integrantes del Grupo Familiar *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.inputBorder, color: colors.inputText }]}
            placeholder="Ej: 3"
            placeholderTextColor={colors.inputPlaceholder}
            value={formData.cantidadIntegrantes}
            onChangeText={(text) => updateField('cantidadIntegrantes', text)}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Email *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.inputBorder, color: colors.inputText }]}
            placeholder="ejemplo@email.com"
            placeholderTextColor={colors.inputPlaceholder}
            value={formData.email}
            onChangeText={(text) => updateField('email', text)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Teléfono (opcional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.inputBorder, color: colors.inputText }]}
            placeholder="2612345678"
            placeholderTextColor={colors.inputPlaceholder}
            value={formData.telefono}
            onChangeText={(text) => updateField('telefono', text)}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Contraseña * (mínimo 8 caracteres)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.inputBorder, color: colors.inputText }]}
            placeholder="Mínimo 8 caracteres (requerido por GAM)"
            placeholderTextColor={colors.inputPlaceholder}
            value={formData.password}
            onChangeText={(text) => updateField('password', text)}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Confirmar Contraseña *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.inputBorder, color: colors.inputText }]}
            placeholder="Repite la contraseña"
            placeholderTextColor={colors.inputPlaceholder}
            value={formData.confirmPassword}
            onChangeText={(text) => updateField('confirmPassword', text)}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.buttonPrimary }, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator color="#fff" />
              <Text style={[styles.buttonText, { marginLeft: 12, fontWeight: '400' }]}>Espera...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Registrarse</Text>
          )}
        </TouchableOpacity>
        {statusMsg ? <Text style={[styles.statusMsg, { color: colors.textSecondary }]}>{statusMsg}</Text> : null}

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={[styles.linkText, { color: colors.primary }]}>¿Ya tienes cuenta? Inicia sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196f3',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#e3f2fd',
    textAlign: 'center',
    marginTop: 8,
  },
  form: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  radioButtonActive: {
    backgroundColor: '#2196f3',
    borderColor: '#2196f3',
  },
  radioText: {
    fontSize: 14,
    color: '#555',
  },
  radioTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#2196f3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    backgroundColor: '#90caf9',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#2196f3',
    fontSize: 14,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  statusMsg: {
    marginTop: 12,
    textAlign: 'center',
    color: '#555',
    fontSize: 13,
  },
})
