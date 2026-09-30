import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { History, Swords, Shield, Coins, Droplets, Award, Clock, Radio, X, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useGameState } from '../../state/GameStateContext.jsx';
import { fetchRaidHistory } from '../../api.js';
import ClayPanel from '../ui/ClayPanel.jsx';
import ClayButton from '../ui/ClayButton.jsx';

export default function HistoryModal() {
  const { isHistoryOpen, setIsHistoryOpen } = useGameState();
  const [historyPage, setHistoryPage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'ATTACKER' | 'DEFENDER'
  const [page, setPage] = useState(0);

  const loadHistory = async (pageNum = 0) => {
    setLoading(true);
    try {
      const data = await fetchRaidHistory(pageNum, 15);
      if (data) {
        setHistoryPage(data);
        setPage(pageNum);
      }
    } catch (err) {
      console.error('Failed to load raid history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isHistoryOpen) {
      loadHistory(0);
    }
  }, [isHistoryOpen]);

  const items = historyPage?.content || [];
  const filteredItems = items.filter((item) => {
    if (filter === 'ALL') return true;
    return item.perspective === filter;
  });

  const totalPages = historyPage?.totalPages || 1;

  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      const date = new Date(ts);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(ts);
    }
  };

  return (
    <AnimatePresence>
      {isHistoryOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0d1b1e]/85 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <ClayPanel
            depth="deep"
            className="w-[620px] max-w-[95vw] max-h-[85vh] p-6 rounded-[28px] flex flex-col gap-4 relative overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-clay-accent/15 flex items-center justify-center text-clay-accent">
                  <History size={18} />
                </div>
                <div>
                  <h2 className="font-heading font-bold text-base text-clay-accent tracking-wider">
                    Raid Combat Log
                  </h2>
                  <p className="text-[11px] text-clay-muted">
                    Persistent history of your infiltrations and defended assaults
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ClayButton
                  variant="ghost"
                  onClick={() => loadHistory(page)}
                  disabled={loading}
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  aria-label="Refresh history"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                </ClayButton>
                <ClayButton
                  variant="ghost"
                  onClick={() => setIsHistoryOpen(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  aria-label="Close history"
                >
                  <X size={15} />
                </ClayButton>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
              {[
                { id: 'ALL', label: 'All Operations' },
                { id: 'ATTACKER', label: 'Infiltrations (Attacks)' },
                { id: 'DEFENDER', label: 'Siege Defenses' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all ${
                    filter === f.id
                      ? 'bg-clay-accent text-white shadow-sm'
                      : 'bg-black/20 text-clay-muted hover:text-clay-text hover:bg-black/30'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Log List */}
            <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[50vh] flex flex-col gap-2.5 pr-1 custom-scrollbar">
              {loading && !items.length ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 gap-2 text-clay-muted">
                  <RefreshCw size={22} className="animate-spin text-clay-accent" />
                  <span className="text-[12px]">Retrieving logs from database...</span>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-clay-muted">
                  <span className="text-[13px] font-medium">No recorded combat operations</span>
                  <span className="text-[11px] opacity-60">Initiate raids or defend to generate combat logs</span>
                </div>
              ) : (
                filteredItems.map((item) => {
                  const isAttacker = item.perspective === 'ATTACKER';
                  const isSuccess =
                    item.outcome === 'SUCCESS' ||
                    item.outcome === 'INFILTRATED' ||
                    (item.outcome !== 'CAUGHT' && item.outcome !== 'ABORTED' && (item.stolenCoins > 0 || item.stolenInk > 0));
                  const isCaught = item.outcome === 'CAUGHT';
                  const isAborted = item.outcome === 'ABORTED';

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-black/20 border border-white/5 flex flex-col gap-2 hover:bg-black/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-heading font-bold uppercase tracking-wider flex items-center gap-1 ${
                              isAttacker
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                            }`}
                          >
                            {isAttacker ? <Swords size={11} /> : <Shield size={11} />}
                            {isAttacker ? 'Attacker' : 'Defender'}
                          </span>

                          <span className="text-[12px] font-semibold text-clay-text">
                            vs {item.opponentUsername || `Player ${item.opponentId}`}
                          </span>

                          {item.live && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                              <Radio size={9} className="animate-pulse" /> LIVE
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-clay-muted">
                          <span className="flex items-center gap-1">
                            <Clock size={11} /> {item.durationSeconds || 0}s
                          </span>
                          <span>•</span>
                          <span>{formatTime(item.timestamp)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
                        <div className="flex items-center gap-3">
                          <span
                            className={`font-semibold ${
                              isSuccess
                                ? 'text-emerald-400'
                                : isCaught
                                ? 'text-rose-400'
                                : isAborted
                                ? 'text-amber-400'
                                : 'text-clay-muted'
                            }`}
                          >
                            {item.outcome}
                          </span>

                          {item.endedReason && item.endedReason !== item.outcome && (
                            <span className="text-[10px] text-clay-muted/70">
                              ({item.endedReason})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 font-semibold">
                          <span
                            className={`flex items-center gap-1 ${
                              isAttacker
                                ? item.stolenCoins > 0 ? 'text-amber-300' : 'text-clay-muted'
                                : item.stolenCoins > 0 ? 'text-rose-400' : 'text-clay-muted'
                            }`}
                          >
                            <Coins size={12} />
                            {isAttacker ? '+' : item.stolenCoins > 0 ? '-' : ''}
                            {item.stolenCoins}
                          </span>

                          <span
                            className={`flex items-center gap-1 ${
                              isAttacker
                                ? item.stolenInk > 0 ? 'text-purple-300' : 'text-clay-muted'
                                : item.stolenInk > 0 ? 'text-rose-400' : 'text-clay-muted'
                            }`}
                          >
                            <Droplets size={12} />
                            {isAttacker ? '+' : item.stolenInk > 0 ? '-' : ''}
                            {item.stolenInk}
                          </span>

                          {item.stolenChips > 0 && isAttacker && (
                            <span className="flex items-center gap-1 text-cyan-300">
                              <Award size={12} />
                              +{item.stolenChips}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination footer */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-clay-muted">
                <span>
                  Page {page + 1} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <ClayButton
                    variant="ghost"
                    onClick={() => loadHistory(page - 1)}
                    disabled={page <= 0 || loading}
                    className="w-8 h-8 rounded-xl flex items-center justify-center p-0"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={14} />
                  </ClayButton>
                  <ClayButton
                    variant="ghost"
                    onClick={() => loadHistory(page + 1)}
                    disabled={page >= totalPages - 1 || loading}
                    className="w-8 h-8 rounded-xl flex items-center justify-center p-0"
                    aria-label="Next page"
                  >
                    <ChevronRight size={14} />
                  </ClayButton>
                </div>
              </div>
            )}
          </ClayPanel>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
