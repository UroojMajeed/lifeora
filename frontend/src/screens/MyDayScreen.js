import AuditScreen from './onboarding/AuditScreen';

/**
 * The Routine tab: your routine exactly as in onboarding's audit (totals, Add another task, and each
 * task's card to rename or change its Time, Money and Energy), saved as you go. No matrix here.
 */
export default function MyDayScreen(props) {
  return <AuditScreen {...props} inTab />;
}
