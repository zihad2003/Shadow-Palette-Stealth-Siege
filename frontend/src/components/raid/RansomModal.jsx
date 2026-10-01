import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Coins, Mic, MicOff, Volume2, VolumeX, Check, X, Unlock, Lock } from 'lucide-react';
import ClayPanel from '../ui/ClayPanel.jsx';
import ClayButton from '../ui/ClayButton.jsx';
import { postRansomOffer, postRansomSettle } from '../../api.js';
import { ensureStompConnected, stompSubscribe, stompUnsubscribe } from '../../live/stompClient.js';
import { createDuoVoiceCall } from '../../duo/voiceCall.js';
import { soundEngine } from '../../soundEngine.js';

export default function RansomModal({
  isOpen,
  isPrisoner = true,
  attackerId,
  defenderId,
  attackerName = 'Attacker',
  defenderName = 'Base Owner',
  playerCoins = 500,
  onRelease,
  onDecline,
}) {
  const [offerCoins, setOfferCoins] = useState(150);
  const [currentOffer, setCurrentOffer] = useState(null);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [voiceDeafened, setVoiceDeafened] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    isPrisoner
      ? 'You were captured by the base defenses! Offer a financial ransom to secure your release.'
      : 'An intruder has been locked in your Base Jail! Negotiate a financial payout for their freedom.'
  );

  const callRef = useRef(null);
  const audioRef = useRef(null);

  // Subscribe to real-time STOMP negotiation channel
  useEffect(() => {
    if (!isOpen || !attackerId || !defenderId) return undefined;
    let cancelled = false;

    (async () => {
      try {
        await ensureStompConnected();
        if (cancelled) return;

        const myTopic = `/topic/raid-ransom/${isPrisoner ? attackerId : defenderId}`;
        await stompSubscribe(myTopic, (msg) => {
          if (!msg) return;
          if (msg.type === 'RANSOM_OFFER') {
            setCurrentOffer({ coins: msg.coins, message: msg.message });
            setStatusMessage(
              isPrisoner
                ? `Offered ${msg.coins} coins for your release. Waiting for base owner...`
                : `Intruder offers ${msg.coins} coins for release!`
            );
            soundEngine.playSuccessSound();
          } else if (msg.type === 'RANSOM_ACCEPTED') {
            setStatusMessage('Ransom accepted! Jail gate opening...');
            soundEngine.playSuccessSound();
            setTimeout(() => {
              onRelease?.(msg.coinsTransferred || 0);
            }, 1800);
          } else if (msg.type === 'RANSOM_REJECTED') {
            setStatusMessage('Ransom offer was declined by the base owner.');
            soundEngine.playWallHitSound();
            setTimeout(() => {
              onDecline?.();
            }, 2000);
          }
        });
      } catch {
        /* fallback to offline/solo */
      }
    })();

    return () => {
      cancelled = true;
      stompUnsubscribe(`/topic/raid-ransom/${isPrisoner ? attackerId : defenderId}`);
    };
  }, [isOpen, attackerId, defenderId, isPrisoner, onRelease, onDecline]);

  // Jail voice uses the same server relay as duo speech.
  useEffect(() => {
    if (!voiceActive || !isOpen) {
      if (callRef.current) {
        callRef.current.stop();
        callRef.current = null;
      }
      return undefined;
    }

    const intercomRoom = `jail_${Math.min(attackerId, defenderId)}_${Math.max(attackerId, defenderId)}`;
    const call = createDuoVoiceCall({
      partyId: intercomRoom,
      userId: isPrisoner ? attackerId : defenderId,
      isHost: !isPrisoner,
      onStatus: () => {},
    });
    callRef.current = call;
    call.start().catch(() => {});

    return () => {
      call.stop();
      callRef.current = null;
    };
  }, [voiceActive, isOpen, attackerId, defenderId, isPrisoner]);

  const defenderIsBot = Number(defenderId) >= 101 && Number(defenderId) <= 105;

  const negotiateWithBot = () => {
    setStatusMessage(`Negotiating terms with ${defenderName}...`);
    window.setTimeout(() => {
      if (offerCoins >= 100) {
        setStatusMessage('Base AI accepted the financial terms! Releasing...');
        soundEngine.playSuccessSound();
        window.setTimeout(() => onRelease?.(offerCoins), 1500);
      } else {
        setStatusMessage('Offer too low! Base AI demands at least 100 coins.');
        soundEngine.playWallHitSound();
      }
    }, 1200);
  };

  const handleSendOffer = async () => {
    soundEngine.playClickSound();
    try {
      await postRansomOffer({
        attackerId,
        defenderId,
        coins: offerCoins,
        chips: 0,
        message: `${attackerName} offers ${offerCoins} coins for freedom!`,
        voiceRequested: voiceActive,
      });
      setStatusMessage(`Offer of ${offerCoins} coins dispatched to ${defenderName}!`);
      if (defenderIsBot) negotiateWithBot();
    } catch {
      negotiateWithBot();
    }
  };

  const handleAcceptRansom = async () => {
    soundEngine.playClickSound();
    const finalAmount = currentOffer?.coins || offerCoins;
    try {
      await postRansomSettle({
        attackerId,
        defenderId,
        accepted: true,
        agreedCoins: finalAmount,
      });
    } catch {
      onRelease?.(finalAmount);
    }
  };

  const handleRejectRansom = async () => {
    soundEngine.playClickSound();
    try {
      await postRansomSettle({
        attackerId,
        defenderId,
        accepted: false,
        agreedCoins: 0,
      });
    } catch {
      onDecline?.();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-lg"
        >
          <ClayPanel depth="deep" className="p-6 rounded-[28px] border-2 border-clay-danger/40 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-clay-danger/20 text-clay-danger flex items-center justify-center">
                <Lock size={28} />
              </div>
              <div>
                <h2 className="font-heading font-extrabold text-lg text-clay-text flex items-center gap-2">
                  {isPrisoner ? 'Incarcerated in Base Jail' : 'Intruder Captured in Jail'}
                </h2>
                <p className="text-xs text-clay-muted">
                  {isPrisoner
                    ? `Standoff with ${defenderName} · Financial Ransom Standoff`
                    : `Holding ${attackerName} captive · Settle Ransom Terms`}
                </p>
              </div>
            </div>

            {/* Status notification box */}
            <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 text-xs text-clay-text/90 leading-relaxed">
              <p>{statusMessage}</p>
            </div>

            {/* Ransom Slider / Offer area */}
            <div className="p-4 rounded-2xl bg-black/20 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-clay-muted flex items-center gap-1.5">
                  <Coins size={14} className="text-clay-yellow" />
                  Ransom Buyout Amount:
                </span>
                <span className="font-heading text-lg font-bold text-clay-yellow">
                  {currentOffer ? `${currentOffer.coins} Coins` : `${offerCoins} Coins`}
                </span>
              </div>

              {isPrisoner && (
                <>
                  <input
                    type="range"
                    min={50}
                    max={Math.max(100, playerCoins)}
                    step={25}
                    value={offerCoins}
                    onChange={(e) => setOfferCoins(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-clay-muted">
                    <span>Min (50 Coins)</span>
                    <span>Max Available ({playerCoins} Coins)</span>
                  </div>
                </>
              )}
            </div>

            {/* Jail voice */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${voiceActive ? 'bg-clay-success/20 text-clay-success' : 'bg-white/10 text-clay-muted'}`}>
                  {voiceActive ? <Mic size={16} /> : <MicOff size={16} />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-clay-text">Hostage Voice Intercom</p>
                  <p className="text-[10px] text-clay-muted">{voiceActive ? 'Voice channel live' : 'Speak to negotiate directly'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {voiceActive && (
                  <>
                    <ClayButton
                      variant={voiceMuted ? 'danger' : 'ghost'}
                      className="!h-8 !w-8 !p-0 !rounded-full shrink-0"
                      onClick={() => {
                        const m = !voiceMuted;
                        setVoiceMuted(m);
                        callRef.current?.setMuted(m);
                      }}
                    >
                      {voiceMuted ? <MicOff size={14} /> : <Mic size={14} />}
                    </ClayButton>
                    <ClayButton
                      variant={voiceDeafened ? 'danger' : 'ghost'}
                      className="!h-8 !w-8 !p-0 !rounded-full shrink-0"
                      onClick={() => {
                        const d = !voiceDeafened;
                        setVoiceDeafened(d);
                        callRef.current?.setDeafened(d);
                      }}
                    >
                      {voiceDeafened ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </ClayButton>
                  </>
                )}
                <ClayButton
                  variant={voiceActive ? 'danger' : 'primary'}
                  className="h-8 px-3 rounded-xl text-xs font-semibold"
                  onClick={() => setVoiceActive((v) => !v)}
                >
                  {voiceActive ? 'Disconnect' : 'Connect Voice'}
                </ClayButton>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 mt-2">
              {isPrisoner ? (
                <>
                  <ClayButton
                    variant="success"
                    className="flex-1 py-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm"
                    onClick={handleSendOffer}
                  >
                    <Coins size={14} /> Send Ransom Offer ({offerCoins}c)
                  </ClayButton>
                  <ClayButton
                    variant="danger"
                    className="py-3 px-4 rounded-2xl text-xs font-semibold"
                    onClick={onDecline}
                  >
                    Surrender
                  </ClayButton>
                </>
              ) : (
                <>
                  <ClayButton
                    variant="success"
                    className="flex-1 py-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm"
                    onClick={handleAcceptRansom}
                  >
                    <Unlock size={14} /> Accept Ransom & Release
                  </ClayButton>
                  <ClayButton
                    variant="danger"
                    className="py-3 px-4 rounded-2xl text-xs font-semibold"
                    onClick={handleRejectRansom}
                  >
                    Refuse Release
                  </ClayButton>
                </>
              )}
            </div>
          </ClayPanel>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
