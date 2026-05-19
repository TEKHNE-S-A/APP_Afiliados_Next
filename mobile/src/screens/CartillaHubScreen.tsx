/**
 * CartillaHubScreen
 *
 * Pantalla central del módulo Cartilla.
 * Permite al usuario seleccionar entre:
 *   - Prestadores (médicos, clínicas, centros de salud)
 *   - Farmacias (con cobertura OSEP)
 *   - Delegaciones (oficinas OSEP)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import CurvedHeroHeader from '../components/CurvedHeroHeader';

interface CartillaHubScreenProps {
  navigation: any;
}

interface HubOption {
  key: string;
  screen: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  accentColor: string;
  title: string;
  subtitle: string;
  description: string;
  badge?: string;
}

const HUB_OPTIONS: HubOption[] = [
  {
    key: 'prestadores',
    screen: 'CartillaMap',
    icon: 'medical-outline',
    iconColor: '#4F46E5',
    iconBg: '#EEF2FF',
    accentColor: '#4F46E5',
    title: 'Prestadores',
    subtitle: 'Médicos y centros de salud',
    description: 'Encontrá clínicas, médicos, laboratorios y centros de salud con cobertura.',
    badge: 'Más buscado',
  },
  {
    key: 'farmacias',
    screen: 'FarmaciasMain',
    icon: 'bag-handle-outline',
    iconColor: '#EA580C',
    iconBg: '#FFF7ED',
    accentColor: '#EA580C',
    title: 'Farmacias',
    subtitle: 'Con cobertura OSEP',
    description: 'Farmacias adheridas donde podés usar tu credencial para descuentos y cobertura.',
  },
  {
    key: 'delegaciones',
    screen: 'DelegacionesMain',
    icon: 'business-outline',
    iconColor: '#16A34A',
    iconBg: '#F0FDF4',
    accentColor: '#16A34A',
    title: 'Delegaciones',
    subtitle: 'Oficinas OSEP',
    description: 'Oficinas y delegaciones donde podés realizar trámites y consultas presenciales.',
  },
];

export default function CartillaHubScreen({ navigation }: CartillaHubScreenProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.headerBackground }]} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <CurvedHeroHeader
        icon={<Ionicons name="location-outline" size={28} color="#FFFFFF" />}
        title="Cartilla"
        subtitle="Red de prestadores OSEP"
        backgroundColor={colors.headerBackground}
        waveBackgroundColor={colors.background}
        subtitleStyle={styles.heroSubtitleSpacing}
      />

      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={styles.intro}>
          <Text style={[styles.introText, { color: colors.textSecondary }]}>
            Seleccioná qué tipo de prestador necesitás buscar
          </Text>
        </View>

        {/* Cards */}
        {HUB_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[styles.card, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate(option.screen)}
            activeOpacity={0.75}
          >
            <View style={[styles.iconWrap, { backgroundColor: option.iconBg }]}>
              <Ionicons name={option.icon} size={24} color={option.iconColor} />
            </View>

            <View style={styles.cardText}>
              <View style={styles.cardTitleRow}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{option.title}</Text>
                {option.badge && (
                  <View style={[styles.badge, { backgroundColor: option.iconBg }]}>
                    <Text style={[styles.badgeText, { color: option.iconColor }]}>{option.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{option.subtitle}</Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color={colors.textMuted ?? colors.textSecondary} />
          </TouchableOpacity>
        ))}

        {/* Tip */}
        <View style={[styles.tipBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="location-outline" size={18} color="#2563EB" />
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>
            Cada sección muestra los prestadores más cercanos a tu ubicación actual.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroSubtitleSpacing: {
    marginBottom: 10,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  intro: {
    marginBottom: 16,
  },
  introText: {
    fontSize: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  cardText: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginTop: 4,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});


