import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Sheet, SheetActions } from '@/components/form/Sheet';
import { ChipSelect } from '@/components/form/ChipSelect';
import { DateField } from '@/components/form/DateField';
import { FieldRow, Summary } from '@/components/form/Summary';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { Banner } from '@/components/Banner';
import { usePortfolio, useUpdateUserData } from '@/features/portfolio/usePortfolio';
import { money } from '@/lib/format';
import { timestampId } from '@/lib/ids';
import { confirmDestructive, parseNum } from '@/lib/forms';
import { colors, radius, spacing } from '@/theme';
import type { Currency, Transaction } from '@/types/models';
import { applyCash, cashKey, cashOf, type CashAction } from './cash';

const CURRENCIES = [{ value: 'INR' as const, label: '₹ INR' }, { value: 'USD' as const, label: '$ USD' }];
const fmt = (n: number, c: Currency) => money(n, c, { decimals: true });

function AccountPicker({ accounts, value, onChange, balances, currency }: {
  accounts: string[]; value: string; onChange: (v: string) => void; balances?: Record<string, number>; currency?: Currency;
}) {
  if (accounts.length === 0) return <Banner tone="warning" message="Add an account holder in Configuration first." />;
  return (
    <ChipSelect label="Demat account" value={value} onChange={onChange}
      options={accounts.map(a => ({ value: a, label: balances && currency ? `${a} · ${money(balances[a] ?? 0, currency)}` : a }))} />
  );
}

// ─── Buy ─────────────────────────────────────────────────────────────────────

export function BuySheet({ defaultCurrency, defaultSymbol, defaultAccount, onClose }: {
  defaultCurrency: Currency; defaultSymbol?: string; defaultAccount?: string; onClose: () => void;
}) {
  const { userData } = usePortfolio();
  const accounts = userData.config.dematAccounts;
  const update = useUpdateUserData();
  const [symbol, setSymbol] = useState(defaultSymbol ?? '');
  const [account, setAccount] = useState(defaultAccount ?? accounts[0] ?? '');
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [fees, setFees] = useState('');
  const [error, setError] = useState('');

  const qty = parseNum(quantity) || 0, prc = parseNum(price) || 0, fee = parseNum(fees) || 0;
  const total = qty * prc + fee;
  const cashBal = cashOf(userData, currency)[account] ?? 0;
  const insufficient = total > 0 && cashBal - total < 0;

  const submit = () => {
    setError('');
    if (!account) { setError('Add an account holder in Configuration first.'); return; }
    if (!symbol.trim()) { setError('Symbol is required.'); return; }
    if (qty <= 0) { setError('Quantity must be a positive number.'); return; }
    if (prc <= 0) { setError('Price must be a positive number.'); return; }
    if (fee < 0) { setError('Fees cannot be negative.'); return; }
    const tx: Transaction = {
      id: timestampId(), symbol: symbol.trim().toUpperCase(), quantity: qty, price: prc, fees: fee,
      type: 'buy', currency, dematAccount: account, date: new Date().toISOString(),
    };
    // Like the web, the cost (incl. fees) is withdrawn from the account's cash
    update.mutate(latest => ({
      transactions: [...latest.transactions, tx],
      [cashKey(currency)]: applyCash(cashOf(latest, currency), account, total, 'withdraw'),
    }), { onSuccess: onClose });
  };

  return (
    <Sheet visible title="Add Buy Transaction" onClose={onClose}
      footer={<SheetActions><Button title="Cancel" variant="secondary" onPress={onClose} /><Button title="Add Buy" onPress={submit} loading={update.isPending} /></SheetActions>}>
      {error || update.error ? <Banner tone="negative" message={error || update.error!.message} /> : null}
      <TextField label="Symbol" value={symbol} onChangeText={t => setSymbol(t.toUpperCase())} placeholder="e.g. RELIANCE.NS or AAPL"
        autoCapitalize="characters" hint="Indian: add .NS (RELIANCE.NS) · US: just ticker (AAPL)" />
      <AccountPicker accounts={accounts} value={account} onChange={setAccount} />
      <SegmentedControl options={CURRENCIES} value={currency} onChange={setCurrency} />
      <Banner tone={insufficient ? 'negative' : 'info'}
        message={`Available cash (${account || '—'}): ${fmt(cashBal, currency)}${total > 0 ? ` · After: ${fmt(cashBal - total, currency)}` : ''}`} />
      <FieldRow>
        <TextField label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="0" />
        <TextField label={`Buy price (${currency === 'INR' ? '₹' : '$'})`} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0.00" />
      </FieldRow>
      <TextField label="Brokerage / fees (optional)" value={fees} onChangeText={setFees} keyboardType="decimal-pad" placeholder="0.00" />
      {qty > 0 && prc > 0 ? (
        <Summary lines={[
          { label: `${qty.toLocaleString()} × ${fmt(prc, currency)}`, value: fmt(qty * prc, currency) },
          ...(fee > 0 ? [{ label: 'Fees', value: `+ ${fmt(fee, currency)}` }] : []),
          { label: 'Total deduction', value: fmt(total, currency), strong: true },
        ]} />
      ) : null}
    </Sheet>
  );
}

