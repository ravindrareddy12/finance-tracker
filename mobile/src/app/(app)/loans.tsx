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
import { AddLoanSheet, LoanSheet } from '@/features/assets/AssetSheets';
import { loanOutstanding, loanReturned } from '@/features/portfolio/calculations';
import { formatDate, money } from '@/lib/format';

export default function LoansScreen() {
  const { userData, summary, isRefreshing, refresh } = usePortfolio();
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const loans = summary.categories.find(c => c.key === 'loans')!;
  const list = [...userData.loans].sort((a, b) => loanOutstanding(b) - loanOutstanding(a));
  // Look the loan up by id so the sheet shows returns recorded meanwhile
  const open = userData.loans.find(l => l.id === openId);

  return (
    <Screen refreshing={isRefreshing} onRefresh={refresh}>
      <Stack.Screen options={{ headerRight: () => <HeaderButton icon="add-circle" label="Add interest investment" onPress={() => setAdding(true)} /> }} />
      <StatGrid>
        <StatTile label="Outstanding" value={money(loans.current)} sub={loans.count} />
        <StatTile label="Lent in total" value={money(loans.invested)} />
      </StatGrid>

      <Card title="Loans" subtitle="Tap to record a return or delete" padded={false}>
        {list.length === 0 ? <EmptyState icon="cash-outline" title="No loans recorded" message="Tap + to add one." /> : list.map((l, i) => {
          const outstanding = loanOutstanding(l);
          return (
            <ListRow key={l.id} last={i === list.length - 1}
              title={l.customerName}
              subtitle={`${money(l.principal, l.currency)} given ${formatDate(l.dateGiven)}${l.interestRate ? ` · ${l.interestRate}%` : ''}`}
              value={money(outstanding, l.currency)}
              valueSub={outstanding === 0
                ? <Badge label="Repaid" tone="positive" />
                : `${money(loanReturned(l), l.currency)} returned`}
              onPress={() => setOpenId(l.id)} />
          );
        })}
      </Card>

      {adding ? <AddLoanSheet onClose={() => setAdding(false)} /> : null}
      {open ? <LoanSheet loan={open} onClose={() => setOpenId(null)} /> : null}
    </Screen>
  );
}
