const PALETTE = [
  { badge: 'bg-blue-100 text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500' },
  { badge: 'bg-purple-100 text-purple-700', bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
  { badge: 'bg-green-100 text-green-700',  bg: 'bg-green-50',  border: 'border-green-100',  text: 'text-green-800',  dot: 'bg-green-500' },
  { badge: 'bg-orange-100 text-orange-700', bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-800', dot: 'bg-orange-500' },
  { badge: 'bg-pink-100 text-pink-700',    bg: 'bg-pink-50',   border: 'border-pink-100',   text: 'text-pink-800',   dot: 'bg-pink-500' },
  { badge: 'bg-teal-100 text-teal-700',    bg: 'bg-teal-50',   border: 'border-teal-100',   text: 'text-teal-800',   dot: 'bg-teal-500' },
  { badge: 'bg-amber-100 text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-100',  text: 'text-amber-800',  dot: 'bg-amber-500' },
  { badge: 'bg-red-100 text-red-700',      bg: 'bg-red-50',    border: 'border-red-100',    text: 'text-red-800',    dot: 'bg-red-500' },
];

const FALLBACK = { badge: 'bg-gray-100 text-gray-700', bg: 'bg-gray-50', border: 'border-gray-100', text: 'text-gray-800', dot: 'bg-gray-400' };

export function getAccountColors(account: string, accounts: string[]) {
  const idx = accounts.indexOf(account);
  return idx >= 0 ? PALETTE[idx % PALETTE.length] : FALLBACK;
}
