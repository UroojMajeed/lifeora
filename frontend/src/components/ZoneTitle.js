import { Text } from 'react-native';
import { DRIP } from '../constants/content';
import { useTheme } from '../theme/ThemeContext';

/**
 * "You live in Production", or "You're split between Delegation and Production" when two or more
 * quadrants hold the same (largest) share of your hours. `summary` comes from summarizeSchedule().
 */
export default function ZoneTitle({ summary, style }) {
  const { colors } = useTheme();
  const zones = summary?.tied?.length ? summary.tied : summary?.dominant ? [summary.dominant] : [];
  if (!zones.length) return null;

  const name = (key, i) => (
    <Text key={key} style={{ color: colors[DRIP[key].color] }}>
      {i > 0 ? (i === zones.length - 1 ? ' and ' : ', ') : ''}
      {DRIP[key].name}
    </Text>
  );

  return (
    <Text style={style}>
      {zones.length > 1 ? "You're split between " : 'You live in '}
      {zones.map(name)}
    </Text>
  );
}
