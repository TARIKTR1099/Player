import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';

const EQ_FREQUENCIES = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export const useAudioPlayer = () => {
  const audioRef = useRef(new Audio());
  const contextRef = useRef(null);
  const sourceRef = useRef(null);
  const preGainRef = useRef(null);
  const postGainRef = useRef(null);
  const eqNodesRef = useRef([]);
  const effectsRef = useRef({});
  const analyserRef = useRef(null);
  const initializedRef = useRef(false);
  const isLiveRef = useRef(false);
  const expanderNodeRef = useRef(null);
  const compressorNodeRef = useRef(null);
  const pannerNodeRef = useRef(null);
  const convolverRef = useRef(null);
  const convolverGainRef = useRef(null);
  const delayNodeRef = useRef(null);
  const delayFeedbackRef = useRef(null);
  const delayWetRef = useRef(null);
  const bypassGainRef = useRef(null);
  const chainGainRef = useRef(null);

  const initAudioContext = useCallback(() => {
    if (initializedRef.current) return;
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    contextRef.current = ctx;
    
    const source = ctx.createMediaElementSource(audioRef.current);
    sourceRef.current = source;
    
    // Pre-Gain
    const preGain = ctx.createGain();
    preGain.gain.value = 1;
    preGainRef.current = preGain;
    
    // Expander (simulated with highpass + gain automation)
    const expanderHP = ctx.createBiquadFilter();
    expanderHP.type = 'highpass';
    expanderHP.frequency.value = 20;
    expanderNodeRef.current = { filter: expanderHP, active: false };
    
    // Create 10-band EQ
    const eqNodes = [];
    for (let i = 0; i < EQ_FREQUENCIES.length; i++) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = EQ_FREQUENCIES[i];
      filter.Q.value = 1.0;
      filter.gain.value = 0;
      eqNodes.push(filter);
    }
    eqNodesRef.current = eqNodes;
    
    // Full Compressor
    const compressor = ctx.createDynamicsCompressor();
    compressorNodeRef.current = compressor;
    
    // Spatial Audio
    const panner = ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 100;
    panner.rolloffFactor = 1;
    pannerNodeRef.current = panner;
    
    // Reverb (Convolver) + wet gain (controlled by ambience)
    const convolver = ctx.createConvolver();
    convolverRef.current = convolver;
    const convolverGain = ctx.createGain();
    convolverGain.gain.value = 0; // default: ambience off
    convolverGainRef.current = convolverGain;
    
    // Delay
    const delayNode = ctx.createDelay(5);
    delayNode.delayTime.value = 0.3;
    delayNodeRef.current = delayNode;
    
    const delayFeedback = ctx.createGain();
    delayFeedback.gain.value = 0;
    delayFeedbackRef.current = delayFeedback;
    
    const delayWet = ctx.createGain();
    delayWet.gain.value = 0;
    delayWetRef.current = delayWet;
    
    // Post-Gain (volume)
    const postGain = ctx.createGain();
    postGainRef.current = postGain;
    
    // Legacy effects (clarity, bassBoost, dynamicBoost)
    const effects = {};
    const clarity = ctx.createBiquadFilter();
    clarity.type = 'highshelf';
    clarity.frequency.value = 4000;
    clarity.gain.value = 0;
    effects.clarity = clarity;
    
    const bass = ctx.createBiquadFilter();
    bass.type = 'lowshelf';
    bass.frequency.value = 200;
    bass.gain.value = 0;
    effects.bassBoost = bass;
    
    const dynamicCompressor = ctx.createDynamicsCompressor();
    dynamicCompressor.threshold.value = -32;
    dynamicCompressor.knee.value = 30;
    dynamicCompressor.ratio.value = 1;
    dynamicCompressor.attack.value = 0.003;
    dynamicCompressor.release.value = 0.25;
    const dynamicGain = ctx.createGain();
    dynamicGain.gain.value = 1;
    effects.dynamicBoost = { compressor: dynamicCompressor, gain: dynamicGain };
    effectsRef.current = effects;
    
    // Connect pipeline: source → preGain → expander → EQ → [legacy clarity+bass+dynamic] → compressor → spatial → delay → postGain → analyser → destination
    
    let lastNode = source;
    
    // preGain
    lastNode.connect(preGain);
    lastNode = preGain;
    
    // Expander
    lastNode.connect(expanderHP);
    lastNode = expanderHP;
    
    // EQ chain
    for (const filter of eqNodes) {
      lastNode.connect(filter);
      lastNode = filter;
    }
    
    // Legacy effects (clarity, bass, dynamicBoost)
    lastNode.connect(clarity);
    lastNode = clarity;
    lastNode.connect(bass);
    lastNode = bass;
    lastNode.connect(dynamicCompressor);
    lastNode = dynamicCompressor;
    lastNode.connect(dynamicGain);
    lastNode = dynamicGain;
    
    // Full compressor
    lastNode.connect(compressor);
    lastNode = compressor;
    
    // Spatial: panner → convolver (reverb with ambience gain control)
    lastNode.connect(panner);
    lastNode = panner;
    lastNode.connect(convolver);
    convolver.connect(convolverGain);
    convolverGain.connect(delayNode); // reverb goes through ambience-controlled gain
    // Dry path for reverb bypass: panner also connects directly to merge point
    // (done below via mergeGain)
    
    // Delay: split to wet/dry
    // Dry path: straight to mergeGain
    // Wet path: delayNode → feedback → delayWet → mergeGain
    const mergeGain = ctx.createGain();
    mergeGain.gain.value = 1;
    lastNode.connect(delayNode);
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode); // feedback loop
    delayNode.connect(delayWet);
    
    // Merge back at mergeGain (instead of postGain)
    lastNode.connect(mergeGain);
    delayWet.connect(mergeGain);
    
    // Stereo widening (Surround) — inserted into the chain
    const splitter = ctx.createChannelSplitter(2);
    const merger = ctx.createChannelMerger(2);
    const gainL = ctx.createGain();
    gainL.gain.value = 1;
    const gainR = ctx.createGain();
    gainR.gain.value = 1;
    const gainS = ctx.createGain();
    gainS.gain.value = 0; // cross-feed amount (0 = off)
    effects.surround = { splitter, merger, gainL, gainR, gainS, active: true };
    // Wire: mergeGain → splitter → [gainL→merger L, gainR→merger R, gainS cross-feed] → chainGain
    mergeGain.connect(splitter);
    splitter.connect(gainL, 0);      // L channel
    splitter.connect(gainR, 1);      // R channel
    splitter.connect(gainS, 0);      // cross-feed from L
    gainL.connect(merger, 0, 0);     // L → merger L input
    gainR.connect(merger, 0, 1);     // R → merger R input
    gainS.connect(merger, 0, 1);     // cross-feed L → merger R input (adds L signal to R)
    
    // Bypass switch nodes
    // chainGain: controls flow THROUGH the processing chain
    const chainGain = ctx.createGain();
    chainGain.gain.value = 1;
    chainGainRef.current = chainGain;
    merger.connect(chainGain);
    
    // bypassGain: direct path from source to analyser (skips all processing)
    const bypassGain = ctx.createGain();
    bypassGain.gain.value = 1;  // start with bypass ON (pristine audio)
    bypassGainRef.current = bypassGain;
    
    // Analyser
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.85;
    analyserRef.current = analyser;
    
    // Connect: processed path ends at mergeGain → chainGain → analyser
    mergeGain.connect(chainGain);
    chainGain.connect(analyser);
    
    // Connect: direct path source → bypassGain → analyser (skips all processing)
    source.connect(bypassGain);
    bypassGain.connect(analyser);
    
    // Volume postGain is now the LAST node before destination —
    // BOTH processed and bypass paths flow through it
    analyser.connect(postGain);
    postGain.connect(ctx.destination);
    
    initializedRef.current = true;
    
    // Apply initial state
    const state = useStore.getState();
    postGain.gain.value = state.volume / 100;
    applyEffects(state.audioEffects);
    applyEqualizer(state.equalizerBands);
    applyAudioV2(state.audioV2);
    
    // Apply bypass state from store
    if (state.effectsBypass !== undefined) {
      applyBypass(state.effectsBypass);
    }
    
    // Generate impulse response for reverb
    generateImpulseResponse(ctx).then(buf => {
      if (convolverRef.current) {
        convolverRef.current.buffer = buf;
        convolverRef.current.normalize = true;
      }
    });
    
    return () => {};
  }, []);

  function generateImpulseResponse(ctx) {
    return new Promise((resolve) => {
      const length = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
      const channels = [buffer.getChannelData(0), buffer.getChannelData(1)];
      for (let ch = 0; ch < 2; ch++) {
        const data = channels[ch];
        for (let i = 0; i < length; i++) {
          const t = i / ctx.sampleRate;
          const decay = Math.exp(-t * 3);
          data[i] = (Math.random() * 2 - 1) * decay * (1 - i / length);
        }
      }
      resolve(buffer);
    });
  }

  const applyEqualizer = useCallback((bands) => {
    if (!eqNodesRef.current.length) return;
    const eqNodes = eqNodesRef.current;
    for (let i = 0; i < Math.min(bands.length, eqNodes.length); i++) {
      eqNodes[i].gain.value = bands[i];
    }
  }, []);

  const applyEffects = useCallback((effects) => {
    const eff = effectsRef.current;
    if (!eff.clarity) return;
    eff.clarity.gain.value = (effects.clarity || 0) * 0.12;
    eff.bassBoost.gain.value = (effects.bassBoost || 0) * 0.12;
    const boost = effects.dynamicBoost || 0;
    eff.dynamicBoost.compressor.threshold.value = -32 + boost * 0.18;
    eff.dynamicBoost.compressor.ratio.value = 1 + boost * 0.08;
    eff.dynamicBoost.gain.gain.value = 1 + boost * 0.012;
    // Fix: ambience → reverb mix (convolver wet gain)
    if (convolverGainRef.current) {
      const amb = (effects.ambience || 0) / 100;
      convolverGainRef.current.gain.value = amb * amb; // quadratic curve for natural feel
    }
    // Fix: surround → stereo widening (cross-feed)
    if (eff.surround && eff.surround.active) {
      const sur = (effects.surround || 0) / 100;
      // gainL, gainR stay at 1 (keep original channels)
      // gainS cross-feed adds L signal to R channel inversely proportional
      eff.surround.gainS.gain.value = sur * 0.35; // max 35% cross-feed
    }
  }, []);

  const applyAudioV2 = useCallback((audioV2) => {
    if (!compressorNodeRef.current) return;
    
    // Compressor (only active when threshold < 0)
    const comp = audioV2.compressor;
    if (comp.threshold < 0) {
      compressorNodeRef.current.threshold.value = comp.threshold;
      compressorNodeRef.current.ratio.value = comp.ratio;
      compressorNodeRef.current.knee.value = comp.knee;
      compressorNodeRef.current.attack.value = comp.attack;
      compressorNodeRef.current.release.value = comp.release;
    } else {
      // Passive: threshold=0, ratio=1 (no compression)
      compressorNodeRef.current.threshold.value = 0;
      compressorNodeRef.current.ratio.value = 1;
    }
    
    // Spatial
    if (pannerNodeRef.current) {
      const sp = audioV2.spatial;
      if (sp.enabled) {
        pannerNodeRef.current.positionX.value = sp.positionX;
        pannerNodeRef.current.positionY.value = sp.positionY;
        pannerNodeRef.current.positionZ.value = sp.positionZ;
        pannerNodeRef.current.coneInnerAngle = sp.coneInnerAngle;
        pannerNodeRef.current.coneOuterAngle = sp.coneOuterAngle;
        pannerNodeRef.current.coneOuterGain = sp.coneOuterGain;
        pannerNodeRef.current.distanceModel = sp.distanceModel;
      }
      if (convolverRef.current) {
        convolverRef.current.normalize = true;
      }
    }
    
    // Delay
    if (delayNodeRef.current && delayFeedbackRef.current && delayWetRef.current) {
      const dl = audioV2.delay;
      if (dl.enabled) {
        delayNodeRef.current.delayTime.value = dl.time;
        delayFeedbackRef.current.gain.value = dl.feedback;
        delayWetRef.current.gain.value = dl.wetDry;
      } else {
        delayFeedbackRef.current.gain.value = 0;
        delayWetRef.current.gain.value = 0;
      }
    }
    
    // Expander (simulated)
    if (expanderNodeRef.current) {
      const ex = audioV2.expander;
      if (ex.enabled) {
        // Use highpass to simulate expander effect
        const freq = Math.max(20, Math.min(2000, Math.abs(ex.threshold) * 20));
        expanderNodeRef.current.filter.frequency.value = freq;
      } else {
        expanderNodeRef.current.filter.frequency.value = 20;
      }
    }
  }, []);

  const applyBypass = useCallback((bypass) => {
    if (bypassGainRef.current && chainGainRef.current) {
      // When bypass=true: direct path active, processing chain muted
      bypassGainRef.current.gain.value = bypass ? 1 : 0;
      chainGainRef.current.gain.value = bypass ? 0 : 1;
    }
  }, []);

  const { isPlaying, currentTrack, playId, volume, playbackRate, setProgress, setDuration, setLastPlayedTrack } = useStore();
  const lastSaveRef = useRef(0);

  useEffect(() => {
    const audio = audioRef.current;
    const onTimeUpdate = () => {
      setProgress(audio.currentTime);
      if (currentTrack && Date.now() - lastSaveRef.current > 5000) {
        lastSaveRef.current = Date.now();
        setLastPlayedTrack(currentTrack, audio.currentTime);
      }
    };
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => useStore.getState().nextTrack();
    const onPlay = () => {
      if (contextRef.current && contextRef.current.state === 'suspended') {
        contextRef.current.resume();
      }
    };
    const onError = () => {
      const errMsg = audio.error ? `Audio error: ${audio.error.code} - ${audio.error.message}` : 'Unknown audio error';
      console.warn(errMsg);
    };
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('error', onError);
    };
  }, []);

  useEffect(() => {
    if (currentTrack) {
      let url = currentTrack.url || currentTrack.streamUrl || '';
      if (!url && currentTrack.location) {
        url = 'file:///' + currentTrack.location.replace(/\\/g, '/');
      }
      if (url) {
        audioRef.current.src = url;
        audioRef.current.load();
      }
    }
  }, [currentTrack, playId]);

  useEffect(() => {
    if (isPlaying && currentTrack) {
      if (!initializedRef.current) {
        try { initAudioContext(); } catch(e) {}
      }
      const audio = audioRef.current;
      if (audio.readyState >= 2) {
        const playPromise = audio.play();
        if (playPromise !== undefined) playPromise.catch(() => {});
      } else {
        const onCanPlay = () => {
          audio.removeEventListener('canplay', onCanPlay);
          const playPromise = audio.play();
          if (playPromise !== undefined) playPromise.catch(() => {});
        };
        audio.addEventListener('canplay', onCanPlay, { once: true });
      }
      isLiveRef.current = true;
    } else {
      audioRef.current.pause();
      isLiveRef.current = false;
    }
  }, [isPlaying, currentTrack, playId]);

  useEffect(() => {
    if (postGainRef.current) {
      postGainRef.current.gain.value = volume / 100;
    } else {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  useEffect(() => {
    audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    let prevEq = useStore.getState().equalizerBands;
    let prevEffects = useStore.getState().audioEffects;
    let prevAudioV2 = useStore.getState().audioV2;
    let prevBypass = useStore.getState().effectsBypass;
    
    const unsub = useStore.subscribe((state) => {
      if (state.equalizerBands !== prevEq) {
        prevEq = state.equalizerBands;
        applyEqualizer(state.equalizerBands);
      }
      if (state.audioEffects !== prevEffects) {
        prevEffects = state.audioEffects;
        applyEffects(state.audioEffects);
      }
      if (state.audioV2 !== prevAudioV2) {
        prevAudioV2 = state.audioV2;
        applyAudioV2(state.audioV2);
      }
      if (state.effectsBypass !== prevBypass) {
        prevBypass = state.effectsBypass;
        applyBypass(state.effectsBypass);
      }
    });
    
    return () => unsub();
  }, []);

  return { audioRef, analyserRef };
};