// ─── Sell ────────────────────────────────────────────────────────────────────

export function SellSheet({ defaultCurrency, defaultSymbol, defaultAccount, onClose }: {
  defaultCurrency: Currency; defaultSymbol?: string; defaultAccount?: string; onClose: () => void;
}) {
  const { userData, holdings } = usePortfolio();
  const accounts = userData.config.dematAccounts;
  const update = useUpdateUserData();
  const [symbol, setSymbol] = useState(defaultSymbol ?? '');
  const [account, setAccount] = useState(defaultAccount ?? accounts[0] ?? '');
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [fees, setFees] = useState('');
  const [error, setError] = useState('');

  const holding = holdings.find(h => h.symbol === symbol.toUpperCase() && h.account === account && h.currency === currency);
  const prcNum = parseNum(price);
  const usingMarket = prcNum === 0;
  const effectivePrice = usingMarket ? holding?.price ?? null : isNaN(prcNum) ? null : prcNum;
  const qty = parseNum(quantity);
  const fee = parseNum(fees) || 0;
  const gross = effectivePrice !== null && !isNaN(qty) ? qty * effectivePrice : null;
  const net = gross !== null ? Math.max(0, gross - fee) : null;
  const cashBal = cashOf(userData, currency)[account] ?? 0;

  const submit = () => {
    setError('');
    if (!account) { setError('Add an account holder in Configuration first.'); return; }
    if (!symbol.trim()) { setError('Symbol is required.'); return; }
    if (!quantity) { setError('Quantity is required.'); return; }
    if (price === '') { setError('Sell price is required. Enter 0 to use live market price.'); return; }
    if (isNaN(qty) || qty <= 0) { setError('Quantity must be a positive number.'); return; }
    if (isNaN(prcNum) || prcNum < 0) { setError('Price must be 0 or a positive number.'); return; }
    if (holding && qty > holding.quantity) { setError(`You only hold ${holding.quantity} shares of ${symbol.toUpperCase()} in this account.`); return; }
    let finalPrice = prcNum;
    if (prcNum === 0) {
      if (!holding?.price) { setError('Live market price is unavailable. Please enter a price manually.'); return; }
      finalPrice = holding.price;
    }
    const tx: Transaction = {
      id: timestampId(), symbol: symbol.trim().toUpperCase(), quantity: qty, price: finalPrice, fees: fee,
      type: 'sell', currency, dematAccount: account, date: new Date().toISOString(),
    };
    update.mutate(latest => ({
      transactions: [...latest.transactions, tx],
      [cashKey(currency)]: applyCash(cashOf(latest, currency), account, Math.max(0, qty * finalPrice - fee), 'deposit'),
    }), { onSuccess: onClose });
  };

  return (
    <Sheet visible title="Add Sell Transaction" onClose={onClose}
      footer={<SheetActions><Button title="Cancel" variant="secondary" onPress={onClose} /><Button title="Add Sell" onPress={submit} loading={update.isPending} /></SheetActions>}>
      {error || update.error ? <Banner tone="negative" message={error || update.error!.message} /> : null}
      <TextField label="Symbol" value={symbol} onChangeText={t => setSymbol(t.toUpperCase())} placeholder="e.g. RELIANCE.NS or AAPL" autoCapitalize="characters" />
      <AccountPicker accounts={accounts} value={account} onChange={setAccount} />
      <SegmentedControl options={CURRENCIES} value={currency} onChange={setCurrency} />
      {holding ? (
        <Banner tone="info" message={`Available: ${holding.quantity.toLocaleString()} shares @ avg ${fmt(holding.avgPrice, currency)}${holding.price !== null ? ` · Live: ${fmt(holding.price, currency)}` : ''}`} />
      ) : null}
      <Banner tone="positive" message={`Cash balance (${account || '—'}): ${fmt(cashBal, currency)}${net !== null ? ` · After: ${fmt(cashBal + net, currency)}` : ''}`} />
      <View style={styles.labelRow}>
        <View style={styles.flex}>
          <TextField label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="0" />
        </View>
        {holding ? (
          <Pressable onPress={() => setQuantity(String(holding.quantity))} style={styles.sellAll} accessibilityRole="button">
            <Ionicons name="flash" size={14} color={colors.negative} />
            <Text style={styles.sellAllText}>Sell all ({holding.quantity.toLocaleString()})</Text>
          </Pressable>
        ) : null}
      </View>
      <TextField label="Sell price" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0 for market price"
        hint={usingMarket ? (holding?.price ? `Using live price: ${fmt(holding.price, currency)}` : 'Live price unavailable — enter a price manually') : 'Enter 0 to use live market price'} />
      <TextField label="Brokerage / fees (optional)" value={fees} onChangeText={setFees} keyboardType="decimal-pad" placeholder="0.00" />
      {gross !== null && quantity ? (
        <Summary lines={[
          { label: `Gross sale (${qty.toLocaleString()} × ${fmt(effectivePrice ?? 0, currency)})`, value: fmt(gross, currency) },
          ...(fee > 0 ? [{ label: 'Fees', value: `− ${fmt(fee, currency)}` }] : []),
          { label: 'Net proceeds (credited to cash)', value: fmt(net ?? 0, currency), strong: true, tone: 'positive' as const },
        ]} />
      ) : null}
    </Sheet>
  );
}

