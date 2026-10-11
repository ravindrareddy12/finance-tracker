import React from 'react';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ListRow } from '@/components/ListRow';
import { StatGrid, StatTile } from '@/components/StatTile';
import { usePortfolio } from '@/features/portfolio/usePortfolio';
import { investmentEstimate } from '@/features/portfolio/calculations';
import { formatDate, money, percent, toneOf } from '@/lib/format';

export default function InvestmentsScreen() {
  const { userData, summary, isRefreshing, refresh } = usePortfolio();
  const addl = summary.categories.find(c => c.key === 'addl')!;

  return (
    <Screen refreshing={isRefreshing} onRefresh={refresh}>
      <StatGrid>
        <StatTile label="Estimated value" value={money(addl.current)} sub={addl.count} />
        <StatTile label="Gain" value={money(addl.pnl, 'INR', { signed: true })} tone={toneOf(addl.pnl)} badge={addl.invested > 0 ? percent(addl.pnlPct) : undefined} />
      </StatGrid>

      <Card title="Investments" subtitle="Grown at the expected annual rate" padded={false}>
        {userData.investments.length === 0 ? <EmptyState icon="wallet-outline" title="No investments recorded" /> :
          userData.investments.map((inv, i) => (
            <ListRow key={inv.id} last={i === userData.investments.length - 1}
              title={inv.name}
              subtitle={`${inv.interestPercent}%/yr · since ${formatDate(inv.dateOfInvestment)}`}
              value={money(investmentEstimate(inv), inv.currency)}
              valueSub={`invested ${money(inv.amountInvested, inv.currency)}`} />
          ))}
      </Card>
    </Screen>
  );
}
