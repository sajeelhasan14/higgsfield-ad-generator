// The advice for one running paid ad. Pause and increase can be accepted; wait and keep are only information.
import { acceptRecommendationAction, notNowRecommendationAction } from '@/app/(dashboard)/meta-ads/actions';
import { ActionButton } from '@/components/ActionButton';
import type { Recommendation } from '@/lib/autopilot/rules';

export function RecommendationBox({ paidAdId, advice }: { paidAdId: string; advice: Recommendation }) {
  if (advice.kind === 'wait' || advice.kind === 'keep') return <p className="mt-2 text-xs text-muted">Advice: {advice.reason}</p>;

  const fields = { paidAdId, kind: advice.kind };
  const pause = advice.kind === 'pause';
  return (
    <div className={`mt-3 flex flex-col gap-3 rounded-xl border p-3 ${pause ? 'border-red-200 bg-red-50' : 'border-teal-200 bg-teal-50'}`}>
      <p className={`text-sm ${pause ? 'text-red-700' : 'text-teal-800'}`}>
        <span className="font-semibold">{pause ? 'Advice: pause this ad.' : 'Advice: increase the budget.'}</span> {advice.reason}
      </p>
      <div className="flex flex-wrap gap-2">
        <ActionButton
          action={acceptRecommendationAction}
          fields={fields}
          label={pause ? 'Pause ad' : `Raise to £${advice.newBudget.toFixed(2)} a day`}
          tone="primary"
          confirm={pause ? 'Switch this ad off on Meta?' : `Raise this ad's budget to £${advice.newBudget.toFixed(2)} a day on Meta? It can spend more from now on.`}
        />
        <ActionButton action={notNowRecommendationAction} fields={fields} label="Not now" />
      </div>
    </div>
  );
}
