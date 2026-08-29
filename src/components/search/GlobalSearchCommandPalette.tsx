import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, UserCheck, Pill, FileText, ArrowRight, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { searchService } from '../../services/searchService';
import { SearchResultItem } from '../../types/auth';

export const GlobalSearchCommandPalette: React.FC = () => {
  const { isSearchOpen, setSearchOpen } = useAppStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Keyboard shortcut '/' listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !isSearchOpen && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setSearchOpen]);

  // Debounced server-side search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchService.searchAll(query);
        setResults(res);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isSearchOpen) return null;

  const handleSelect = (url: string) => {
    setSearchOpen(false);
    setQuery('');
    navigate(url);
  };

  const getIcon = (type: string) => {
    if (type === 'doctor') return <UserCheck className="h-4 w-4 text-emerald-600" />;
    if (type === 'medicine') return <Pill className="h-4 w-4 text-indigo-600" />;
    return <FileText className="h-4 w-4 text-amber-600" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl bg-white p-0 shadow-2xl border border-slate-100 overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
          <Search className="h-5 w-5 text-indigo-500 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search doctors, medicines, order numbers..."
            autoFocus
            className="flex-1 bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          <button
            onClick={() => setSearchOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-96 overflow-y-auto p-2">
          {!query.trim() && (
            <div className="py-8 text-center text-xs text-slate-400">
              Type a doctor name, medicine, clinic, or order ID to quickly jump...
            </div>
          )}

          {query.trim() && !isLoading && results.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching doctors, medicines, or orders found for "{query}".
            </div>
          )}

          {results.length > 0 && (
            <div className="flex flex-col gap-1">
              {results.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleSelect(item.url)}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-indigo-50/70 group transition-all"
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-white shrink-0">
                      {getIcon(item.type)}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700">
                      {item.badge}
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
