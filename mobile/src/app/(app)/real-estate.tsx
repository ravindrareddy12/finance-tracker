import React from 'react';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ListRow } from '@/components/ListRow';
import { StatGrid, StatTile } from '@/components/StatTile';
import { Badge } from '@/components/Badge';
import { usePortfolio } from '@/features/portfolio/usePortfolio';
import { propertyCost, propertyEstimate } from '@/features/portfolio/calculations';
import { formatDate, money, percent, toneOf } from '@/lib/format';

export default function RealEstateScreen() {
  const { userData, summary, isRefreshing, refresh } = usePortfolio();
  const re = summary.categories.find(c => c.key === 're')!;
  const active = userData.properties.filter(p => p.status === 'active');
  const sold   = userData.properties.filter(p => p.status === 'sold');

  return (
    <Screen refreshing={isRefreshing} onRefresh={refresh}>
      <StatGrid>
        <StatTile label="Estimated value" value={money(re.current)} sub={re.count} />
        <StatTile label="Gain" value={money(re.pnl, 'INR', { signed: true })} tone={toneOf(re.pnl)} badge={re.invested > 0 ? percent(re.pnlPct) : undefined} />
      </StatGrid>

      <Card title="Active properties" subtitle="Your share, grown at the expected appreciation rate" padded={false}>
        {active.length === 0 ? <EmptyState icon="business-outline" title="No active properties" /> : active.map((p, i) => (
          <ListRow key={p.id} last={i === active.length - 1}
            title={p.propertyName}
            subtitle={`${p.mySharePercent}% share · ${p.appreciationPerYear}%/yr · since ${formatDate(p.purchaseDate)}`}
            value={money(propertyEstimate(p), p.currency)}
            valueSub={`cost ${money(propertyCost(p), p.currency)}`} />
        ))}
      </Card>

      {sold.length > 0 ? (
        <Card title="Sold" padded={false}>
          {sold.map((p, i) => (
            <ListRow key={p.id} last={i === sold.length - 1} title={p.propertyName}
              subtitle={`Sold ${formatDate(p.soldDate)}`}
              value={p.soldAmount != null ? money(p.soldAmount, p.currency) : '—'}
              valueSub={<Badge label="Sold" />} />
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
