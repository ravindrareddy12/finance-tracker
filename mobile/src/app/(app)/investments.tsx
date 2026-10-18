import React, { useState } from 'react';
import { Stack } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ListRow } from '@/components/ListRow';
import { StatGrid, StatTile } from '@/components/StatTile';
import { HeaderButton } from '@/components/ActionBar';
import { usePortfolio } from '@/features/portfolio/usePortfolio';
import { InvestmentSheet } from '@/features/assets/AssetSheets';
import { investmentEstimate } from '@/features/portfolio/calculations';
import { formatDate, money, percent, toneOf } from '@/lib/format';
import type { AdditionalInvestment } from '@/types/models';

export default function InvestmentsScreen() {
  const { userData, summary, isRefreshing, refresh } = usePortfolio();
  const [sheet, setSheet] = useState<{ investment?: AdditionalInvestment } | null>(null);
  const addl = summary.categories.find(c => c.key === 'addl')!;

  return (
    <Screen refreshing={isRefreshing} onRefresh={refresh}>
      <Stack.Screen options={{ headerRight: () => <HeaderButton icon="add-circle" label="Add investment" onPress={() => setSheet({})} /> }} />
      <StatGrid>
        <StatTile label="Estimated value" value={money(addl.current)} sub={addl.count} />
        <StatTile label="Gain" value={money(addl.pnl, 'INR', { signed: true })} tone={toneOf(addl.pnl)} badge={addl.invested > 0 ? percent(addl.pnlPct) : undefined} />
      </StatGrid>

      <Card title="Investments" subtitle="Grown at the expected annual rate · tap to edit" padded={false}>
        {userData.investments.length === 0 ? <EmptyState icon="wallet-outline" title="No investments recorded" message="Tap + to add one." /> :
          userData.investments.map((inv, i) => (
            <ListRow key={inv.id} last={i === userData.investments.length - 1}
              title={inv.name}
              subtitle={`${inv.interestPercent}%/yr · since ${formatDate(inv.dateOfInvestment)}`}
              value={money(investmentEstimate(inv), inv.currency)}
              valueSub={`invested ${money(inv.amountInvested, inv.currency)}`}
              onPress={() => setSheet({ investment: inv })} />
          ))}
      </Card>

      {sheet ? <InvestmentSheet initial={sheet.investment} onClose={() => setSheet(null)} /> : null}
    </Screen>
  );
}
