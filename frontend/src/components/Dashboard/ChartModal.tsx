import React from 'react';
import { X, ExternalLink } from 'lucide-react';

interface ChartModalProps {
  symbol: string;
  companyName: string;
  currency: string;
  onClose: () => void;
}

function toTVSymbol(symbol: string, currency: string): string {
  if (currency === 'INR') {
    const base = symbol.replace(/\.(NS|BO|BSE)$/i, '');
    return symbol.toUpperCase().endsWith('.BO') ? `BSE:${base}` : `NSE:${base}`;
  }
  return symbol;
}

export default function ChartModal({ symbol, companyName, currency, onClose }: ChartModalProps) {
  const tvSymbol = toTVSymbol(symbol, currency);
  const yahooUrl = `https://finance.yahoo.com/quote/${symbol}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ width: 'min(860px, 100%)', height: 'min(560px, calc(100dvh - 1rem))' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-blue-700 text-base">{symbol}</span>
            <span className="hidden sm:inline text-gray-500 text-sm truncate max-w-xs">{companyName}</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={yahooUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <ExternalLink className="w-3 h-3" /> Yahoo Finance
            </a>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* TradingView chart */}
        <iframe
          key={tvSymbol}
          src={`https://www.tradingview.com/widgetembed/?frameElementId=tv_${symbol}&symbol=${encodeURIComponent(tvSymbol)}&interval=D&hidesidetoolbar=0&symboledit=0&saveimage=0&toolbarbg=f1f3f6&studies=%5B%5D&theme=light&style=1&timezone=exchange&withdateranges=1&showpopupbutton=0&locale=en&hide_top_toolbar=0`}
          style={{ width: '100%', flex: 1, border: 'none' }}
          allowFullScreen
          title={`Chart – ${symbol}`}
        />
      </div>
    </div>
  );
}
