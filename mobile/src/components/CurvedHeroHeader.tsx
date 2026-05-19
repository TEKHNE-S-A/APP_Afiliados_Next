import React from 'react'
import { View, Text, StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'

interface CurvedHeroHeaderProps {
  icon: React.ReactNode
  title: string
  subtitle?: string
  backgroundColor: string
  waveBackgroundColor: string
  titleStyle?: StyleProp<TextStyle>
  subtitleStyle?: StyleProp<TextStyle>
  headerStyle?: StyleProp<ViewStyle>
  waveStyle?: StyleProp<ViewStyle>
  children?: React.ReactNode
}

export default function CurvedHeroHeader({
  icon,
  title,
  subtitle,
  backgroundColor,
  waveBackgroundColor,
  titleStyle,
  subtitleStyle,
  headerStyle,
  waveStyle,
  children,
}: CurvedHeroHeaderProps) {
  return (
    <>
      <View style={[styles.header, { backgroundColor }, headerStyle]}>
        <View style={styles.iconWrap}>{icon}</View>
        <Text style={[styles.title, titleStyle]}>{title}</Text>
        {!!subtitle && <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text>}
        {children}
      </View>
      <View style={[styles.wave, { backgroundColor: waveBackgroundColor }, waveStyle]} />
    </>
  )
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 34,
  },
  iconWrap: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 2,
    textAlign: 'center',
  },
  wave: {
    height: 36,
    marginTop: -36,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    marginBottom: -2,
  },
})
