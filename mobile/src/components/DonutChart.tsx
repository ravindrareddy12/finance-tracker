import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '@/theme';

export interface DonutSegment { key: string; value: number; color: string }

export function DonutChart({ segments, size = 180, stroke = 26, centerLabel, centerValue }: {
  segments: DonutSegment[]; size?: number; stroke?: number; centerLabel?: string; centerValue?: string;
}) {
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);
  let offset = 0;
  return (
    <View style={{ width: size, height: size }} accessibilityLabel="Portfolio allocation chart">
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={r} stroke="#F1F5F9" strokeWidth={stroke} fill="none" />
        {total > 0 && segments.map(seg => {
          const len = (seg.value / total) * circ;
          const el = (
            <Circle key={seg.key} cx={c} cy={c} r={r} stroke={seg.color} strokeWidth={stroke} fill="none"
              strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-offset} rotation={-90} origin={`${c}, ${c}`} />
          );
          offset += len;
          return el;
        })}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        {centerLabel ? <Text style={styles.label}>{centerLabel}</Text> : null}
        {centerValue ? <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>{centerValue}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  label:  { fontSize: 12, color: colors.textMuted },
  value:  { fontSize: 17, fontWeight: '700', color: colors.text },
});
