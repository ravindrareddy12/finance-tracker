import React from 'react';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ListRow } from '@/components/ListRow';
import { StatGrid, StatTile } from '@/components/StatTile';
import { Badge } from '@/components/Badge';
import { usePortfolio } from '@/features/portfolio/usePortfolio';
import { loanOutstanding, loanReturned } from '@/features/portfolio/calculations';
import { formatDate, money } from '@/lib/format';

export default function LoansScreen() {
  const { userData, summary, isRefreshing, refresh } = usePortfolio();
  const loans = summary.categories.find(c => c.key === 'loans')!;
  const list = [...userData.loans].sort((a, b) => loanOutstanding(b) - loanOutstanding(a));

  return (
    <Screen refreshing={isRefreshing} onRefresh={refresh}>
      <StatGrid>
        <StatTile label="Outstanding" value={money(loans.current)} sub={loans.count} />
        <StatTile label="Lent in total" value={money(loans.invested)} />
      </StatGrid>

      <Card title="Loans" padded={false}>
        {list.length === 0 ? <EmptyState icon="cash-outline" title="No loans recorded" /> : list.map((l, i) => {
          const outstanding = loanOutstanding(l);
          return (
            <ListRow key={l.id} last={i === list.length - 1}
              title={l.customerName}
              subtitle={`${money(l.principal, l.currency)} given ${formatDate(l.dateGiven)}${l.interestRate ? ` · ${l.interestRate}%` : ''}`}
              value={money(outstanding, l.currency)}
              valueSub={outstanding === 0
                ? <Badge label="Repaid" tone="positive" />
                : `${money(loanReturned(l), l.currency)} returned`} />
          );
        })}
      </Card>
    </Screen>
  );
}
