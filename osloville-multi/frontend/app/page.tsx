'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, useCallback } from 'react';
import { socket, getBackendUrl } from '@/lib/socket';
import { audio } from '@/lib/audioEngine';
import { getDistrictForPosition } from '@/lib/districts';
import { getDailyShop, coinPopAnimation } from '@/lib/economy';
import { fetchOsloWeather, OsloWeather } from '@/lib/weather';
import { findPath } from '@/lib/pathfinding';
import { xpToLevel, BADGES, SEASON_1 } from '@/lib/progression';
import { t, Lang, detectLang, localeFor, weatherLabel } from '@/lib/i18n';
import { xyToLatLng } from '@/lib/geo';
import { track, getFunnel } from '@/lib/analytics';
import { screenShake, popScale, slowMo } from '@/lib/juice';
import { getNpcResponse, getNearbyNpc, NPCS } from '@/lib/aiNpcs';
import { MobileJoystick } from './components/MobileJoystick';

const RealOsloMap = dynamic(() => import('./components/RealOsloMap').then(module => module.RealOsloMap), { ssr: false });

const MAP_SIZE = { w: 2400, h: 1800 };
const LANDMARKS = [
  { id: 'opera', name: 'Opera House', emoji: '🎭', x: 1594, y: 1406, lat: 59.9075, lng: 10.7528, desc: 'Walk on the roof!' },
  { id: 'palace', name: 'Royal Palace', emoji: '🏰', x: 1291, y: 1193, lat: 59.9170, lng: 10.7276, desc: 'Guard change noon' },
  { id: 'vigeland', name: 'Vigeland Park', emoji: '🌳', x: 960, y: 968, lat: 59.927, lng: 10.7, desc: '212 sculptures' },
  { id: 'akershus', name: 'Akershus Fortress', emoji: '⚔️', x: 1404, y: 1418, lat: 59.907, lng: 10.737, desc: 'Castle & history' },
  { id: 'akerbrygge', name: 'Aker Brygge', emoji: '⛵', x: 1224, y: 1395, lat: 59.908, lng: 10.722, desc: 'Fjord promenade' },
  { id: 'karljohan', name: 'Karl Johan Gate', emoji: '🛍️', x: 1428, y: 1283, lat: 59.913, lng: 10.739, desc: 'Main street buzz' },
  { id: 'holmenkollen', name: 'Holmenkollen', emoji: '⛷️', x: 576, y: 158, lat: 59.963, lng: 10.668, desc: 'Epic ski jump!' },
  { id: 'gruner', name: 'Grünerløkka', emoji: '☕', x: 1644, y: 1058, lat: 59.923, lng: 10.757, desc: 'Hip coffee district' },
];
const MOCK_NAMES = [
  { name: 'Ingrid Ø.', statusKey: 'bot.ingrid', color: '#FF8FA3' },
  { name: 'Magnus L.', statusKey: 'bot.magnus', color: '#7DD8C6' },
  { name: 'Sofia K.', statusKey: 'bot.sofia', color: '#A78BFA' },
  { name: 'Jonas P.', statusKey: 'bot.jonas', color: '#FBBF24' },
];
const SHOP_ITEMS = [
  { id: 'hat_beanie', name: 'Wool Beanie', emoji: '🧶', price: 80, type: 'hat', rarity: 'common' },
  { id: 'hat_cap', name: 'Oslo Cap', emoji: '🧢', price: 120, type: 'hat', rarity: 'common' },
  { id: 'hat_crown', name: 'Viking Crown', emoji: '👑', price: 800, type: 'hat', rarity: 'legendary' },
  { id: 'hat_helmet', name: 'Ski Helmet', emoji: '⛑️', price: 150, type: 'hat', rarity: 'rare' },
  { id: 'hat_bow', name: 'Cute Bow', emoji: '🎀', price: 90, type: 'hat', rarity: 'common' },
  { id: 'acc_coffee', name: 'Takeaway Coffee', emoji: '☕', price: 60, type: 'acc', rarity: 'common' },
  { id: 'acc_scarf', name: 'Knitted Scarf', emoji: '🧣', price: 100, type: 'acc', rarity: 'common' },
  { id: 'acc_headphones', name: 'Headphones', emoji: '🎧', price: 180, type: 'acc', rarity: 'rare' },
  { id: 'acc_mitten', name: 'Mittens', emoji: '🧤', price: 85, type: 'acc', rarity: 'common' },
];

type CollectibleType = 'coin' | 'heart' | 'gem' | 'coffee' | 'mitten';
type CosmeticType = 'hat' | 'acc';
type PhotoFilter = 'vivid' | 'cozy' | 'aurora' | 'vintage';

type Player = {
  id: string;
  name: string;
  email?: string | null;
  avatarUrl?: string;
  avatar_url?: string;
  avatar?: string;
  x: number;
  y: number;
  lat?: number;
  lng?: number;
  status: string;
  hat?: string;
  acc?: string;
  color?: string;
  coins?: number;
  xp?: number;
  level: number;
  walkKm?: number;
  discovered?: string[];
  moving?: boolean;
  targetX?: number | null;
  targetY?: number | null;
};

type ChatMessage = {
  id: string;
  name: string;
  text: string;
  avatarUrl?: string;
  avatar_url?: string;
  playerId?: string;
  player_id?: string;
};

type Collectible = {
  id: string;
  x: number;
  y: number;
  icon: string;
  type: CollectibleType;
  collected: boolean;
};

type Quest = {
  id: string;
  icon: string;
  titleKey: string;
  progress: number;
  total: number;
  done: boolean;
  reward: number;
};

type ShopItem = (typeof SHOP_ITEMS)[number];
type LoginUser = Partial<Player> & { googleToken?: string };

const avatarOf = (player: Pick<Player, 'avatarUrl' | 'avatar_url' | 'avatar'>) =>
  player.avatarUrl || player.avatar_url || player.avatar || '/assets/characters.png';

const createOfflineBots = (origin: Player | null, lang: Lang): Player[] => {
  const x = origin?.x ?? 1100;
  const y = origin?.y ?? 850;
  return MOCK_NAMES.map((bot, index) => ({
    id: `offline_bot_${index}`,
    name: bot.name,
    status: t(bot.statusKey, lang),
    avatarUrl: `https://i.pravatar.cc/100?img=${11 + index}`,
    x: x + (index % 2 === 0 ? -1 : 1) * (180 + index * 36),
    y: y + (index < 2 ? -1 : 1) * (130 + index * 28),
    color: bot.color,
    hat: index % 2 ? '🧶' : '🧢',
    acc: index % 2 ? '☕' : '🧣',
    level: 5 + index,
  }));
};

