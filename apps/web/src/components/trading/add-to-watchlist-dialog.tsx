'use client'

import { useState, useTransition } from 'react'
import { Search, Plus, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Button,
} from '@planningo/ui'
import { toast } from 'sonner'
import { addToWatchlist, searchNSEStocks } from '@/lib/actions/trading'

// Popular NSE stocks for quick add
const POPULAR_STOCKS = [
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank' },
  { symbol: 'INFY.NS', name: 'Infosys' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank' },
  { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever' },
  { symbol: 'ITC.NS', name: 'ITC Ltd' },
  { symbol: 'SBIN.NS', name: 'State Bank of India' },
  { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance' },
  { symbol: 'AXISBANK.NS', name: 'Axis Bank' },
  { symbol: 'WIPRO.NS', name: 'Wipro' },
  { symbol: 'TATAMOTORS.NS', name: 'Tata Motors' },
  { symbol: '^NSEI', name: 'Nifty 50 Index' },
  { symbol: '^NSEBANK', name: 'Bank Nifty Index' },
]

interface AddToWatchlistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded: () => void
}

export function AddToWatchlistDialog({ open, onOpenChange, onAdded }: AddToWatchlistDialogProps) {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; name: string }>>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleSearch(q: string) {
    setQuery(q)
    if (q.length < 2) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    const result = await searchNSEStocks(q)
    setSearchResults(result.data ?? [])
    setIsSearching(false)
  }

  function handleAdd(symbol: string, name: string) {
    startTransition(async () => {
      const result = await addToWatchlist(symbol, name)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Added ${symbol} to watchlist`)
        onAdded()
      }
    })
  }

  const displayList =
    query.length >= 2
      ? searchResults
      : POPULAR_STOCKS

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Watchlist</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search NSE stocks (e.g. Reliance, TCS...)"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {query.length >= 2 ? 'Search Results' : 'Popular Stocks'}
          </div>

          <div className="space-y-1 max-h-64 overflow-y-auto">
            {displayList.length === 0 && !isSearching && (
              <p className="text-sm text-muted-foreground py-4 text-center">No results found</p>
            )}
            {displayList.map((stock) => (
              <button
                key={stock.symbol}
                className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/60 transition-colors text-left"
                onClick={() => handleAdd(stock.symbol, stock.name)}
                disabled={isPending}
              >
                <div>
                  <div className="font-medium text-sm">
                    {stock.symbol.replace('.NS', '').replace('.BO', '')}
                  </div>
                  <div className="text-xs text-muted-foreground">{stock.name}</div>
                </div>
                <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
