import axios from 'axios';
import { StockQuote } from '../types';

export async function fetchQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
  const map = new Map<string, StockQuote>();
  if (symbols.length === 0) return map;

  try {
    const { data } = await axios.get(`/api/quotes?symbols=${symbols.join(',')}`);
    const results: StockQuote[] = data?.quoteResponse?.result ?? [];
    results.forEach(q => map.set(q.symbol.toUpperCase(), q));
  } catch (err) {
    console.error('Failed to fetch quotes', err);
  }
  return map;
}
