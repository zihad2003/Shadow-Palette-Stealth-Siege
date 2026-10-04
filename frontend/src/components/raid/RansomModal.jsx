import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Droplet, Sparkles, Mic, MicOff, Volume2, VolumeX, Unlock, Lock } from 'lucide-react';
import ClayPanel from '../ui/ClayPanel.jsx';
import ClayButton from '../ui/ClayButton.jsx';
import {
  fetchMyJailStay,
  createJailOffer,
  acceptJailOffer,
  rejectJailOffer,
} from '../../api.js';
import { ensureStompConnected, stompSubscribe, stompUnsubscribe } from '../../live/stompClient.js';
import { createDuoVoiceCall } from '../../duo/voiceCall.js';
import { soundEngine } from '../../soundEngine.js';

const MAX_ROUNDS = 3;

export default function RansomModal({
  isOpen,
  isPrisoner = true,
  jailStayId: jailStayIdProp,
  attackerId,
  defenderId,
  attackerName = 'Attacker',
  defenderName = 'Base Owner',
  playerCoins = 500,
  playerInk = 100,
  playerChips = 200,
  onRelease,
  onDecline,
}) {
  const [jailStayId, setJailStayId] = useState(jailStayIdProp || null);
  const [roundsUsed, setRoundsUsed] = useState(0);
  const [offerCoins, setOfferCoins] = useState(100);
  const [offerInk, setOfferInk] = useState(50);
  const [offerChips, setOfferChips] = useState(50);
  const [currentOffer, setCurrentOffer] = useState(null);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [voiceDeafened, setVoiceDeafened] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    isPrisoner
      ? 'You are locked in the enemy Base Jail. Negotiate ransom (up to 3 rounds) or wait for release.'
      : 'An intruder is in your Base Jail. Demand coins, ink, and points — up to 3 negotiation rounds.'
  );

  const callRef = useRef(null);
  const roundsUsedRef = useRef(0);

  useEffect(() => {
    if (jailStayIdProp) setJailStayId(jailStayIdProp);
  }, [jailStayIdProp]);

  useEffect(() => {
    if (!isOpen) return;
    if (jailStayIdProp) return;
    fetchMyJailStay()
      .then((stay) => {
        if (stay?.id) {
          setJailStayId(stay.id);
          setRoundsUsed(stay.ransomOfferCount || 0);
          roundsUsedRef.current = stay.ransomOfferCount || 0;
          const pending = [...(stay.offers || [])].reverse().find((o) => o.status === 'PENDING');
          if (pending) setCurrentOffer(pending);
        }
      })
      .catch(() => {});
  }, [isOpen, jailStayIdProp]);

  useEffect(() => {
    if (!isOpen || !attackerId || !defenderId) return undefined;
    let cancelled = false;

    const myTopic = `/topic/raid-ransom/${isPrisoner ? attackerId : defenderId}`;

    const handleMsg = (msg) => {
      if (!msg) return;
      if (msg.type === 'RANSOM_OFFER') {
        setCurrentOffer({
          id: msg.offerId,
          coins: msg.coins,
          ink: msg.ink,
          chips: msg.chips,
          message: msg.message,
          offeredBy: msg.offeredBy,
          roundNumber: msg.roundNumber,
        });
        if (msg.roundsUsed != null) {
          setRoundsUsed(msg.roundsUsed);
          roundsUsedRef.current = msg.roundsUsed;
        }
        const who = msg.offeredBy === 'CAPTOR' ? defenderName : attackerName;
        setStatusMessage(
          isPrisoner
            ? `${who} demands ${msg.coins}c · ${msg.ink || 0} ink · ${msg.chips || 0} pts — Round ${msg.roundNumber}/${MAX_ROUNDS}`
            : `${who} offers ${msg.coins}c · ${msg.ink || 0} ink · ${msg.chips || 0} pts — Round ${msg.roundNumber}/${MAX_ROUNDS}`
        );
        soundEngine.playSuccessSound();
      } else if (msg.type === 'RANSOM_ACCEPTED') {
        setStatusMessage('Ransom accepted! Jail gate opening...');
        soundEngine.playSuccessSound();
        window.setTimeout(() => {
          onRelease?.({
            coins: msg.coinsTransferred || 0,
            ink: msg.inkTransferred || 0,
            chips: msg.chipsTransferred || 0,
          });
        }, 1500);
      } else if (msg.type === 'RANSOM_REJECTED') {
        setCurrentOffer(null);
        setStatusMessage(
          `Offer declined — Round ${roundsUsedRef.current}/${MAX_ROUNDS}. ${
            roundsUsedRef.current >= MAX_ROUNDS
              ? 'No rounds left; wait for timer release.'
              : 'Negotiation continues.'
          }`
        );
        soundEngine.playWallHitSound();
      } else if (msg.type === 'EXPIRED_RELEASED') {
        setStatusMessage('Jail timer expired. You are free.');
        window.setTimeout(() => onRelease?.({ coins: 0, ink: 0, chips: 0 }), 1200);
      }
    };

    (async () => {
      try {
        await ensureStompConnected();
        if (cancelled) return;
        await stompSubscribe(myTopic, handleMsg);
      } catch {
        /* offline */
      }
    })();

    return () => {
      cancelled = true;
      stompUnsubscribe(myTopic, handleMsg);
    };
  }, [isOpen, attackerId, defenderId, isPrisoner, defenderName, attackerName, onRelease]);

  useEffect(() => {
    if (!voiceActive || !isOpen) {
      callRef.current?.stop?.();
      callRef.current = null;
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

  const roundsLeft = Math.max(0, MAX_ROUNDS - roundsUsed);
  const canOffer = roundsLeft > 0 && jailStayId;
  const defenderIsBot = Number(defenderId) >= 101 && Number(defenderId) <= 105;

  const submitOffer = async () => {
    if (!jailStayId || !canOffer) return;
    soundEngine.playClickSound();
    const msg = isPrisoner
      ? `${attackerName} offers ${offerCoins}c · ${offerInk} ink · ${offerChips} pts`
      : `${defenderName} demands ${offerCoins}c · ${offerInk} ink · ${offerChips} pts for release`;
    try {
      const dto = await createJailOffer(jailStayId, {
        coins: offerCoins,
        ink: offerInk,
        chips: offerChips,
        message: msg,
      });
      setRoundsUsed(dto.roundNumber);
      roundsUsedRef.current = dto.roundNumber;
      setCurrentOffer(dto);
      setStatusMessage(`Round ${dto.roundNumber}/${MAX_ROUNDS} sent. Waiting for response...`);
      if (defenderIsBot && !isPrisoner) {
        /* captor vs bot not applicable */
      } else if (defenderIsBot && isPrisoner && offerCoins >= 100) {
        window.setTimeout(() => onRelease?.({ coins: offerCoins, ink: offerInk, chips: offerChips }), 1500);
      }
    } catch (err) {
      const code = err?.message || '';
      if (code.includes('MAX_ROUNDS')) {
        setStatusMessage('All 3 negotiation rounds used. Wait for jail timer.');
      } else {
        setStatusMessage('Could not send offer — check your balance.');
      }
    }
  };

  const acceptPending = async () => {
    if (!currentOffer?.id) return;
    soundEngine.playClickSound();
    try {
      await acceptJailOffer(currentOffer.id);
    } catch {
      onRelease?.({
        coins: currentOffer.coins || 0,
        ink: currentOffer.ink || 0,
        chips: currentOffer.chips || 0,
      });
    }
  };

  const rejectPending = async () => {
    if (!currentOffer?.id) return;
    soundEngine.playClickSound();
    try {
      await rejectJailOffer(currentOffer.id);
    } catch {
      setCurrentOffer(null);
      setStatusMessage('Offer rejected locally.');
    }
  };

  const canAcceptPending =
    currentOffer?.id
    && ((isPrisoner && currentOffer.offeredBy === 'CAPTOR')
      || (!isPrisoner && currentOffer.offeredBy === 'PRISONER'));

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
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-clay-danger/20 text-clay-danger flex items-center justify-center">
                <Lock size={28} />
              </div>
              <div>
                <h2 className="font-heading font-extrabold text-lg text-clay-text">
                  {isPrisoner ? 'Incarcerated in Base Jail' : 'Intruder in Your Jail'}
                </h2>
                <p className="text-xs text-clay-muted">
                  Round {roundsUsed}/{MAX_ROUNDS} · {roundsLeft} left
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 text-xs text-clay-text/90 leading-relaxed">
              <p>{statusMessage}</p>
            </div>

            {currentOffer && (
              <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-xs">
                <p className="font-semibold text-amber-200 mb-1">Active offer (Round {currentOffer.roundNumber})</p>
                <p className="flex flex-wrap gap-3 text-clay-text">
                  <span className="flex items-center gap-1"><Coins size={12} /> {currentOffer.coins}c</span>
                  <span className="flex items-center gap-1"><Droplet size={12} /> {currentOffer.ink} ink</span>
                  <span className="flex items-center gap-1"><Sparkles size={12} /> {currentOffer.chips} pts</span>
                </p>
              </div>
            )}

            {canOffer && !canAcceptPending && (
              <div className="p-4 rounded-2xl bg-black/20 flex flex-col gap-3">
                <label className="text-xs text-clay-muted flex justify-between">
                  <span className="flex items-center gap-1"><Coins size={12} /> Coins</span>
                  <span>{offerCoins}</span>
                </label>
                <input type="range" min={0} max={Math.max(50, isPrisoner ? playerCoins : 500)} step={25} value={offerCoins} onChange={(e) => setOfferCoins(Number(e.target.value))} className="w-full accent-amber-400" />
                <label className="text-xs text-clay-muted flex justify-between">
                  <span className="flex items-center gap-1"><Droplet size={12} /> Ink</span>
                  <span>{offerInk}</span>
                </label>
                <input type="range" min={0} max={Math.max(10, isPrisoner ? playerInk : 200)} step={5} value={offerInk} onChange={(e) => setOfferInk(Number(e.target.value))} className="w-full accent-cyan-400" />
                <label className="text-xs text-clay-muted flex justify-between">
                  <span className="flex items-center gap-1"><Sparkles size={12} /> Points</span>
                  <span>{offerChips}</span>
                </label>
                <input type="range" min={0} max={Math.max(10, isPrisoner ? playerChips : 300)} step={5} value={offerChips} onChange={(e) => setOfferChips(Number(e.target.value))} className="w-full accent-purple-400" />
              </div>
            )}

            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${voiceActive ? 'bg-clay-success/20 text-clay-success' : 'bg-white/10 text-clay-muted'}`}>
                  {voiceActive ? <Mic size={16} /> : <MicOff size={16} />}
                </div>
                <p className="text-xs font-semibold text-clay-text">Jail Voice Intercom</p>
              </div>
              <ClayButton variant={voiceActive ? 'danger' : 'primary'} className="h-8 px-3 rounded-xl text-xs" onClick={() => setVoiceActive((v) => !v)}>
                {voiceActive ? 'Disconnect' : 'Connect'}
              </ClayButton>
            </div>

            <div className="flex items-center gap-3 mt-1">
              {canAcceptPending ? (
                <>
                  <ClayButton variant="success" className="flex-1 py-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2" onClick={acceptPending}>
                    <Unlock size={14} /> Accept & Pay
                  </ClayButton>
                  <ClayButton variant="danger" className="py-3 px-4 rounded-2xl text-xs font-semibold" onClick={rejectPending}>
                    Decline
                  </ClayButton>
                </>
              ) : canOffer ? (
                <ClayButton variant="success" className="flex-1 py-3 rounded-2xl text-xs font-semibold" onClick={submitOffer}>
                  {isPrisoner ? 'Send Counter-Offer' : 'Demand Ransom'}
                </ClayButton>
              ) : (
                <p className="text-xs text-clay-muted text-center w-full">Waiting for jail timer or opponent...</p>
              )}
            </div>
          </ClayPanel>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