// ─── Cash ────────────────────────────────────────────────────────────────────

const CASH_ACTIONS: { value: CashAction; label: string; desc: string }[] = [
  { value: 'deposit', label: 'Deposit', desc: 'Add cash to the account' },
  { value: 'withdraw', label: 'Withdraw', desc: 'Remove cash from the account' },
  { value: 'set', label: 'Set Balance', desc: 'Override the current balance' },
];

export function CashSheet({ currency, defaultAccount, onClose }: { currency: Currency; defaultAccount?: string; onClose: () => void }) {
  const { userData } = usePortfolio();
  const accounts = userData.config.dematAccounts;
  const balances = cashOf(userData, currency);
  const update = useUpdateUserData();
  const [account, setAccount] = useState(defaultAccount ?? accounts[0] ?? '');
  const [action, setAction] = useState<CashAction>('deposit');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const current = balances[account] ?? 0;
  const amt = parseNum(amount);
  const preview = isNaN(amt) ? null : applyCash(balances, account, amt, action)[account];

  const submit = () => {
    setError('');
    if (!account) { setError('Add an account holder in Configuration first.'); return; }
    if (isNaN(amt) || amt < 0) { setError('Please enter a valid amount.'); return; }
    if (action === 'withdraw' && amt > current) { setError(`Insufficient balance. Current: ${fmt(current, currency)}`); return; }
    update.mutate(latest => ({ [cashKey(currency)]: applyCash(cashOf(latest, currency), account, amt, action) }), { onSuccess: onClose });
  };

  const label = CASH_ACTIONS.find(a => a.value === action)!;
  return (
    <Sheet visible title="Manage Cash Balance" subtitle={`${currency} · current ${fmt(current, currency)}`} onClose={onClose}
      footer={<SheetActions><Button title="Cancel" variant="secondary" onPress={onClose} /><Button title={label.label} onPress={submit} loading={update.isPending} /></SheetActions>}>
      {error || update.error ? <Banner tone="negative" message={error || update.error!.message} /> : null}
      <AccountPicker accounts={accounts} value={account} onChange={setAccount} balances={balances} currency={currency} />
      <View style={styles.gap}>
        <SegmentedControl options={CASH_ACTIONS} value={action} onChange={setAction} />
        <Text style={styles.hint}>{label.desc}</Text>
      </View>
      <TextField label={`Amount (${currency === 'INR' ? '₹' : '$'})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" autoFocus />
      {amount && preview != null ? <Summary lines={[{ label: 'New balance', value: fmt(preview, currency), strong: true }]} /> : null}
    </Sheet>
  );
}

// ─── Edit transaction ────────────────────────────────────────────────────────

export function TransactionSheet({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const { userData } = usePortfolio();
  const accounts = [...new Set([...userData.config.dematAccounts, tx.dematAccount].filter(Boolean))];
  const update = useUpdateUserData();
  const [symbol, setSymbol] = useState(tx.symbol);
  const [type, setType] = useState(tx.type);
  const [quantity, setQuantity] = useState(String(tx.quantity));
  const [price, setPrice] = useState(String(tx.price));
  const [currency, setCurrency] = useState<Currency>(tx.currency);
  const [account, setAccount] = useState(tx.dematAccount);
  const [date, setDate] = useState(tx.date.slice(0, 10));
  const [error, setError] = useState('');

  // Same as the web's inline edit: transaction only, cash balances are not adjusted
  const save = () => {
    setError('');
    const qty = parseNum(quantity), prc = parseNum(price);
    if (!symbol.trim()) { setError('Symbol is required.'); return; }
    if (isNaN(qty) || qty <= 0 || isNaN(prc) || prc <= 0) { setError('Quantity and price must be positive numbers.'); return; }
    const updated: Partial<Transaction> = {
      symbol: symbol.trim().toUpperCase(), type, quantity: qty, price: prc, currency, dematAccount: account,
      date: new Date(date).toISOString(),
    };
    update.mutate(latest => ({ transactions: latest.transactions.map(t => (t.id === tx.id ? { ...t, ...updated } : t)) }), { onSuccess: onClose });
  };

  const remove = () => confirmDestructive('Delete transaction?', `${tx.type.toUpperCase()} ${tx.quantity} ${tx.symbol}. This cannot be undone.`, 'Delete',
    () => update.mutate(latest => ({ transactions: latest.transactions.filter(t => t.id !== tx.id) }), { onSuccess: onClose }));

  return (
    <Sheet visible title="Edit Transaction" subtitle={tx.symbol} onClose={onClose}
      footer={<>
        <SheetActions><Button title="Cancel" variant="secondary" onPress={onClose} /><Button title="Save" onPress={save} loading={update.isPending} /></SheetActions>
        <Button title="Delete transaction" variant="danger" onPress={remove} disabled={update.isPending} />
      </>}>
      {error || update.error ? <Banner tone="negative" message={error || update.error!.message} /> : null}
      <SegmentedControl options={[{ value: 'buy' as const, label: 'Buy' }, { value: 'sell' as const, label: 'Sell' }]} value={type} onChange={setType} />
      <TextField label="Symbol" value={symbol} onChangeText={t => setSymbol(t.toUpperCase())} autoCapitalize="characters" />
      <FieldRow>
        <TextField label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" />
        <TextField label="Price" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
      </FieldRow>
      <SegmentedControl options={CURRENCIES} value={currency} onChange={setCurrency} />
      {accounts.length > 0 ? <ChipSelect label="Demat account" value={account} onChange={setAccount} options={accounts.map(a => ({ value: a, label: a }))} /> : null}
      <DateField label="Date" value={date} onChange={setDate} />
      <Text style={styles.hint}>Editing a transaction doesn’t change cash balances (same as the website).</Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex:     { flex: 1 },
  gap:      { gap: spacing.xs },
  hint:     { fontSize: 12, color: colors.textMuted },
  labelRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  sellAll:  { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#FECACA', backgroundColor: colors.negativeSoft },
  sellAllText: { fontSize: 13, fontWeight: '600', color: colors.negative },
});
