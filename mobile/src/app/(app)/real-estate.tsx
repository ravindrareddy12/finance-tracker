import React, { useState } from 'react';
import { Stack } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ListRow } from '@/components/ListRow';
import { StatGrid, StatTile } from '@/components/StatTile';
import { Badge } from '@/components/Badge';
import { HeaderButton } from '@/components/ActionBar';
import { usePortfolio } from '@/features/portfolio/usePortfolio';
import { PropertySheet } from '@/features/assets/AssetSheets';
import { propertyCost, propertyEstimate } from '@/features/portfolio/calculations';
import { formatDate, money, percent, toneOf } from '@/lib/format';
import type { RealEstateProperty } from '@/types/models';

export default function RealEstateScreen() {
  const { userData, summary, isRefreshing, refresh } = usePortfolio();
  const [sheet, setSheet] = useState<{ property?: RealEstateProperty } | null>(null);
  const re = summary.categories.find(c => c.key === 're')!;
  const active = userData.properties.filter(p => p.status === 'active');
  const sold   = userData.properties.filter(p => p.status === 'sold');

  return (
    <Screen refreshing={isRefreshing} onRefresh={refresh}>
      <Stack.Screen options={{ headerRight: () => <HeaderButton icon="add-circle" label="Add property" onPress={() => setSheet({})} /> }} />
      <StatGrid>
        <StatTile label="Estimated value" value={money(re.current)} sub={re.count} />
        <StatTile label="Gain" value={money(re.pnl, 'INR', { signed: true })} tone={toneOf(re.pnl)} badge={re.invested > 0 ? percent(re.pnlPct) : undefined} />
      </StatGrid>

      <Card title="Active properties" subtitle="Your share, grown at the expected appreciation rate · tap to edit" padded={false}>
        {active.length === 0 ? <EmptyState icon="business-outline" title="No active properties" message="Tap + to add a property." /> : active.map((p, i) => (
          <ListRow key={p.id} last={i === active.length - 1}
            title={p.propertyName}
            subtitle={`${p.mySharePercent}% share · ${p.appreciationPerYear}%/yr · since ${formatDate(p.purchaseDate)}`}
            value={money(propertyEstimate(p), p.currency)}
            valueSub={`cost ${money(propertyCost(p), p.currency)}`}
            onPress={() => setSheet({ property: p })} />
        ))}
      </Card>

      {sold.length > 0 ? (
        <Card title="Sold" padded={false}>
          {sold.map((p, i) => (
            <ListRow key={p.id} last={i === sold.length - 1} title={p.propertyName}
              subtitle={`Sold ${formatDate(p.soldDate)}`}
              value={p.soldAmount != null ? money(p.soldAmount, p.currency) : '—'}
              valueSub={<Badge label="Sold" />}
              onPress={() => setSheet({ property: p })} />
          ))}
        </Card>
      ) : null}

      {sheet ? <PropertySheet initial={sheet.property} onClose={() => setSheet(null)} /> : null}
    </Screen>
  );
}