export default function Page() {
  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [statusInput, setStatusInput] = useState('Hei Oslo! 👋');
  const [chatInput, setChatInput] = useState('');
  const [coinCount, setCoinCount] = useState(1240);
  const [xp, setXp] = useState(620);
  const [walkKm, setWalkKm] = useState(2.4);
  const [mapZoomRequest, setMapZoomRequest] = useState(0);
  const [mapFocus, setMapFocus] = useState<{ x: number; y: number; nonce: number }>({ x: 0, y: 0, nonce: 0 });
  const [nightMode, setNightMode] = useState(false);
  const [snowEnabled, setSnowEnabled] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [showShop, setShowShop] = useState(false);
  const [showBag, setShowBag] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChooser, setShowChooser] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState<Player | null>(null);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState('gameplay');
  const [feedbackSeverity, setFeedbackSeverity] = useState<'blocker' | 'major' | 'minor' | 'idea'>('minor');
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackReproduction, setFeedbackReproduction] = useState('');
  const [notice, setNotice] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(8);
  const [fps, setFps] = useState(60);
  const [weather, setWeather] = useState<OsloWeather | null>(null);
  const [lang, setLang] = useState<Lang>('en');
  const [customHat, setCustomHat] = useState('🧶');
  const [customAcc, setCustomAcc] = useState('☕');
  const [customColor, setCustomColor] = useState('#2A9D8F');
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [discovered, setDiscovered] = useState<Set<string>>(new Set(['palace', 'karljohan']));
  const [inventory, setInventory] = useState<Record<string, number>>({ hat_beanie: 1, acc_coffee: 1 });
  const [quests, setQuests] = useState<Quest[]>([
    { id: 'q1', icon: '👋', titleKey: 'quest.q1', progress: 0, total: 3, done: false, reward: 120 },
    { id: 'q2', icon: '☕', titleKey: 'quest.q2', progress: 0, total: 1, done: false, reward: 80 },
    { id: 'q3', icon: '🪙', titleKey: 'quest.q3', progress: 0, total: 5, done: false, reward: 150 },
    { id: 'q4', icon: '🌌', titleKey: 'quest.q4', progress: 0, total: 1, done: false, reward: 200 },
  ]);
  const questsRef = useRef<Quest[]>([]);
  const [socketStatus, setSocketStatus] = useState<'offline' | 'connecting' | 'connected'>('offline');
  const [googleClientId, setGoogleClientId] = useState('');

  const toggleLanguage = useCallback(() => {
    setLang(previous => {
      const next: Lang = previous === 'en' ? 'ru' : 'en';
      localStorage.setItem('oslo_lang', next);
      return next;
    });
  }, []);

  const parseJwt = (token: string): Record<string, string> | null => {
    try {
      const encoded = token.split('.')[1];
      if (!encoded) return null;
      const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map(char => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
          .join(''),
      );
      return JSON.parse(json) as Record<string, string>;
    } catch {
      return null;
    }
  };
  const [pathPreview, setPathPreview] = useState<{x:number,y:number}[]>([]);
  const [nearbyNpc, setNearbyNpc] = useState<(typeof NPCS)[number] | null>(null);
  const [levelUpShow, setLevelUpShow] = useState<{from:number,to:number}|null>(null);
  const [photoFilter, setPhotoFilter] = useState<PhotoFilter>('vivid');
  const [badges, setBadges] = useState<string[]>([]);

  const viewportRef = useRef<HTMLDivElement>(null);
  const snowCanvasRef = useRef<HTMLCanvasElement>(null);
  const lastSyncRef = useRef(0);
  const pathQueueRef = useRef<{x:number,y:number}[]>([]);
  const sessionRef = useRef<{ id: string; name: string; email: string | null; avatarUrl: string; googleToken?: string } | null>(null);
  const currentUserRef = useRef<Player | null>(null);
  const collectionCooldownRef = useRef(new Map<string, number>());
  const claimedCollectiblesRef = useRef(new Set<string>());
  const langRef = useRef<Lang>('en');

  // Lang detect
  useEffect(() => { setLang(detectLang()); }, []);
  useEffect(() => {
    langRef.current = lang;
    document.documentElement.lang = lang;
    if (!currentUserRef.current) setStatusInput(t('status.default', lang));
    setPlayers(previous => previous.map(player => {
      const match = player.id.startsWith('offline_bot_') ? MOCK_NAMES[Number(player.id.replace('offline_bot_', ''))] : undefined;
      return match ? { ...player, status: t(match.statusKey, lang) } : player;
    }));
  }, [lang]);
  useEffect(() => { questsRef.current = quests; }, [quests]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  // Loading
  useEffect(() => {
    const iv = setInterval(() => {
      setLoadingProgress(p => {
        const np = Math.min(100, p + Math.random() * 18 + 6);
        if (np >= 100) { clearInterval(iv); const saved = localStorage.getItem('oslo_user_next'); if (saved) try { const u = JSON.parse(saved); setTimeout(() => loginAs(u), 300); } catch {} }
        return np;
      });
    }, 180);
    return () => clearInterval(iv);
  }, []);

  // Weather real
  useEffect(() => { fetchOsloWeather().then(w => { setWeather(w); if (w.isSnow) setSnowEnabled(true); audio.init(); audio.ambient(w.temp); }); }, []);

  // Load config from backend
  useEffect(() => {
    fetch(getBackendUrl() + '/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.googleClientId) {
          setGoogleClientId(data.googleClientId);
        }
      })
      .catch(err => console.warn('Could not load backend config, using default client ID:', err));
  }, []);

  // Socket.io event bindings
  useEffect(() => {
    const onConnect = () => {
      setSocketStatus('connected');
      setPlayers(previous => previous.filter(player => !player.id.startsWith('offline_bot_')));
      // Socket.io reconnects transparently; the game session must be joined
      // again because the backend intentionally forgets disconnected sockets.
      if (sessionRef.current) socket.emit('join', sessionRef.current);
    };
    const onDisconnect = () => {
      setSocketStatus('offline');
    };
    const onConnectError = () => {
      setSocketStatus('offline');
      setPlayers(previous => previous.some(player => player.id.startsWith('offline_bot_'))
        ? previous
        : [...previous, ...createOfflineBots(currentUserRef.current, langRef.current)]);
    };

    const onJoinSuccess = (data: {
      player: any;
      inventory: any;
      otherPlayers: any[];
      chatHistory: any[];
    }) => {
      setCurrentUser(data.player);
      setInventory(data.inventory);
      setPlayers(data.otherPlayers);
      setChat(data.chatHistory.map((m: any) => ({
        id: m.id,
        name: m.name,
        text: m.text,
        avatar_url: m.avatarUrl,
        player_id: m.playerId,
      })));
      setCoinCount(data.player.coins);
      setXp(data.player.xp);
      setWalkKm(data.player.walkKm);
      setCustomHat(data.player.hat || '');
      setCustomAcc(data.player.acc || '');
      setCustomColor(data.player.color || '#2A9D8F');
    };

    const onPlayerJoined = (player: any) => {
      setPlayers(prev => {
        const ex = prev.find(x => x.id === player.id);
        if (ex) return prev.map(x => x.id === player.id ? { ...x, ...player } : x);
        return [...prev, player];
      });
    };

    const onPlayerMoved = (player: any) => {
      setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, ...player } : p));
    };

    const onPlayerLeft = (playerId: string) => {
      setPlayers(prev => prev.filter(p => p.id !== playerId));
    };

    const onPlayerUpdated = (player: any) => {
      setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, ...player } : p));
    };

    const onChatMessage = (m: any) => {
      setChat(prev => [
        ...prev.slice(-29), 
        { id: m.id, name: m.name, text: m.text, avatar_url: m.avatarUrl, player_id: m.playerId }
      ]);
    };

    const onItemCollected = (data: { itemId: string; collectorId: string }) => {
      claimedCollectiblesRef.current.add(data.itemId);
      setCollectibles(prev => prev.map(c => c.id === data.itemId ? { ...c, collected: true } : c));
      if (data.collectorId === currentUserRef.current?.id) advanceQuest('q3');
    };
    const onWorldState = (data: { claimedItemIds?: string[] }) => {
      const claimed = Array.isArray(data.claimedItemIds) ? data.claimedItemIds : [];
      claimed.forEach(itemId => claimedCollectiblesRef.current.add(itemId));
      setCollectibles(previous => previous.map(item => claimedCollectiblesRef.current.has(item.id) ? { ...item, collected: true } : item));
    };

    const onHudUpdate = (data: { coins: number; xp: number; level: number }) => {
      setCoinCount(data.coins);
      setXp(data.xp);
      setCurrentUser(previous => previous ? { ...previous, coins: data.coins, xp: data.xp, level: data.level } : previous);
    };
    const onDiscoveryUnlocked = (data: { landmarkIds?: string[] }) => {
      const landmarkIds = Array.isArray(data.landmarkIds) ? data.landmarkIds : [];
      if (!landmarkIds.length) return;
      setDiscovered(previous => new Set([...previous, ...landmarkIds]));
      landmarkIds.forEach(id => {
        track('landmark_discover', id);
        if (id === 'gruner') advanceQuest('q2');
      });
      setNotice(t(landmarkIds.length > 1 ? 'notice.discovery.many' : 'notice.discovery.one', langRef.current, { count: landmarkIds.length, coins: landmarkIds.length * 30 }));
    };

    const onShopSuccess = (data: { coins: number; inventory: any; player: any }) => {
      setCoinCount(data.coins);
      setInventory(data.inventory);
      setCurrentUser(prev => prev ? { ...prev, coins: data.coins, hat: data.player.hat, acc: data.player.acc } : prev);
      setCustomHat(data.player.hat || '');
      setCustomAcc(data.player.acc || '');
    };

    const onWavedAt = (data: { senderId: string; senderName: string }) => {
      audio.pop();
    };

    const onPlayerWaved = (data: { senderId: string; targetId: string }) => {
      const wrap = document.querySelector(`[data-id="${data.senderId}"] .avatar-wrap`);
      if (wrap) {
        wrap.animate([
          { transform: 'rotate(0)' },
          { transform: 'rotate(-12deg)' },
          { transform: 'rotate(12deg)' },
          { transform: 'rotate(0)' }
        ], { duration: 500, easing: 'ease-in-out' });
      }
    };
    const onPlaytestReported = () => {
      setNotice(t('feedback.sent', langRef.current));
      setShowFeedback(false);
      setFeedbackTitle('');
      setFeedbackReproduction('');
    };
    const onActionRejected = (data: { event?: string; code?: string; itemId?: string }) => {
      if (data.event === 'playtest_report') setNotice(t('feedback.failed', langRef.current));
      if (data.event === 'collect' && data.itemId) {
        collectionCooldownRef.current.set(data.itemId, Date.now() + 1_500);
        setCollectibles(previous => previous.map(item => item.id === data.itemId ? { ...item, collected: false } : item));
        setNotice(t(data.code === 'TOO_FAR_AWAY' ? 'notice.pickupTooFar' : 'notice.pickupGone', langRef.current));
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('join_success', onJoinSuccess);
    socket.on('player_joined', onPlayerJoined);
    socket.on('player_moved', onPlayerMoved);
    socket.on('player_left', onPlayerLeft);
    socket.on('player_updated', onPlayerUpdated);
    socket.on('chat_message', onChatMessage);
    socket.on('item_collected', onItemCollected);
    socket.on('world_state', onWorldState);
    socket.on('hud_update', onHudUpdate);
    socket.on('discovery_unlocked', onDiscoveryUnlocked);
    socket.on('shop_success', onShopSuccess);
    socket.on('waved_at', onWavedAt);
    socket.on('player_waved', onPlayerWaved);
    socket.on('playtest_reported', onPlaytestReported);
    socket.on('action_rejected', onActionRejected);

    if (socket.connected) {
      setSocketStatus('connected');
    } else {
      setSocketStatus('offline');
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('join_success', onJoinSuccess);
      socket.off('player_joined', onPlayerJoined);
      socket.off('player_moved', onPlayerMoved);
      socket.off('player_left', onPlayerLeft);
      socket.off('player_updated', onPlayerUpdated);
      socket.off('chat_message', onChatMessage);
      socket.off('item_collected', onItemCollected);
      socket.off('world_state', onWorldState);
      socket.off('hud_update', onHudUpdate);
      socket.off('discovery_unlocked', onDiscoveryUnlocked);
      socket.off('shop_success', onShopSuccess);
      socket.off('waved_at', onWavedAt);
      socket.off('player_waved', onPlayerWaved);
      socket.off('playtest_reported', onPlaytestReported);
      socket.off('action_rejected', onActionRejected);
    };
  }, []);

  // The backend supplies one deterministic daily world. This keeps every
  // connected player looking at the same pickups and lets the server validate
  // a collection against position. A local world still exists for offline play.
  useEffect(() => {
    const offlineIcons: Array<Pick<Collectible, 'icon' | 'type'>> = [
      { icon: '🪙', type: 'coin' }, { icon: '💖', type: 'heart' },
      { icon: '💎', type: 'gem' }, { icon: '☕', type: 'coffee' },
    ];
    const offlineWorld = Array.from({ length: 22 }, (_, index): Collectible => {
      const item = offlineIcons[Math.floor(Math.random() * offlineIcons.length)];
      return { id: `c${index}`, x: 100 + Math.random() * 2200, y: 100 + Math.random() * 1600, ...item, collected: false };
    });
    setCollectibles(offlineWorld);

    fetch(`${getBackendUrl()}/api/world`)
      .then(response => response.ok ? response.json() : Promise.reject(new Error('World unavailable')))
      .then((data: { collectibles?: Omit<Collectible, 'collected'>[]; claimedItemIds?: string[] }) => {
        if (!Array.isArray(data.collectibles)) return;
        (Array.isArray(data.claimedItemIds) ? data.claimedItemIds : []).forEach(itemId => claimedCollectiblesRef.current.add(itemId));
        setCollectibles(data.collectibles.map(item => ({ ...item, collected: claimedCollectiblesRef.current.has(item.id) })));
      })
      .catch(() => undefined);
  }, []);

  // Snow
  useEffect(()=>{
    if (!snowEnabled || !snowCanvasRef.current) return;
    const canvas=snowCanvasRef.current; const ctx=canvas.getContext('2d')!;
    const resize=()=>{ canvas.width=viewportRef.current?.clientWidth||800; canvas.height=viewportRef.current?.clientHeight||600; }; resize();
    const particles=Array.from({length: window.innerWidth<800?60:120},()=>({ x:Math.random()*canvas.width, y:Math.random()*canvas.height, r:1+Math.random()*2.5, vy:0.5+Math.random()*2.2, vx:Math.random()*1-0.5, alpha:0.4+Math.random()*0.6 }));
    let anim:number; const loop=()=>{ ctx.clearRect(0,0,canvas.width,canvas.height); particles.forEach(p=>{ p.y+=p.vy; p.x+=p.vx+Math.sin(p.y*0.01)*0.3; if(p.y>canvas.height){p.y=-10; p.x=Math.random()*canvas.width;} ctx.globalAlpha=p.alpha; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle='white'; ctx.shadowBlur=6; ctx.shadowColor='white'; ctx.fill(); }); anim=requestAnimationFrame(loop); }; loop(); return()=>cancelAnimationFrame(anim);
  },[snowEnabled]);

  // Movement loop with pathfinding queue
  useEffect(()=>{
    if (!currentUser) return;
    let anim:number;
    const loop=()=>{
      setCurrentUser(prev=>{
        if (!prev) return prev;
        // if has path queue, follow
        if (pathQueueRef.current.length>0) {
          const target=pathQueueRef.current[0];
          const dx=target.x-prev.x, dy=target.y-prev.y, dist=Math.hypot(dx,dy);
          if (dist<8) { pathQueueRef.current.shift(); if (pathQueueRef.current.length===0) { setPathPreview([]); return {...prev, x:target.x, y:target.y, moving:false}; } }
          else { const speed=Math.min(10, dist*0.14+2); track('move',null,{x:prev.x,y:prev.y}); const npc=getNearbyNpc(prev.x,prev.y); if (npc) setNearbyNpc(npc); else setNearbyNpc(null); return {...prev, x:prev.x+dx/dist*speed, y:prev.y+dy/dist*speed, moving:true}; }
        }
        if (prev.moving && prev.targetX != null && prev.targetY != null) {
          const dx = prev.targetX - prev.x, dy = prev.targetY - prev.y, dist = Math.hypot(dx, dy);
          if (dist<4) { setWalkKm(k=>k+Math.hypot(prev.targetX!-prev.x, prev.targetY!-prev.y)/900); return {...prev, x:prev.targetX!, y:prev.targetY!, moving:false, targetX:null, targetY:null}; }
          return {...prev, x:prev.x+dx/dist*6, y:prev.y+dy/dist*6};
        }
        return prev;
      });
      anim=requestAnimationFrame(loop);
    };
    anim=requestAnimationFrame(loop);
    return()=>cancelAnimationFrame(anim);
  },[currentUser?.moving]);

  // Sync to backend throttled
  useEffect(() => {
    if (!currentUser || !socket.connected) return;
    const now = Date.now();
    if (now - lastSyncRef.current < 250) return;
    lastSyncRef.current = now;

    const { lat, lng } = xyToLatLng(currentUser.x, currentUser.y);

    socket.emit('move', {
      x: currentUser.x,
      y: currentUser.y,
      lat,
      lng,
      walkKm,
      status: currentUser.status,
      discovered: Array.from(discovered),
    });
  }, [currentUser?.x, currentUser?.y, currentUser?.status, customHat, customAcc, customColor]);

  // XP level up detection
  useEffect(()=>{
    const { level: nl } = xpToLevel(xp);
    if (nl > (currentUser?.level||5)) {
      setLevelUpShow({from: currentUser?.level||5, to: nl});
      setTimeout(()=>setLevelUpShow(null), 3500);
      slowMo(250); audio.tone(600,0.3,'triangle',0.3); setTimeout(()=>audio.tone(900,0.4,'sine',0.3),150);
      setBadges(b=> [...b, `Lv${nl}`]);
      setTimeout(()=>{ if (currentUser) setCurrentUser({...currentUser, level:nl}); }, 500);
    }
  },[xp]);

  // Mount client-side GIS script
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);

      script.onload = () => {
        try {
          if (googleClientId && (window as any).google?.accounts?.id) {
            (window as any).google.accounts.id.initialize({
              client_id: googleClientId,
              callback: (response: any) => {
                const payload = parseJwt(response.credential);
                if (!payload?.sub) {
                  setShowChooser(true);
                  return;
                }
                loginAs({
                  id: payload.sub,
                  name: payload.name || payload.given_name,
                  email: payload.email,
                  avatar: payload.picture,
                  googleToken: response.credential,
                });
              },
              auto_select: false,
            });
          }
        } catch (e) {
          console.warn('Google GSI initialization error:', e);
        }
      };

      return () => {
        try {
          document.body.removeChild(script);
        } catch {}
      };
    }
  }, [googleClientId]);

  // Helpers
  const loginAs = (user: LoginUser) => {
    const p: Player = {
      id: user.id || `me_${Date.now()}`,
      name: user.name || 'You',
      email: user.email || null,
      avatarUrl: user.avatarUrl || user.avatar_url || user.avatar || '',
      x: user.x ?? 1000,
      y: user.y ?? 900,
      status: user.status || t('status.default', lang),
      hat: user.hat || customHat,
      acc: user.acc || customAcc,
      color: user.color || customColor,
      level: user.level ?? 5,
    };
    setCurrentUser(p);
    setStatusInput(p.status);
    setShowLogin(false);
    localStorage.setItem('oslo_user_next', JSON.stringify(p));

    const session = {
      id: p.id,
      name: p.name,
      email: p.email || null,
      avatarUrl: avatarOf(p),
      googleToken: user.googleToken,
    };
    sessionRef.current = session;
    if (socket.connected) socket.emit('join', session);
    else socket.connect();

    track('move', 'login', { x: p.x, y: p.y });
  };

  const handleDemoLogin = () => {
    const avatar = `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 60) + 1}`;
    loginAs({
      name: 'You • Explorer ' + Math.floor(Math.random() * 90 + 10),
      avatar,
      id: 'me_demo_' + Date.now(),
    });
    setShowCustomizer(true);
  };

  const handleGoogleLogin = () => {
    try {
      if ((window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.prompt();
      } else {
        setShowChooser(true);
      }
    } catch {
      setShowChooser(true);
    }
  };

  const advanceQuest = useCallback((questId: string, amount = 1) => {
    const current = questsRef.current;
    let completionReward = 0;
    const updated = current.map(quest => {
      if (quest.id !== questId || quest.done) return quest;
      const progress = Math.min(quest.total, quest.progress + amount);
      const done = progress >= quest.total;
      if (done) completionReward = quest.reward;
      return { ...quest, progress, done };
    });
    questsRef.current = updated;
    setQuests(updated);
    if (completionReward) {
      setCoinCount(coins => coins + completionReward);
      track('quest_complete', questId);
      setNotice(t('quest.complete', langRef.current, { coins: completionReward }));
    }
  }, []);

  const collectOne = useCallback((item: Collectible, source?: HTMLElement) => {
    if (item.collected || (collectionCooldownRef.current.get(item.id) || 0) > Date.now()) return;
    setCollectibles(previous => previous.map(current => current.id === item.id ? { ...current, collected: true } : current));
    if (socket.connected) {
      // Coins, XP and quest progress arrive only after the authoritative
      // `item_collected`/`hud_update` events, never from an optimistic client.
      socket.emit('collect', { itemId: item.id });
    } else {
      const reward = item.type === 'gem' ? 80 : item.type === 'heart' ? 40 : item.type === 'coffee' ? 30 : 20;
      setCoinCount(coins => coins + reward);
      setXp(value => value + 15);
      advanceQuest('q3');
    }
    coinPopAnimation(item.type === 'gem' ? 80 : 20);
    if (source) popScale(source);
    if (item.type === 'gem') screenShake(6);
    track('collect', item.type, { x: item.x, y: item.y });
    audio.coin();
  }, [advanceQuest]);

  const moveTo = useCallback((x: number, y: number, usePath = true) => {
    if (!currentUser) return;
    const targetX = Math.max(40, Math.min(MAP_SIZE.w - 40, x));
    const targetY = Math.max(40, Math.min(MAP_SIZE.h - 40, y));
    if (usePath) {
      const path = findPath(currentUser.x, currentUser.y, targetX, targetY);
      pathQueueRef.current = path;
      setPathPreview(path);
    } else {
      pathQueueRef.current = [];
      setPathPreview([]);
      setCurrentUser({ ...currentUser, targetX, targetY, moving: true });
    }
  }, [currentUser]);

  // Resolve pickups and discoveries against the explorer's actual position,
  // rather than the clicked destination. This keeps movement, rewards and
  // server-side range checks aligned.
  useEffect(() => {
    if (!currentUser) return;
    collectibles
      .filter(item => !item.collected && Math.hypot(item.x - currentUser.x, item.y - currentUser.y) < 64)
      .forEach(item => collectOne(item));

    // In a connected session the server calculates landmark proximity and
    // rewards. Offline demo mode retains the same loop locally.
    if (!socket.connected) {
      LANDMARKS.forEach(landmark => {
        if (Math.hypot(landmark.x - currentUser.x, landmark.y - currentUser.y) >= 120 || discovered.has(landmark.id)) return;
        setDiscovered(previous => new Set([...previous, landmark.id]));
        setXp(value => value + 50);
        setCoinCount(coins => coins + 30);
        track('landmark_discover', landmark.id, { x: landmark.x, y: landmark.y });
        if (landmark.id === 'gruner') advanceQuest('q2');
      });
    }
  }, [advanceQuest, collectOne, collectibles, currentUser, discovered]);

  const onMapKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!currentUser || event.altKey || event.ctrlKey || event.metaKey) return;
    const directions: Record<string, { x: number; y: number }> = {
      ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 }, W: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 }, S: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 }, A: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 }, D: { x: 1, y: 0 },
    };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    moveTo(currentUser.x + direction.x * 140, currentUser.y + direction.y * 140, false);
  };

  const sendChat = () => {
    if (!chatInput.trim() || !currentUser) return;
    const text = chatInput.trim().slice(0, 80);

    const npc = getNearbyNpc(currentUser.x, currentUser.y);
    if (npc && text.length > 2) {
      const reply = getNpcResponse(npc.id, text, currentUser.name.split(' ')[0], lang);
      setChat(prev => [
        ...prev.slice(-29),
        { id: 'local_' + Date.now(), name: currentUser.name.split(' ')[0], text, avatar_url: currentUser.avatar_url || currentUser.avatar },
        { id: 'npc_' + Date.now(), name: npc.name, text: reply, avatar_url: `https://i.pravatar.cc/100?img=${npc.id === 'barista' ? 25 : 18}` }
      ]);
      setChatInput('');
      return;
    }

    if (socket.connected) {
      socket.emit('chat', {
        id: 'msg_' + Date.now(),
        text,
        x: currentUser.x,
        y: currentUser.y,
      });
    } else {
      setChat(prev => [...prev.slice(-29), { id: 'local_' + Date.now(), name: currentUser.name.split(' ')[0], text, avatar_url: currentUser.avatar_url || currentUser.avatar }]);
    }

    setCurrentUser({ ...currentUser, status: text });
    setStatusInput(text);
    setChatInput('');
    track('chat', text, { x: currentUser.x, y: currentUser.y });
    audio.pop();
  };

  const submitFeedback = () => {
    if (!feedbackTitle.trim()) {
      setNotice(t('feedback.titleRequired', lang));
      return;
    }
    if (!socket.connected || !currentUser) {
      setNotice(t('feedback.offline', lang));
      return;
    }
    socket.emit('playtest_report', {
      category: feedbackCategory,
      severity: feedbackSeverity,
      title: feedbackTitle.trim(),
      reproduction: feedbackReproduction.trim(),
      diagnostics: {
        fps,
        socketStatus,
        x: Math.round(currentUser.x),
        y: Math.round(currentUser.y),
        district: getDistrictForPosition(currentUser.x, currentUser.y).id,
        weather: weather?.desc || 'unknown',
        userAgent: navigator.userAgent.slice(0, 180),
      },
    });
    setNotice(t('feedback.sending', lang));
  };

  const dailyShop = getDailyShop(SHOP_ITEMS);
  const worldPlayers = currentUser ? [currentUser, ...players] : players;
  const focusMap = useCallback((x: number, y: number) => setMapFocus({ x, y, nonce: Date.now() }), []);
  const district = currentUser ? getDistrictForPosition(currentUser.x, currentUser.y) : null;
  const districtLabel = district ? t(`district.${district.id}`, lang) : '';
  const currentWeatherLabel = weatherLabel(weather?.desc, lang);
  const numberLocale = localeFor(lang);
  const funnel = getFunnel();
  const { level: lvlCalc, progress: lvlProg, nextReq } = xpToLevel(xp);

  if (loadingProgress<100) {
    return (
      <div style={{ display:'grid', placeItems:'center', height:'100vh', background:'radial-gradient(60% 60% at 50% 30%, #FEFAE0, #CDEDF2)' }}>
        <div className="loader-card" style={{ width:420, background:'rgba(255,255,255,0.92)', borderRadius:28, padding:28, boxShadow:'0 20px 80px rgba(0,0,0,0.15)', textAlign:'center' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, fontWeight:800, fontSize:22 }}>📍<b>OSLOVILLE</b><span style={{ background:'#E76F51', color:'white', fontSize:10, padding:'3px 7px', borderRadius:6 }}>AAA • {fps}FPS</span></div>
          <div style={{ width:'100%', height:140, background:'linear-gradient(180deg,#eaf6fb,#fefae0)', borderRadius:18, position:'relative', margin:'18px 0', border:'1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ position:'absolute', width:18, height:18, borderRadius:'50%', background:'#2A9D8F', left:'30%', top:'45%', border:'3px solid white', animation:'float 1.6s infinite' }}></div>
            <div style={{ position:'absolute', width:18, height:18, borderRadius:'50%', background:'#E76F51', left:'55%', top:'55%', border:'3px solid white', animation:'float 1.6s 0.4s infinite' }}></div>
          </div>
          <div style={{ width:'100%', height:8, background:'#eef3f4', borderRadius:999, overflow:'hidden', marginBottom:10 }}><div style={{ width:loadingProgress+'%', height:'100%', background:'linear-gradient(90deg,#2A9D8F,#E9C46A,#E76F51)', transition:'width .4s' }}></div></div>
          <div style={{ fontSize:12, color:'#6d818c' }}>{t('loading.status', lang)} • {weather ? `${weather.temp}°C ${currentWeatherLabel}` : t('loading.oslo', lang)}</div>
          <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>
        </div>
      </div>
    );
  }

  if (showLogin) {
    return (
      <div className="screen active" style={{ position:'fixed', inset:0, background:'#cceaff' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:"url('/assets/hero.jpg')", backgroundSize:'cover' }}></div>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(70% 80% at 30% 20%, rgba(255,255,255,0.5), transparent), linear-gradient(to bottom, rgba(255,255,255,0.15), rgba(254,250,224,0.88))' }}></div>
        <div className="login-card" style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)', width:440, background:'rgba(255,255,255,0.86)', backdropFilter:'blur(24px)', borderRadius:32, padding:'32px 28px', boxShadow:'0 20px 60px rgba(38,70,83,0.18)', zIndex:3 }}>
          <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:8 }}><div style={{ width:44, height:44, background:'white', borderRadius:14, display:'grid', placeItems:'center' }}>📍</div><h1 style={{ margin:0, fontWeight:800, fontSize:24 }}>OSLOVILLE</h1><span style={{ background:'#E76F51', color:'white', fontSize:10, fontWeight:800, padding:'2px 6px', borderRadius:6 }}>AAA • {socketStatus} • {fps}FPS</span><button onClick={toggleLanguage} aria-label={t('controls.language', lang)} style={{ marginLeft:'auto', height:30, minWidth:42, borderRadius:9, border:'1px solid #dbe5e7', background:'white', fontWeight:700 }}>{lang === 'en' ? 'RU' : 'EN'}</button></div>
          <h2 style={{ fontSize:40, lineHeight:0.9, letterSpacing:-0.03, margin:'12px 0 8px', fontFamily:"Georgia, 'Times New Roman', serif" }}>{t('login.tagline.first', lang)}<br /><span style={{ background:'linear-gradient(90deg,#2A9D8F,#E76F51)', WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent' }}>{t('login.tagline.second', lang)}</span></h2>
          <p style={{ color:'#5a6d78', fontSize:15, lineHeight:1.5, margin:'0 0 22px' }}>{t('login.description', lang)} {weather ? `${weather.temp}°C · ${currentWeatherLabel}` : ''}</p>
          <button onClick={handleGoogleLogin} style={{ width:'100%', height:48, background:'white', border:'1px solid #dadce0', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', gap:10, fontWeight:600 }}>🔐 {t('login.google', lang)}</button>
          <div style={{ display:'flex', alignItems:'center', gap:12, margin:'16px 0', color:'#8a9aa4', fontSize:12, textTransform:'uppercase', letterSpacing:'0.1em' }}><div style={{ flex:1, height:1, background:'rgba(0,0,0,0.08)' }}></div><span>{t('login.or', lang)}</span><div style={{ flex:1, height:1, background:'rgba(0,0,0,0.08)' }}></div></div>
          <button onClick={handleDemoLogin} style={{ width:'100%', height:52, borderRadius:16, border:'none', background:'linear-gradient(135deg, #264653, #2A9D8F)', color:'white', fontWeight:700 }}>✨ {t('login.demo', lang)}</button>
          <div style={{ marginTop:18, textAlign:'center', fontSize:11, color:'#8aa0ad' }}>
            <p>{t('login.cycles', lang)}</p>
            <p>{t('login.seed', lang, { seed: dailyShop.seed, moves: funnel.moves, collects: funnel.collects, chats: funnel.chats })}</p>
          </div>
        </div>
        {showChooser && (
          <div onClick={()=>setShowChooser(false)} style={{ position:'fixed', inset:0, background:'rgba(20,32,38,0.48)', backdropFilter:'blur(14px)', display:'grid', placeItems:'center', zIndex:50 }}>
            <div onClick={e=>e.stopPropagation()} style={{ background:'white', borderRadius:24, width:380, overflow:'hidden' }}>
              <div style={{ padding:18, borderBottom:'1px solid #eef2f3', textAlign:'center' }}>{t('login.chooseDemo', lang)}</div>
              <div style={{ padding:8 }}>
                {[{ name:'Alex Rivera', pic:'https://i.pravatar.cc/100?img=13' },{ name:'Sanne Nilsen', pic:'https://i.pravatar.cc/100?img=26' }].map(acc=>(
                  <div key={acc.name} onClick={()=>{ setShowChooser(false); loginAs({ name:acc.name, avatar:acc.pic, id:'me_'+Date.now() }); setShowCustomizer(true); }} style={{ display:'flex', gap:12, padding:12, cursor:'pointer' }}><img src={acc.pic} style={{ width:36, height:36, borderRadius:'50%' }} alt="" /><b>{acc.name}</b></div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:'#FEFAE0', filter: nightMode? 'saturate(1.05) brightness(0.92)':'none' }}>
      <header style={{ height:72, background:'rgba(255,255,255,0.92)', backdropFilter:'blur(18px)', borderBottom:'1px solid rgba(0,0,0,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', zIndex:20, gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontWeight:800 }}><div>📍</div><b>OSLOVILLE</b><span style={{ background:'#264653', color:'white', fontSize:10, padding:'2px 6px', borderRadius:6 }}>AAA • {fps}FPS • {socketStatus}</span></div>
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'#f2f6f5', borderRadius:999, padding:'4px 12px 4px 4px' }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:`conic-gradient(#E9C46A ${(lvlProg/nextReq)*100}%, #e8ecea 0)`, display:'grid', placeItems:'center', fontWeight:800 }}>{lvlCalc}</div>
            <div style={{ width:60, height:6, background:'#e1e8e6', borderRadius:999 }}><div style={{ width:(lvlProg/nextReq)*100+'%', height:'100%', background:'linear-gradient(90deg,#E9C46A,#E76F51)', borderRadius:999 }}></div></div>
            <span style={{ fontSize:11, color:'#6b7d87', fontWeight:600 }}>{lvlProg}/{nextReq} XP • {lang.toUpperCase()}</span>
          </div>
          <div style={{ display:'flex', gap:6, background:'linear-gradient(180deg,#fff7d6,#ffeeb1)', border:'1px solid #f5d77a', borderRadius:999, padding:'6px 12px', fontWeight:700, fontSize:13 }}>🪙 {coinCount.toLocaleString(numberLocale)} • {t('hud.walked', lang, { distance: walkKm.toFixed(1) })} • {districtLabel}</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'white', border:'1px solid #e3eaec', borderRadius:999, padding:'6px 6px 6px 14px', width:380 }}>
            <span>💬</span><input value={statusInput} onChange={e=>{ setStatusInput(e.target.value); if(currentUser) setCurrentUser({...currentUser,status:e.target.value}); }} maxLength={48} placeholder={t('hud.statusPlaceholder', lang)} style={{ flex:1, border:'none', outline:'none' }} />
            <button onClick={() => {
              if (!currentUser) return;
              setCurrentUser({ ...currentUser, status: statusInput });
              audio.pop();
              track('chat', statusInput, { x: currentUser.x, y: currentUser.y });
              if (socket.connected) {
                socket.emit('chat', {
                  id: 'msg_' + Date.now(),
                  text: statusInput,
                  x: currentUser.x,
                  y: currentUser.y,
                });
              }
            }} style={{ background:'#264653', color:'white', border:'none', height:30, padding:'0 14px', borderRadius:999, fontWeight:700, fontSize:12 }}>{t('hud.update', lang)}</button>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button onClick={()=>setShowShop(true)} aria-label={t('controls.shop', lang)} title={t('controls.shop', lang)} style={{ width:38, height:38, borderRadius:12, border:'1px solid #e2e9eb', background:'white' }}>🛍️</button>
          <button onClick={()=>setShowBag(true)} aria-label={t('controls.bag', lang)} title={t('controls.bag', lang)} style={{ width:38, height:38, borderRadius:12, border:'1px solid #e2e9eb', background:'white' }}>🎒</button>
          <button onClick={()=>setShowPhoto(true)} aria-label={t('controls.photo', lang)} title={t('controls.photo', lang)} style={{ width:38, height:38, borderRadius:12, border:'1px solid #e2e9eb', background:'white' }}>📸</button>
          <button onClick={()=>setShowFeedback(true)} aria-label={t('controls.feedback', lang)} title={t('controls.feedback', lang)} style={{ width:38, height:38, borderRadius:12, border:'1px solid #e2e9eb', background:'#fff8df' }}>🐞</button>
          <button onClick={() => { if (currentUser) focusMap(currentUser.x, currentUser.y); }} aria-label={t('controls.map', lang)} title={t('controls.map', lang)} style={{ width:38, height:38, borderRadius:12, border:'1px solid #e2e9eb', background:'white' }}>🗺️</button>
          <button onClick={() => setNightMode(value => { const next = !value; if (next) advanceQuest('q4'); return next; })} aria-label={t('controls.night', lang)} title={t('controls.night', lang)} style={{ width:38, height:38, borderRadius:12, border:'1px solid #e2e9eb', background:'white' }}>{nightMode?'☀️':'🌙'}</button>
          <button onClick={()=>setSnowEnabled(v=>!v)} aria-label={t('controls.snow', lang)} title={t('controls.snow', lang)} style={{ width:38, height:38, borderRadius:12, border:'1px solid #e2e9eb', background:'white' }}>❄️</button>
          <button onClick={toggleLanguage} aria-label={t('controls.language', lang)} title={t('controls.language', lang)} style={{ width:38, height:38, borderRadius:12, border:'1px solid #e2e9eb', background:'white' }}>{lang === 'en' ? '🇷🇺' : '🇬🇧'}</button>
          <button onClick={()=>setShowSettings(true)} aria-label={t('controls.settings', lang)} title={t('controls.settings', lang)} style={{ width:38, height:38, borderRadius:12, border:'1px solid #e2e9eb', background:'white' }}>⚙️</button>
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'white', border:'1px solid #e2e9eb', borderRadius:999, padding:'4px 12px 4px 4px' }}><img src={currentUser ? avatarOf(currentUser) : ''} style={{ width:32, height:32, borderRadius:'50%' }} alt="" /><span style={{ fontWeight:600, fontSize:13 }}>{currentUser?.name.split(' ')[0]}</span></div>
        </div>
      </header>

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        <aside style={{ width:300, background:'rgba(255,255,255,0.9)', backdropFilter:'blur(16px)', borderRight:'1px solid rgba(0,0,0,0.06)', overflowY:'auto', padding:14 }}>
          <h3 style={{ fontSize:11, letterSpacing:'.12em', color:'#8aa0ad', margin:'0 0 12px' }}>{t('hud.live', lang)} · {t('hud.online', lang, { count: players.length + 1 })} · {weather?.temp}°C {currentWeatherLabel} · {socketStatus}</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {[currentUser, ...players].filter(Boolean).slice(0,20).map((p:any)=>(
              <div key={p.id} onClick={()=>setShowPlayerModal(p)} style={{ display:'flex', gap:10, padding:'8px 10px', borderRadius:14, cursor:'pointer', background:p.id===currentUser?.id?'#f0f7f5':'transparent' }}>
                <img src={avatarOf(p)} style={{ width:36, height:36, borderRadius:'50%' }} alt="" />
                <div style={{ flex:1, minWidth:0 }}><div style={{ fontWeight:600, fontSize:13, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div><div style={{ fontSize:11, color:'#6d818c', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.status}</div></div>
                <div style={{ fontSize:10, background:'#f2f6f7', padding:'2px 6px', borderRadius:999, fontWeight:600 }}>{Math.round(Math.hypot(p.x - (currentUser?.x ?? p.x), p.y - (currentUser?.y ?? p.y)) / 6)}m</div>
              </div>
            ))}
          </div>
          <h3 style={{ fontSize:11, letterSpacing:'.12em', color:'#8aa0ad', margin:'16px 0 12px' }}>{t('landmarks.title', lang)} · {discovered.size}/{LANDMARKS.length} · {t('landmarks.badges', lang, { count: badges.length })}</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {LANDMARKS.map(l=>(
              <div key={l.id} onClick={() => { focusMap(l.x, l.y); moveTo(l.x, l.y, true); }} style={{ display:'flex', gap:10, padding:8, borderRadius:12, background: discovered.has(l.id)? 'linear-gradient(180deg,#f2fcf7,#e8f7f0)':'linear-gradient(180deg, white, #f8fdfc)', border:`1px solid ${discovered.has(l.id)?'#b5e6d3':'#e1ecea'}`, cursor:'pointer' }}>
                <div style={{ width:36, height:36, borderRadius:10, background:'#e6f4f2', display:'grid', placeItems:'center' }}>{l.emoji}</div><div><b style={{ fontSize:12 }}>{t(`landmark.${l.id}.name`, lang)} {discovered.has(l.id)?'✓':''}</b><br /><small style={{ fontSize:11, color:'#7b8f99' }}>{t(`landmark.${l.id}.desc`, lang)}</small></div>
              </div>
            ))}
          </div>
          {nearbyNpc && <div style={{ marginTop:12, background:'linear-gradient(135deg,#264653,#2a9d8f)', color:'white', borderRadius:16, padding:12 }}><b>{nearbyNpc.name} {nearbyNpc.emoji}</b><br /><small>{t(`npc.${nearbyNpc.id}.personality`, lang)} · {t('npc.nearby', lang)}</small></div>}
          <div style={{ marginTop:12, background:'#fffbe0', border:'1px solid #f5d77a', borderRadius:12, padding:10, fontSize:11 }}><b>{t('season.title', lang, { name: SEASON_1.name })}</b><br />{t('season.tier', lang, { level: lvlCalc })} {SEASON_1.tiers[lvlCalc-1]?.reward.emoji||'🪙'} {SEASON_1.tiers[lvlCalc-1]?.reward.name||''}</div>
        </aside>

        <main ref={viewportRef} className="map-viewport" tabIndex={0} role="application" aria-label={t('map.aria', lang)} onKeyDown={onMapKeyDown} style={{ flex:1, position:'relative', background:'#dcebf0', overflow:'hidden' }}>
          <div style={{ position:'absolute', left:14, top:14, zIndex:1000, display:'flex', flexDirection:'column', gap:6 }}>
            <button onClick={() => setMapZoomRequest(value => value + 1)} aria-label={t('map.zoomIn', lang)} title={t('map.zoomIn', lang)} style={{ width:40, height:40, borderRadius:12, background:'rgba(255,255,255,0.92)' }}>+</button>
            <button onClick={() => setMapZoomRequest(value => value - 1)} aria-label={t('map.zoomOut', lang)} title={t('map.zoomOut', lang)} style={{ width:40, height:40, borderRadius:12, background:'rgba(255,255,255,0.92)' }}>−</button>
            <button onClick={() => { if (currentUser) focusMap(currentUser.x, currentUser.y); }} aria-label={t('map.center', lang)} title={t('map.center', lang)} style={{ width:40, height:40, borderRadius:12, background:'rgba(255,255,255,0.92)' }}>◎</button>
          </div>
          <div style={{ position:'absolute', left:'50%', top:14, transform:'translateX(-50%)', zIndex:1000, background:'rgba(38,70,83,0.86)', color:'white', padding:'6px 14px', borderRadius:999, fontSize:11, fontWeight:600 }}>{t('hud.mapHint', lang)} · {fps} FPS · {districtLabel}</div>
          <canvas ref={snowCanvasRef} style={{ position:'absolute', inset:0, zIndex:900, pointerEvents:'none', opacity:snowEnabled?1:0 }} />
          {nightMode && <div style={{ position:'absolute', inset:0, zIndex:800, background:'radial-gradient(70% 60% at 50% 20%, rgba(80,120,255,0.18), rgba(10,15,35,0.55))', pointerEvents:'none' }}><div style={{ position:'absolute', inset:0, backgroundImage:"url('/assets/aurora.jpg')", backgroundSize:'cover', mixBlendMode:'overlay', opacity:0.25 }}></div></div>}
          <RealOsloMap
            players={worldPlayers}
            currentPlayerId={currentUser?.id}
            landmarks={LANDMARKS.map(landmark => ({ ...landmark, name: t(`landmark.${landmark.id}.name`, lang) }))}
            collectibles={collectibles}
            path={pathPreview}
            nightMode={nightMode}
            tileFailureLabel={t('map.tilesUnavailable', lang)}
            focus={mapFocus}
            zoomRequest={mapZoomRequest}
            onNavigate={(x, y) => moveTo(x, y, true)}
            onSelectPlayer={playerId => { const player = worldPlayers.find(entry => entry.id === playerId); if (player) setShowPlayerModal(player); }}
            onLandmarkClick={landmarkId => { const landmark = LANDMARKS.find(entry => entry.id === landmarkId); if (landmark) moveTo(landmark.x, landmark.y, true); }}
          />
          <div style={{ position:'absolute', right:14, top:14, zIndex:1000, background:'rgba(255,255,255,0.92)', padding:'6px 12px', borderRadius:999, fontSize:11, fontWeight:600 }}>{weather ? `${weather.isSnow?'❄️': weather.isRain?'🌧️':'☀️'} ${t('hud.oslo', lang)} · ${weather.temp}°C · ${currentWeatherLabel}` : t('hud.oslo', lang)} · {levelUpShow ? `${t('hud.levelUp', lang)} ${levelUpShow.from}→${levelUpShow.to}` : `${districtLabel} · ${nightMode ? t('hud.nightOn', lang) : t('hud.nightOff', lang)}`}</div>
          <MobileJoystick onMove={(dx,dy)=>{ if(!currentUser|| (dx===0&&dy===0)) return; const nx=currentUser.x+dx*8; const ny=currentUser.y+dy*8; setCurrentUser({...currentUser,x:nx,y:ny}); setWalkKm(k=>k+Math.hypot(dx,dy)*0.002); }} />
          {levelUpShow && <div style={{ position:'absolute', left:'50%', top:'40%', transform:'translate(-50%,-50%)', background:'linear-gradient(135deg,#264653,#2A9D8F)', color:'white', padding:'16px 24px', borderRadius:20, fontWeight:800, fontSize:22, zIndex:10, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', animation:'levelUp 0.6s cubic-bezier(.16,1,.3,1)' }}>🎉 {t('hud.levelUp', lang)} {levelUpShow.from} → {levelUpShow.to} 🎉<br /><small style={{ fontSize:12, fontWeight:500 }}>{t('hud.reward', lang)}: {SEASON_1.tiers[levelUpShow.to-1]?.reward.emoji} {SEASON_1.tiers[levelUpShow.to-1]?.reward.name||'+100 🪙'}</small></div>}
          <style>{`@keyframes coinFloat{0%,100%{transform:translate(-50%,-50%) translateY(0)}50%{transform:translate(-50%,-50%) translateY(-6px)}} @keyframes bubbleIn{from{transform:translateY(6px) scale(.9);opacity:0}to{transform:translateY(0) scale(1);opacity:1}} @keyframes walkBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}} @keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.02)}} @keyframes levelUp{from{transform:translate(-50%,-40%) scale(0.8);opacity:0}to{transform:translate(-50%,-50%) scale(1);opacity:1}}`}</style>
        </main>

        <aside style={{ width:330, background:'rgba(255,255,255,0.9)', backdropFilter:'blur(16px)', borderLeft:'1px solid rgba(0,0,0,0.06)', overflowY:'auto', padding:14 }}>
          <h3 style={{ fontSize:11, letterSpacing:'.12em', color:'#8aa0ad', margin:'0 0 12px' }}>{t('quests.title', lang)} · {quests.filter(q=>q.done).length}/{quests.length} · {t('landmarks.badges', lang, { count: badges.length })}</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {quests.map(q=>(
              <div key={q.id} style={{ display:'flex', gap:10, padding:10, borderRadius:14, background:'white', border:'1px solid #e6ecea', opacity:q.done?0.6:1 }}>
                <div style={{ width:32, height:32, borderRadius:9, background:'#f1f6f5', display:'grid', placeItems:'center' }}>{q.icon}</div>
                <div style={{ flex:1 }}><b style={{ fontSize:12 }}>{t(q.titleKey, lang)}</b><br /><small style={{ fontSize:11, color:'#7a8e98' }}>{q.progress}/{q.total} • +{q.reward}🪙</small></div>
              </div>
            ))}
          </div>
          <h3 style={{ fontSize:11, letterSpacing:'.12em', color:'#8aa0ad', margin:'16px 0 12px' }}>{t('chat.title', lang)} · {t('chat.proximity', lang)} · {chat.length} 💬</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:200, overflowY:'auto', marginBottom:8 }}>
            {chat.slice(-20).map((m:any)=>(
              <div key={m.id} style={{ fontSize:12 }}><b style={{ fontSize:11, color:'#2A9D8F' }}>{m.name}</b><br /><span style={{ background:m.player_id===currentUser?.id?'#264653':'#f2f6f6', color:m.player_id===currentUser?.id?'white':'#1a2a33', padding:'4px 8px', borderRadius:'12px 12px 12px 4px', display:'inline-block', marginTop:2, maxWidth:'90%' }}>{m.text}</span></div>
            ))}
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') sendChat(); }} placeholder={t('chat.placeholder', lang)} style={{ flex:1, height:36, borderRadius:999, border:'1px solid #dde7e8', padding:'0 12px', fontSize:12 }} />
            <button onClick={sendChat} aria-label={t('chat.send', lang)} title={t('chat.send', lang)} style={{ width:36, height:36, borderRadius:'50%', border:'none', background:'#264653', color:'white' }}>➤</button>
          </div>
          <div style={{ marginTop:12, background:'#f8fdfc', border:'1px solid #e1ecea', borderRadius:12, padding:10, fontSize:11 }}>
            <b>{t('analytics.title', lang)}</b><br />{t('analytics.stats', lang, funnel)}<br />
            <small>{t('analytics.footer', lang, { fps, socket: socketStatus, snow: snowEnabled ? t('state.on', lang) : t('state.off', lang) })}</small>
          </div>
        </aside>
      </div>

      {showPlayerModal && (
        <div onClick={()=>setShowPlayerModal(null)} style={{ position:'fixed', inset:0, background:'rgba(20,32,38,0.48)', backdropFilter:'blur(14px)', display:'grid', placeItems:'center', zIndex:50 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'rgba(255,255,255,0.96)', borderRadius:28, padding:20, width:380, boxShadow:'0 30px 80px rgba(0,0,0,0.28)' }}>
            <div style={{ display:'flex', gap:14, alignItems:'center', marginBottom:12 }}>
              <img src={avatarOf(showPlayerModal)} style={{ width:64, height:64, borderRadius:'50%' }} alt="" />
              <div><b style={{ fontSize:18 }}>{showPlayerModal.name}</b><br /><small style={{ color:'#6d818c' }}>{showPlayerModal.status}</small></div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => { setShowPlayerModal(null); focusMap(showPlayerModal.x, showPlayerModal.y); moveTo(showPlayerModal.x, showPlayerModal.y, true); }} style={{ flex:1, height:40, borderRadius:12, border:'1px solid #e2e9eb', background:'white' }}>📍 {t('social.visit', lang)}</button>
              <button onClick={() => {
                setShowPlayerModal(null);
                if (socket.connected) socket.emit('wave', { targetId: showPlayerModal.id });
                else setCoinCount(c => c + 10);
                advanceQuest('q1');
                track('chat', 'wave', { x: showPlayerModal.x, y: showPlayerModal.y });
                audio.pop();
              }} style={{ flex: 1, height: 40, borderRadius: 12, border: 'none', background: '#264653', color: 'white', fontWeight: 700 }}>👋 {t('social.wave', lang)}</button>
            </div>
          </div>
        </div>
      )}

      {showShop && (
        <div onClick={()=>setShowShop(false)} style={{ position:'fixed', inset:0, background:'rgba(20,32,38,0.48)', backdropFilter:'blur(14px)', display:'grid', placeItems:'center', zIndex:50, padding:16 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'rgba(255,255,255,0.96)', borderRadius:28, padding:20, width:560, maxWidth:'96vw', maxHeight:'92vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between' }}><h2 style={{ margin:0 }}>{t('shop.title', lang)} 🛍️ · {t('shop.dailySeed', lang, { seed: dailyShop.seed })}</h2><button onClick={()=>setShowShop(false)} aria-label={t('photo.close', lang)} style={{ width:38, height:38, borderRadius:12, border:'1px solid #e2e9eb', background:'white' }}>✕</button></div>
            <div style={{ width:'100%', height:120, borderRadius:18, backgroundImage:"url('/assets/shop.jpg')", backgroundSize:'cover', margin:'12px 0' }}></div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[...dailyShop.rare, ...dailyShop.common, dailyShop.legendary].map((item:any)=>(
                <div key={item.id} style={{ background:'white', border:'1px solid #e6ecea', borderRadius:16, padding:12, display:'flex', gap:10, alignItems:'center' }}>
                  <div style={{ width:48, height:48, borderRadius:12, background:'#f6f9f8', display:'grid', placeItems:'center', fontSize:24 }}>{item.emoji}</div>
                  <div><b style={{ fontSize:13 }}>{t(`shop.item.${item.id}`, lang)}</b><br /><small style={{ fontSize:11, color:'#7b8f99' }}>{t(`shop.rarity.${item.rarity}`, lang)} · {inventory[item.id] ? t('shop.owned', lang) : t('shop.new', lang)}</small></div>
                  <button onClick={() => {
                    if (inventory[item.id]) {
                      if (item.type === 'hat') setCustomHat(item.emoji);
                      if (item.type === 'acc') setCustomAcc(item.emoji);
                      if (socket.connected) {
                        socket.emit('shop_buy', { itemId: item.id });
                      }
                      return;
                    }
                    if (coinCount < item.price) { setNotice(t('shop.notEnough', lang)); return; }
                    if (socket.connected) {
                      socket.emit('shop_buy', { itemId: item.id });
                    } else {
                      setCoinCount(c => c - item.price);
                      setInventory(inv => ({ ...inv, [item.id]: 1 }));
                      if (item.type === 'hat') setCustomHat(item.emoji);
                      if (item.type === 'acc') setCustomAcc(item.emoji);
                    }
                    track('shop_buy', item.id);
                    audio.coin();
                    coinPopAnimation(-item.price);
                  }} style={{ marginLeft:'auto', background:'#264653', color:'white', border:'none', borderRadius:999, padding:'6px 12px', fontSize:11, fontWeight:700 }}>{inventory[item.id]?'👌':'🪙 '+item.price}</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showBag && (
        <div onClick={()=>setShowBag(false)} style={{ position:'fixed', inset:0, background:'rgba(20,32,38,0.48)', backdropFilter:'blur(14px)', display:'grid', placeItems:'center', zIndex:50 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'white', borderRadius:28, padding:20, width:400 }}>
            <div style={{ display:'flex', justifyContent:'space-between' }}><h2>{t('bag.title', lang)} 🎒 · {Object.keys(inventory).length}/16</h2><button onClick={()=>setShowBag(false)} aria-label={t('photo.close', lang)} style={{ width:38, height:38, borderRadius:12, border:'1px solid #e2e9eb', background:'white' }}>✕</button></div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginTop:12 }}>
              {Object.keys(inventory).map(k=>{ const item=SHOP_ITEMS.find(s=>s.id===k)||{emoji:'🎁'}; return <div key={k} style={{ aspectRatio:'1', background:'linear-gradient(180deg,#fffbe6,#fff3b0)', border:'1px solid #f5d77a', borderRadius:14, display:'grid', placeItems:'center', fontSize:22 }}>{(item as any).emoji}</div>; })}
            </div>
            <div style={{ marginTop:12, fontSize:12, color:'#6d818c' }}>{t('bag.stats', lang, { coins: coinCount.toLocaleString(numberLocale), xp, level: lvlCalc, badges: badges.join(', ') || t('bag.none', lang), season: SEASON_1.name })}</div>
          </div>
        </div>
      )}

      {showCustomizer && (
        <div style={{ position:'fixed', inset:0, background:'rgba(20,32,38,0.48)', backdropFilter:'blur(14px)', display:'grid', placeItems:'center', zIndex:50 }}>
          <div style={{ background:'white', borderRadius:28, padding:20, width:560 }}>
            <h2 style={{ margin:'0 0 8px' }}>{t('customize.title', lang)} 🧣 · {currentUser?.name}</h2>
            <div style={{ display:'grid', gridTemplateColumns:'140px 1fr', gap:16 }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ width:120, height:120, borderRadius:'50%', background:'linear-gradient(180deg,#eaf6fb,#fefae0)', border:`4px solid ${customColor}`, display:'grid', placeItems:'center', position:'relative', margin:'0 auto' }}>
                  <img src={currentUser ? avatarOf(currentUser) : ''} style={{ width:100, height:100, borderRadius:'50%' }} alt="" />
                  <div style={{ position:'absolute', left:'50%', top:-12, transform:'translateX(-50%)', fontSize:30 }}>{customHat}</div>
                  <div style={{ position:'absolute', right:-4, bottom:-2, background:'white', borderRadius:'50%', width:28, height:28, display:'grid', placeItems:'center' }}>{customAcc}</div>
                </div>
              </div>
              <div>
                <h4>{t('customize.hat', lang)}</h4><div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:12 }}>{['','🧶','🧢','👑','⛑️','🎀','🎩'].map(h=><button key={h} onClick={()=>setCustomHat(h)} style={{ width:48, height:48, borderRadius:14, border:customHat===h?'2px solid #2A9D8F':'2px solid #eef3f3', background:customHat===h?'#e6f4f2':'white', fontSize:22 }}>{h||'∅'}</button>)}</div>
                <h4>{t('customize.accessory', lang)}</h4><div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:12 }}>{['','☕','🧣','🎧','📚','🕶️','🧤'].map(a=><button key={a} onClick={()=>setCustomAcc(a)} style={{ width:48, height:48, borderRadius:14, border:customAcc===a?'2px solid #2A9D8F':'2px solid #eef3f3', background:customAcc===a?'#e6f4f2':'white', fontSize:22 }}>{a||'∅'}</button>)}</div>
                <h4>{t('customize.color', lang)}</h4><div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>{['#2A9D8F','#E76F51','#E9C46A','#264653','#A78BFA','#F472B6','#60A5FA'].map(c=><button key={c} onClick={()=>setCustomColor(c)} style={{ width:32, height:32, borderRadius:'50%', background:c, border:customColor===c?'3px solid #264653':'2px solid white', boxShadow:'0 2px 6px rgba(0,0,0,0.15)' }}></button>)}</div>
              </div>
            </div>
            <button onClick={()=>{ setShowCustomizer(false); if(currentUser) setCurrentUser({...currentUser, hat:customHat, acc:customAcc, color:customColor}); }} style={{ width:'100%', height:52, borderRadius:16, border:'none', background:'linear-gradient(135deg, #264653, #2A9D8F)', color:'white', fontWeight:700, marginTop:16 }}>{t('customize.save', lang)}</button>
          </div>
        </div>
      )}

      {showPhoto && (
        <div style={{ position:'fixed', inset:0, background:'rgba(10,15,20,0.9)', zIndex:60, display:'grid', placeItems:'center' }}>
          <div style={{ background:'white', borderRadius:24, padding:20, width:400 }}>
            <h2 style={{ margin:'0 0 12px' }}>{t('photo.title', lang)} 📸 · {t(`photo.filter.${photoFilter}`, lang)}</h2>
            <div style={{ width:'100%', height:220, borderRadius:16, backgroundImage:"url('/assets/map.jpg')", backgroundSize:'cover', filter: photoFilter==='vivid'?'saturate(1.4)': photoFilter==='cozy'?'sepia(0.2) saturate(1.2)': photoFilter==='aurora'?'hue-rotate(40deg) saturate(1.3)':'grayscale(0.3)', position:'relative' }}>
              <div style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-100%)', display:'flex', flexDirection:'column', alignItems:'center' }}>
                <div style={{ background:'#264653', color:'white', padding:'4px 10px', borderRadius:12, fontSize:12 }}>{statusInput}</div>
                <img src={currentUser ? avatarOf(currentUser) : ''} style={{ width:56, height:56, borderRadius:'50%', border:`3px solid ${customColor}`, marginTop:6 }} alt="" />
              </div>
              <div style={{ position:'absolute', bottom:8, left:8, background:'rgba(0,0,0,0.6)', color:'white', padding:'4px 8px', borderRadius:999, fontSize:10 }}>OSLOVILLE · {districtLabel} · {new Date().toLocaleDateString(numberLocale)} · {coinCount.toLocaleString(numberLocale)}🪙</div>
            </div>
            <div style={{ display:'flex', gap:6, marginTop:12 }}>{(['vivid', 'cozy', 'aurora', 'vintage'] as PhotoFilter[]).map(f=><button key={f} onClick={()=>setPhotoFilter(f)} style={{ flex:1, height:32, borderRadius:999, border:photoFilter===f?'2px solid #2A9D8F':'1px solid #dde7e8', background:photoFilter===f?'#e6f4f2':'white', fontSize:11, fontWeight:600 }}>{t(`photo.filter.${f}`, lang)}</button>)}</div>
            <div style={{ display:'flex', gap:8, marginTop:12 }}><button onClick={()=>setShowPhoto(false)} style={{ flex:1, height:40, borderRadius:12, border:'1px solid #e2e9eb', background:'white' }}>{t('photo.close', lang)}</button><button onClick={()=>{ setShowPhoto(false); setCoinCount(c=>c+20); setBadges(b=>[...b,'📸']); track('photo_share',photoFilter); audio.tone(800,0.2,'sine',0.2); }} style={{ flex:1, height:40, borderRadius:12, border:'none', background:'#264653', color:'white', fontWeight:700 }}>{t('photo.share', lang)}</button></div>
          </div>
        </div>
      )}

      {showFeedback && (
        <div onClick={() => setShowFeedback(false)} style={{ position:'fixed', inset:0, background:'rgba(20,32,38,0.56)', backdropFilter:'blur(14px)', display:'grid', placeItems:'center', zIndex:60, padding:16 }}>
          <section onClick={event => event.stopPropagation()} aria-label={t('feedback.title', lang)} style={{ background:'white', borderRadius:28, padding:22, width:'min(460px, 100%)', boxShadow:'0 30px 80px rgba(0,0,0,0.28)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start', gap:12 }}>
              <div><h2 style={{ margin:0 }}>{t('feedback.title', lang)} 🐞</h2><p style={{ margin:'6px 0 0', color:'#647780', fontSize:13 }}>{t('feedback.description', lang)}</p></div>
              <button onClick={() => setShowFeedback(false)} aria-label={t('photo.close', lang)} style={{ width:36, height:36, borderRadius:12, border:'1px solid #e2e9eb', background:'white' }}>✕</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:16 }}>
              <label style={{ fontSize:12, fontWeight:700 }}>{t('feedback.area', lang)}
                <select value={feedbackCategory} onChange={event => setFeedbackCategory(event.target.value)} style={{ display:'block', width:'100%', marginTop:5, height:38, borderRadius:10, border:'1px solid #dbe5e7', padding:'0 8px' }}>
                  <option value="gameplay">{t('feedback.category.gameplay', lang)}</option><option value="multiplayer">{t('feedback.category.multiplayer', lang)}</option><option value="performance">{t('feedback.category.performance', lang)}</option><option value="ui">{t('feedback.category.ui', lang)}</option><option value="economy">{t('feedback.category.economy', lang)}</option>
                </select>
              </label>
              <label style={{ fontSize:12, fontWeight:700 }}>{t('feedback.impact', lang)}
                <select value={feedbackSeverity} onChange={event => setFeedbackSeverity(event.target.value as typeof feedbackSeverity)} style={{ display:'block', width:'100%', marginTop:5, height:38, borderRadius:10, border:'1px solid #dbe5e7', padding:'0 8px' }}>
                  <option value="blocker">{t('feedback.severity.blocker', lang)}</option><option value="major">{t('feedback.severity.major', lang)}</option><option value="minor">{t('feedback.severity.minor', lang)}</option><option value="idea">{t('feedback.severity.idea', lang)}</option>
                </select>
              </label>
            </div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, marginTop:12 }}>{t('feedback.shortTitle', lang)}
              <input value={feedbackTitle} onChange={event => setFeedbackTitle(event.target.value)} maxLength={140} placeholder={t('feedback.titlePlaceholder', lang)} style={{ display:'block', boxSizing:'border-box', width:'100%', marginTop:5, height:40, borderRadius:10, border:'1px solid #dbe5e7', padding:'0 10px' }} />
            </label>
            <label style={{ display:'block', fontSize:12, fontWeight:700, marginTop:12 }}>{t('feedback.reproduction', lang)}
              <textarea value={feedbackReproduction} onChange={event => setFeedbackReproduction(event.target.value)} maxLength={1200} placeholder={t('feedback.reproductionPlaceholder', lang)} style={{ display:'block', boxSizing:'border-box', width:'100%', minHeight:112, resize:'vertical', marginTop:5, borderRadius:10, border:'1px solid #dbe5e7', padding:10, fontFamily:'inherit' }} />
            </label>
            <p style={{ margin:'9px 0 0', fontSize:11, color:'#71838c' }}>{t('feedback.attached', lang)}</p>
            <button onClick={submitFeedback} style={{ width:'100%', height:46, marginTop:14, border:0, borderRadius:14, background:'linear-gradient(135deg,#264653,#2A9D8F)', color:'white', fontWeight:800 }}>{t('feedback.send', lang)}</button>
          </section>
        </div>
      )}

      {notice && <div role="status" style={{ position:'fixed', left:'50%', bottom:24, transform:'translateX(-50%)', zIndex:100, maxWidth:'min(500px, calc(100vw - 32px))', background:'#264653', color:'white', borderRadius:999, padding:'10px 18px', fontSize:13, fontWeight:600, boxShadow:'0 12px 30px rgba(0,0,0,.22)' }}>{notice}<button onClick={() => setNotice('')} aria-label={t('settings.dismiss', lang)} style={{ marginLeft:10, border:0, background:'transparent', color:'white', fontSize:16 }}>×</button></div>}

      {showSettings && (
        <div onClick={()=>setShowSettings(false)} style={{ position:'fixed', inset:0, background:'rgba(20,32,38,0.48)', backdropFilter:'blur(14px)', display:'grid', placeItems:'center', zIndex:50 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'white', borderRadius:28, padding:20, width:420 }}>
            <h2>{t('settings.title', lang)} ⚙️</h2>
            <p style={{ fontSize:12, color:'#6d818c' }}>
              {t('settings.status', lang, { status: socketStatus, fps, lang: t(`language.${lang}`, lang), weather: `${weather?.temp ?? '—'}°C ${currentWeatherLabel}` })}<br />
              {t('settings.metrics', lang, { performance: fps >= 55 ? '✅' : '⚠️', seed: dailyShop.seed })}<br />
              {t('settings.analytics', lang, { analytics: JSON.stringify(getFunnel()) })}<br />
              {t('settings.progress', lang, { badges: badges.join(', ') || t('bag.none', lang), discovered: discovered.size, total: LANDMARKS.length })}<br />
              {t('settings.npcs', lang, { npcs: NPCS.map(n=>n.name).join(', ') })}
            </p>
            <div style={{ display:'flex', gap:8, marginTop:12 }}>
              <button onClick={()=>{ localStorage.clear(); location.reload(); }} style={{ flex:1, height:40, borderRadius:12, border:'1px solid #e2e9eb', background:'white' }}>{t('settings.clearLogout', lang)}</button>
              <button onClick={()=>setShowSettings(false)} style={{ flex:1, height:40, borderRadius:12, border:'none', background:'#264653', color:'white', fontWeight:700 }}>{t('settings.close', lang)}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
