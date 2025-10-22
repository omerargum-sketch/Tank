import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { useGameEngine } from './hooks/useGameEngine';
import type { Country, AbilityType, Upgrade, TankCustomization, Keys, Tank } from './types';
import { GameStatus } from './types';
import { COUNTRIES, CUSTOMIZATION_COLORS, CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';
import { I18nProvider, useTranslation, I18nContext } from './i18n';
import { createDesign } from './hooks/tankDesigns';

const SHIELD_COST = 5000;
const MARTYRS_BEACON_COST = 5000;

const defaultCustomization: TankCustomization = {
    baseColor: '#556B2F', // NATO_GREEN
    turretColor: '#6B8E23',
};

// Map country codes to locale codes
const countryToLocaleMap: Record<string, string> = {
    TR: 'tr',
    // Add other mappings here if more languages are supported
};

const AVAILABLE_MODS = [
    { id: 'hard_mode', titleKey: 'mods.hard_mode.title', descKey: 'mods.hard_mode.desc' },
    { id: 'champion_rush', titleKey: 'mods.champion_rush.title', descKey: 'mods.champion_rush.desc' },
    { id: 'ally_support', titleKey: 'mods.ally_support.title', descKey: 'mods.ally_support.desc' },
    { id: 'glass_cannon', titleKey: 'mods.glass_cannon.title', descKey: 'mods.glass_cannon.desc' },
];

const useAnimatedCounter = (targetValue: number, duration: number = 300) => {
    const [count, setCount] = useState(targetValue);
    const previousValueRef = useRef(targetValue);

    useEffect(() => {
        const startValue = previousValueRef.current;
        let startTime: number | null = null;
        
        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);
            
            const diff = targetValue - startValue;
            const currentDisplay = Math.floor(startValue + diff * percentage);
            
            setCount(currentDisplay);
            
            if (progress < duration) {
                requestAnimationFrame(animate);
            } else {
                previousValueRef.current = targetValue;
            }
        };
        
        requestAnimationFrame(animate);

    }, [targetValue, duration]);

    return count;
};

const App: React.FC = () => {
    const { t, setLocale } = useTranslation();
    const [playerCountry, setPlayerCountry] = useState<Country | null>(null);
    const keys = useRef<Keys>({ w: false, a: false, s: false, d: false, ' ': false, q: false });
    const { gameState, startGame, buyShield, activateAbility, selectUpgrade, applyCheat, buyMartyrsBeacon } = useGameEngine(playerCountry, keys);
    const [showCountryModal, setShowCountryModal] = useState(true);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [deviceType, setDeviceType] = useState<'pc' | 'mobile' | null>(null);
    const [showDeviceModal, setShowDeviceModal] = useState(false);
    const [customization, setCustomization] = useState<TankCustomization>(defaultCustomization);
    const [showCustomizationModal, setShowCustomizationModal] = useState(false);
    const gameBoardRef = useRef<HTMLDivElement>(null);
    const [showTutorial, setShowTutorial] = useState(false);
    const [showCheatModal, setShowCheatModal] = useState(false);
    const [showModsModal, setShowModsModal] = useState(false);
    const [activeMods, setActiveMods] = useState<string[]>([]);
    const displayedScore = useAnimatedCounter(gameState.score);
    
    useEffect(() => {
        try {
            const savedCustomization = localStorage.getItem('tankCustomization');
            if (savedCustomization) {
                setCustomization(JSON.parse(savedCustomization));
            }
            const savedMods = localStorage.getItem('activeMods');
            if(savedMods) {
                setActiveMods(JSON.parse(savedMods));
            }
        } catch (e) {
            console.error("Could not load settings from localStorage", e);
        }
    }, []);

    useEffect(() => {
        if (playerCountry && deviceType) {
            try {
                const hasCompleted = localStorage.getItem('hasCompletedTutorial');
                if (!hasCompleted) {
                    setShowTutorial(true);
                }
            } catch (e) {
                console.error("Could not access localStorage for tutorial", e);
                setShowTutorial(true); 
            }
        }
    }, [playerCountry, deviceType]);

    const handleCompleteTutorial = () => {
        try {
            localStorage.setItem('hasCompletedTutorial', 'true');
        } catch (e) {
            console.error("Could not save tutorial completion to localStorage", e);
        }
        setShowTutorial(false);
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
    
        if (gameState.status === GameStatus.PLAYING) {
            audio.play().catch(e => console.error("Audio play failed:", e));
        } else {
            audio.pause();
            if (gameState.status === GameStatus.START || gameState.status === GameStatus.GAME_OVER) {
                audio.currentTime = 0;
            }
        }
    }, [gameState.status]);
    
    useEffect(() => {
        try {
            const savedDevice = localStorage.getItem('deviceType') as 'pc' | 'mobile' | null;
            if (savedDevice) {
                setDeviceType(savedDevice);
            } else {
                setShowDeviceModal(true);
            }
        } catch (e) {
            console.error("Could not access localStorage for device type", e);
            setShowDeviceModal(true);
        }
    }, []);

    useEffect(() => {
        const gameBoard = gameBoardRef.current;
        if (deviceType !== 'mobile' || !gameBoard) return;
        
        const handleResize = () => {
            const boardWidth = CANVAS_WIDTH + 192 + 16;
            const boardHeight = CANVAS_HEIGHT + 100;

            const scale = Math.min(
                window.innerWidth / boardWidth,
                window.innerHeight / boardHeight
            );

            gameBoard.style.transform = `scale(${scale})`;
            gameBoard.style.transformOrigin = 'top center';
        };
        
        handleResize();
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
            if (gameBoard) {
                gameBoard.style.transform = 'scale(1)';
            }
        };
    }, [deviceType]);

    useEffect(() => {
        if (deviceType !== 'pc') return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key.toLowerCase() === 'c') && !e.repeat) {
                if (gameState.status === GameStatus.PLAYING) {
                    buyShield();
                }
            }
            if (e.ctrlKey && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setShowCheatModal(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [buyShield, deviceType, gameState.status]);

    const handleCountrySelect = (country: Country) => {
        setPlayerCountry(country);
        setShowCountryModal(false);
        // Set locale based on country
        const newLocale = countryToLocaleMap[country.code] || 'en';
        setLocale(newLocale);

        try {
            localStorage.setItem('playerCountry', JSON.stringify(country));
        } catch (e) {
            console.error("Could not save country to localStorage", e);
        }
    };

    const handleDeviceSelect = (device: 'pc' | 'mobile') => {
        try {
            localStorage.setItem('deviceType', device);
        } catch (e) {
            console.error("Could not save device type to localStorage", e);
        }
        setDeviceType(device);
        setShowDeviceModal(false);
    };
    
    const handleSaveCustomization = (newCustomization: TankCustomization) => {
        setCustomization(newCustomization);
        try {
            localStorage.setItem('tankCustomization', JSON.stringify(newCustomization));
        } catch(e) {
            console.error("Could not save customization to localStorage", e);
        }
        setShowCustomizationModal(false);
    };

     const handleSaveMods = (newMods: string[]) => {
        setActiveMods(newMods);
        try {
            localStorage.setItem('activeMods', JSON.stringify(newMods));
        } catch (e) {
            console.error("Could not save mods to localStorage", e);
        }
        setShowModsModal(false);
    };

    useEffect(() => {
        try {
            const savedCountry = localStorage.getItem('playerCountry');
            if (savedCountry) {
                const country = JSON.parse(savedCountry) as Country;
                if (COUNTRIES.find(c => c.code === country.code)) {
                    setPlayerCountry(country);
                    setShowCountryModal(false);
                     // Set locale on initial load from saved country
                    const newLocale = countryToLocaleMap[country.code] || 'en';
                    setLocale(newLocale);
                }
            }
        } catch (e) {
            console.error("Could not load country from localStorage", e);
        }
    }, [setLocale]);

    const handleCheatCode = (code: string) => {
        applyCheat(code);
        setShowCheatModal(false);
    };

    const renderModal = (title: string, children: React.ReactNode) => (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50">
            <div className="bg-[#1a1a1a] border-2 border-[#444] rounded-lg p-8 shadow-lg text-center w-full max-w-md animate-fade-in">
                <h2 className="text-3xl font-bold text-[#00ff00] mb-6 tracking-widest">{title}</h2>
                {children}
            </div>
        </div>
    );

    const UIButton: React.FC<{onClick?: () => void; children: React.ReactNode; className?: string, disabled?: boolean, secondary?: boolean}> = ({onClick, children, className, disabled, secondary}) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`font-bold py-3 px-6 rounded-md hover:bg-white transition-all duration-300 transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed ${
                secondary 
                ? 'bg-transparent border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black' 
                : 'bg-[#00ff00] text-black'
            } ${className}`}
        >
            {children}
        </button>
    );

    if (showCountryModal) {
        return renderModal(t('chooseCountry'), (
            <div className="flex flex-col gap-4">
                <p className="text-gray-300 mb-4">{t('countryDesc')}</p>
                <select 
                    onChange={e => {
                        const country = COUNTRIES.find(c => c.code === e.target.value);
                        if (country) handleCountrySelect(country);
                    }}
                    defaultValue=""
                    className="bg-[#2a2a2a] border border-[#444] text-white p-3 rounded-md w-full"
                >
                    <option value="" disabled>{t('selectCountry')}</option>
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
                </select>
            </div>
        ));
    }

    if (showDeviceModal) {
        return renderModal(t('selectControlType'), (
            <div className="flex flex-col gap-4">
                 <p className="text-gray-300 mb-4">{t('howAreYouPlaying')}</p>
                 <UIButton onClick={() => handleDeviceSelect('pc')}>{t('pcControls')}</UIButton>
                 <UIButton onClick={() => handleDeviceSelect('mobile')}>{t('mobileControls')}</UIButton>
            </div>
        ));
    }
    
    return (
      <>
        <div className="scanline-overlay"></div>
        <audio ref={audioRef} src="https://storage.googleapis.com/proud-star-423616-g6-public/pixel-tank-arena-bgm.mp3" loop />

        {showTutorial && <TutorialModal t={t} deviceType={deviceType} onFinish={handleCompleteTutorial} />}

        {showCustomizationModal && (
            renderModal(t('customizeTank'), (
                <CustomizationModal current={customization} onSave={handleSaveCustomization} onCancel={() => setShowCustomizationModal(false)} t={t} />
            ))
        )}

        {showCheatModal && (
             renderModal(t('enterCheatCode'), (
                <CheatModal onConfirm={handleCheatCode} onCancel={() => setShowCheatModal(false)} t={t} />
             ))
        )}
        
        {showModsModal && (
            renderModal(t('gameMods'), (
                <ModsModal current={activeMods} onSave={handleSaveMods} onCancel={() => setShowModsModal(false)} t={t} />
            ))
        )}

        <div ref={gameBoardRef} className="flex flex-col items-center p-4">
            <header className="w-full max-w-[1248px] mb-2 text-center">
                <h1 className="text-4xl font-bold text-[#00ff00] tracking-widest text-glow" onClick={() => setShowCheatModal(true)}>{t('title')}</h1>
            </header>
            
            <main className="flex flex-row gap-4">
                {/* Left Panel */}
                <aside className="w-48 bg-black/50 border-2 border-[#444] rounded-lg p-3 flex flex-col gap-3 backdrop-blur-sm">
                     <div className="text-center">
                        <h3 className="font-bold text-[#00ff00]">{t('difficulty')}</h3>
                        <p className="text-2xl font-mono">{gameState.difficulty}</p>
                    </div>
                    <div className="text-center">
                        <h3 className="font-bold text-[#00ff00]">{t('time')}</h3>
                        <p className="text-2xl font-mono">{Math.floor(gameState.time)}s</p>
                    </div>
                    {/* Leaderboard */}
                    <div className="flex-1 overflow-y-auto">
                         <h4 className="font-bold text-[#00ff00] text-center">{t('leaderboard')}</h4>
                         <ul className="text-sm">
                            {gameState.leaderboard.slice(0, 10).map((s, i) => (
                                <li key={i} className={`flex justify-between items-center p-1 rounded ${i === 0 ? 'bg-yellow-500/30' : ''}`}>
                                    <span>{s.flag}</span>
                                    <span className="font-mono">{s.score}</span>
                                </li>
                            ))}
                         </ul>
                    </div>
                </aside>
                
                {/* Game Area */}
                <div className="relative border-4 border-[#00ff00]/50 rounded-lg overflow-hidden shadow-2xl shadow-green-500/30">
                    {gameState.boss && <BossHealthBar boss={gameState.boss} t={t} />}
                    <GameCanvas gameState={gameState} />
                    {deviceType === 'mobile' && <MobileControls keys={keys} activateAbility={activateAbility} buyShield={buyShield} />}
                    
                    {(gameState.status === GameStatus.START || gameState.status === GameStatus.GAME_OVER) && (
                        <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col justify-center items-center gap-4 p-4">
                            {gameState.status === GameStatus.START && <h2 className="text-6xl font-bold text-[#00ff00] animate-pulse">{t('fight')}</h2>}
                            {gameState.status === GameStatus.GAME_OVER && (
                                <>
                                    <h2 className="text-5xl font-bold text-red-500">{t('gameOver')}</h2>
                                    <p className="text-2xl text-white">{t('finalScore')}: {gameState.score}</p>
                                </>
                            )}
                            
                            <UIButton onClick={() => startGame(customization, activeMods)} className="button-pulse w-full max-w-xs">
                                {gameState.status === GameStatus.START ? t('startGame') : t('restartGame')}
                            </UIButton>
                            <div className="flex gap-2 mt-2">
                                <UIButton onClick={() => setShowCustomizationModal(true)} secondary className="!py-2 !px-4 text-sm">{t('customizeTank')}</UIButton>
                                <UIButton onClick={() => setShowModsModal(true)} secondary className="!py-2 !px-4 text-sm">{t('gameMods')}</UIButton>
                            </div>
                        </div>
                    )}
                    
                    {gameState.isLevelUpModalOpen && (
                        <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col justify-center items-center gap-4 p-8">
                             <h2 className="text-4xl font-bold text-yellow-400">{t('levelUp')}</h2>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {gameState.upgradeChoices.map(upgrade => (
                                    <div key={upgrade.id} className="bg-[#2a2a2a] border-2 border-yellow-400 p-4 rounded-lg flex flex-col items-center text-center hover:bg-yellow-400/20 transition-colors">
                                        <h3 className="text-lg font-bold text-yellow-300">{t(upgrade.title)}</h3>
                                        <p className="text-sm text-gray-300 mb-4">{t(upgrade.description)}</p>
                                        <UIButton onClick={() => selectUpgrade(upgrade)}>Select</UIButton>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}
                </div>

                {/* Right Panel */}
                 <aside className="w-48 bg-black/50 border-2 border-[#444] rounded-lg p-3 flex flex-col gap-3 backdrop-blur-sm">
                    <div className="text-center">
                        <h3 className="font-bold text-[#00ff00]">{t('country')}</h3>
                        <p className="text-2xl">{playerCountry?.flag}</p>
                    </div>
                    <div className="text-center">
                        <h3 className="font-bold text-[#00ff00]">{t('health')}</h3>
                        <div className="w-full bg-gray-700 rounded-full h-4 border border-gray-500">
                            <div className="bg-green-500 h-full rounded-full" style={{width: `${gameState.player ? (gameState.player.health / gameState.player.maxHealth) * 100 : 100}%`}}></div>
                        </div>
                    </div>
                    <div className="text-center">
                        <h3 className="font-bold text-[#00ff00]">{t('ability')}</h3>
                        <UIButton onClick={activateAbility} disabled={gameState.player?.abilityCooldown > 0} className="w-full">
                            {gameState.player?.abilityCooldown > 0 ? `${(gameState.player.abilityCooldown / 60).toFixed(1)}s` : t('ready')}
                        </UIButton>
                    </div>
                    <div className="text-center">
                        <h3 className="font-bold text-[#00ff00]">{t('score')}</h3>
                        <p className="text-2xl font-mono">{displayedScore}</p>
                    </div>
                     <div className="text-center">
                        <h3 className="font-bold text-[#00ff00]">{t('killStreak')}</h3>
                        <p className="text-xl font-mono text-orange-400">{gameState.killStreak} <span className="text-sm">(x{gameState.scoreMultiplier.toFixed(1)})</span></p>
                    </div>
                    <div className="bg-[#2a2a2a] p-2 rounded-lg text-center mt-auto flex flex-col gap-2">
                        <h4 className="font-bold text-[#00ff00]">{t('shop')}</h4>
                        <div>
                            <p className="text-xs text-gray-300">{t('shop.shield.name')}</p>
                            <p className="text-xs text-gray-400 mb-1">{t('shop.shield.desc')}</p>
                            <p className="text-sm font-mono">{t('cost')}: {SHIELD_COST}</p>
                            <UIButton onClick={buyShield} disabled={gameState.score < SHIELD_COST} className="w-full text-sm !py-1 mt-1">
                                {t('buy')} ({gameState.shields} {t('owned')})
                            </UIButton>
                        </div>
                        <div>
                            <p className="text-xs text-gray-300">{t('shop.martyrsBeacon.name')}</p>
                            <p className="text-xs text-gray-400 mb-1">{t('shop.martyrsBeacon.desc')}</p>
                            <p className="text-sm font-mono">{t('cost')}: {MARTYRS_BEACON_COST}</p>
                            <UIButton onClick={buyMartyrsBeacon} disabled={gameState.score < MARTYRS_BEACON_COST || gameState.martyrsBeaconPurchased} className="w-full text-sm !py-1 mt-1">
                                {gameState.martyrsBeaconPurchased ? t('shop.martyrsBeacon.purchased') : t('buy')}
                            </UIButton>
                        </div>
                    </div>
                      <div className="text-center text-xs text-gray-400">
                        <h3 className="font-bold text-[#00ff00]">{t('modsActive')}</h3>
                        <div className="h-6 overflow-y-auto">
                            {activeMods.length > 0 ? activeMods.map(m => t(`mods.${m}.title`)).join(', ') : t('noModsActive')}
                        </div>
                    </div>
                </aside>
            </main>
        </div>
      </>
    );
};

// --- Helper Components ---
const BossHealthBar: React.FC<{boss: Tank; t: (key: string) => string}> = ({boss, t}) => {
    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-3/4 z-10">
            <h3 className="text-center font-bold text-red-500 text-glow text-xl tracking-widest">{t('boss.name')}</h3>
            <div className="w-full bg-black/50 border-2 border-red-500 rounded-full h-6 p-1">
                <div className="bg-red-600 h-full rounded-full transition-all duration-300" style={{width: `${(boss.health / boss.maxHealth) * 100}%`}}></div>
            </div>
        </div>
    );
};

const MobileControls: React.FC<{ keys: React.MutableRefObject<Keys>, activateAbility: () => void, buyShield: () => void }> = ({ keys, activateAbility, buyShield }) => {
    const joystickRef = useRef<HTMLDivElement>(null);
    const joystickInnerRef = useRef<HTMLDivElement>(null);

    const handleJoystickMove = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        const touch = e.touches[0];
        const joystick = joystickRef.current;
        if (!joystick || !joystickInnerRef.current) return;

        const rect = joystick.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;
        const dist = Math.hypot(dx, dy);
        const maxDist = rect.width / 2 - joystickInnerRef.current.offsetWidth / 2;

        if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
        }

        joystickInnerRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
        
        keys.current.w = dy < -maxDist * 0.3;
        keys.current.s = dy > maxDist * 0.3;
        keys.current.a = dx < -maxDist * 0.3;
        keys.current.d = dx > maxDist * 0.3;

    }, [keys]);

    const handleJoystickEnd = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        if (joystickInnerRef.current) {
            joystickInnerRef.current.style.transform = `translate(0px, 0px)`;
        }
        keys.current.w = false;
        keys.current.s = false;
        keys.current.a = false;
        keys.current.d = false;
    }, [keys]);

    const handleButtonTouch = (key: keyof Keys, value: boolean) => (e: React.TouchEvent) => {
        e.preventDefault();
        keys.current[key] = value;
    };

    return (
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            {/* Joystick */}
            <div 
                ref={joystickRef}
                onTouchStart={handleJoystickMove}
                onTouchMove={handleJoystickMove}
                onTouchEnd={handleJoystickEnd}
                className="absolute bottom-8 left-8 w-32 h-32 bg-white/20 rounded-full pointer-events-auto"
            >
                <div 
                    ref={joystickInnerRef}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white/40 rounded-full transition-transform duration-75"
                />
            </div>

            {/* Action Buttons */}
            <div className="absolute bottom-8 right-8 flex flex-col gap-4 items-center pointer-events-auto">
                <button
                    onTouchStart={handleButtonTouch(' ', true)}
                    onTouchEnd={handleButtonTouch(' ', false)}
                    className="w-24 h-24 bg-red-500/50 rounded-full flex justify-center items-center text-white font-bold text-xl active:bg-red-500/80"
                >
                    ATEŞ
                </button>
                <div className="flex gap-4">
                    <button
                        onClick={activateAbility}
                        className="w-16 h-16 bg-green-500/50 rounded-full flex justify-center items-center text-white font-bold active:bg-green-500/80"
                    >
                        YETNK
                    </button>
                     <button
                        onClick={buyShield}
                        className="w-16 h-16 bg-blue-500/50 rounded-full flex justify-center items-center text-white font-bold text-xs p-1 text-center active:bg-blue-500/80"
                    >
                        KALKAN AL
                    </button>
                </div>
            </div>
        </div>
    );
};

const TutorialGraphic: React.FC<{ stepId: string, deviceType: 'pc' | 'mobile' | null }> = ({ stepId, deviceType }) => {
    const renderContent = () => {
        switch (stepId) {
            case 'move':
                return deviceType === 'pc' ? (
                    <svg viewBox="0 0 100 60" className="w-48 h-auto">
                         <defs><style>{`
                            .tut-key { fill: #444; stroke: #666; }
                            .tut-text { fill: #fff; font-family: 'Chivo Mono', monospace; font-size: 8px; text-anchor: middle; }
                            .key-w { animation: press-key-w 4s infinite; }
                            .key-a { animation: press-key-a 4s infinite; }
                            .key-s { animation: press-key-s 4s infinite; }
                            .key-d { animation: press-key-d 4s infinite; }
                            .tut-tank { animation: move-tank 4s infinite; }
                            @keyframes press-key-w { 0%, 20%, 100% { transform: translateY(0); } 10% { transform: translateY(1px); } }
                            @keyframes press-key-a { 20%, 45%, 100% { transform: translateY(0); } 32.5% { transform: translateY(1px); } }
                            @keyframes press-key-s { 45%, 70%, 100% { transform: translateY(0); } 57.5% { transform: translateY(1px); } }
                            @keyframes press-key-d { 70%, 95%, 100% { transform: translateY(0); } 82.5% { transform: translateY(1px); } }
                            @keyframes move-tank { 0% { transform: translate(0,0); } 25% { transform: translate(0, -15px); } 50% { transform: translate(-15px, -15px); } 75% { transform: translate(-15px, 0); } 100% { transform: translate(0,0); } }
                        `}</style></defs>
                        <g className="key-w"><rect x="22" y="5" width="12" height="12" rx="2" className="tut-key" /><text x="28" y="13" className="tut-text">W</text></g>
                        <g className="key-a"><rect x="8" y="20" width="12" height="12" rx="2" className="tut-key" /><text x="14" y="28" className="tut-text">A</text></g>
                        <g className="key-s"><rect x="22" y="20" width="12" height="12" rx="2" className="tut-key" /><text x="28" y="28" className="tut-text">S</text></g>
                        <g className="key-d"><rect x="36" y="20" width="12" height="12" rx="2" className="tut-key" /><text x="42" y="28" className="tut-text">D</text></g>
                        <g className="tut-tank" transform="translate(70, 30)">
                            <rect x="-10" y="-6" width="20" height="12" fill="#556B2F" />
                            <rect x="-5" y="-3" width="10" height="6" fill="#6B8E23" />
                            <rect x="5" y="-1.5" width="10" height="3" fill="#4a4a4a" />
                        </g>
                    </svg>
                ) : (
                    <svg viewBox="0 0 100 60" className="w-48 h-auto">
                         <defs><style>{`.tut-tank { animation: move-tank 4s infinite; } .joystick-inner { animation: joystick-move 4s infinite ease-in-out; } @keyframes joystick-move { 0%,100% { cy: 30; } 25% { cy: 15; } 50% { cx: 15; } 75% { cy: 45; } } @keyframes move-tank { 0% { transform: translate(0,0); } 25% { transform: translate(0, -15px); } 50% { transform: translate(-15px, -15px); } 75% { transform: translate(-15px, 0); } 100% { transform: translate(0,0); } }`}</style></defs>
                        <circle cx="30" cy="30" r="25" fill="white" opacity="0.2" />
                        <circle cx="30" cy="30" r="12" fill="white" opacity="0.4" className="joystick-inner" />
                        <g className="tut-tank" transform="translate(70, 30)">
                             <rect x="-10" y="-6" width="20" height="12" fill="#556B2F" /><rect x="-5" y="-3" width="10" height="6" fill="#6B8E23" /><rect x="5" y="-1.5" width="10" height="3" fill="#4a4a4a" />
                        </g>
                    </svg>
                );
            case 'fire':
                 return (
                    <svg viewBox="0 0 100 60" className="w-48 h-auto">
                        <defs><style>{`
                            .tut-bullet { animation: fire-bullet 1s infinite ease-out; } 
                            .tut-enemy { animation: enemy-hit 1s infinite; }
                            @keyframes fire-bullet { 0% { transform: translateX(0); opacity: 1; } 100% { transform: translateX(45px); opacity: 0; } }
                            @keyframes enemy-hit { 0%, 50%, 100% { fill: #B31942; } 55%, 65% { fill: #fff; } }
                        `}</style></defs>
                        <g transform="translate(20, 30)">
                            <rect x="-10" y="-6" width="20" height="12" fill="#556B2F" /><rect x="-5" y="-3" width="10" height="6" fill="#6B8E23" /><rect x="5" y="-1.5" width="10" height="3" fill="#4a4a4a" />
                        </g>
                        <circle cx="38" cy="30" r="3" fill="#00FFFF" className="tut-bullet" />
                        <rect x="85" y="24" width="12" height="12" className="tut-enemy" />
                    </svg>
                );
            case 'ability':
                return (
                    <svg viewBox="0 0 100 60" className="w-48 h-auto">
                         <defs><style>{`
                            .cooldown-circle { stroke-dasharray: 63; animation: cooldown-fill 3s infinite linear; transform-origin: center; transform: rotate(-90deg); }
                            @keyframes cooldown-fill { 0% { stroke-dashoffset: 63; } 100% { stroke-dashoffset: 0; } }
                        `}</style></defs>
                        <circle cx="50" cy="30" r="20" fill="#2a2a2a" stroke="#444" strokeWidth="2" />
                        <circle cx="50" cy="30" r="10" fill="none" stroke="#00ff00" strokeWidth="20" className="cooldown-circle" />
                        <text x="50" y="34" className="tut-text" fontSize="10px">Q</text>
                    </svg>
                );
            case 'shop':
                return (
                     <svg viewBox="0 0 100 60" className="w-48 h-auto">
                        <defs><style>{`
                            .score-text { animation: score-up 2s infinite; }
                            .shield-icon { animation: shield-pop 2s infinite; }
                            @keyframes score-up { 0%, 40% { opacity: 0; } 60%, 100% { opacity: 1; } }
                            @keyframes shield-pop { 0%, 60% { transform: scale(0); } 80% { transform: scale(1.2); } 100% { transform: scale(1); } }
                        `}</style></defs>
                        <text x="30" y="25" className="tut-text" fontSize="12px">SKOR</text>
                        <text x="30" y="45" className="tut-text" fontSize="14px">4500</text>
                        <g className="score-text">
                            <path d="M 50 35 L 55 30 L 60 35" stroke="#00ff00" fill="none" />
                            <text x="75" y="45" className="tut-text" fontSize="14px">5000</text>
                        </g>
                        <g transform="translate(50, 30)" className="shield-icon">
                            <path d="M -10 0 L 0 -10 L 10 0 L 0 10 Z" fill="#00BFFF" />
                        </g>
                    </svg>
                );
            case 'xp':
                return (
                     <svg viewBox="0 0 100 60" className="w-48 h-auto">
                         <defs><style>{`
                            .xp-orb-1 { animation: collect-xp 3s infinite; }
                            .xp-orb-2 { animation: collect-xp 3s infinite; animation-delay: 0.2s; }
                            .xp-orb-3 { animation: collect-xp 3s infinite; animation-delay: 0.4s; }
                            @keyframes collect-xp { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(-30px, 10px) scale(0); opacity: 0; } }
                         `}</style></defs>
                        <g transform="translate(30, 30)">
                            <rect x="-10" y="-6" width="20" height="12" fill="#556B2F" /><rect x="-5" y="-3" width="10" height="6" fill="#6B8E23" />
                        </g>
                        <circle cx="60" cy="20" r="4" fill="#00FFFF" className="xp-orb-1" />
                        <circle cx="70" cy="35" r="4" fill="#00FFFF" className="xp-orb-2" />
                        <circle cx="55" cy="45" r="4" fill="#00FFFF" className="xp-orb-3" />
                     </svg>
                );
            case 'survive':
                 return (
                    <svg viewBox="0 0 100 60" className="w-48 h-auto">
                        <g transform="translate(50, 30)"><rect x="-8" y="-5" width="16" height="10" fill="#556B2F" /></g>
                        <g transform="translate(20, 15)"><rect x="-6" y="-4" width="12" height="8" fill="#B31942" /></g>
                        <g transform="translate(80, 20)"><rect x="-6" y="-4" width="12" height="8" fill="#B31942" /></g>
                        <g transform="translate(30, 50)"><rect x="-6" y="-4" width="12" height="8" fill="#B31942" /></g>
                        <g transform="translate(75, 45)"><rect x="-6" y="-4" width="12" height="8" fill="#B31942" /></g>
                    </svg>
                );
            default: return null;
        }
    }
    return (
        <div className="mb-4 h-24 flex justify-center items-center bg-black/20 rounded-lg overflow-hidden">
            {renderContent()}
        </div>
    );
};

const TutorialModal: React.FC<{t: (key: string) => string; deviceType: 'pc'|'mobile'|null; onFinish: () => void}> = ({t, deviceType, onFinish}) => {
    const steps = [
        { title: 'tutorial.step1.title', content: deviceType === 'pc' ? 'tutorial.step1.pc' : 'tutorial.step1.mobile', graphic: 'move' },
        { title: 'tutorial.step2.title', content: deviceType === 'pc' ? 'tutorial.step2.pc' : 'tutorial.step2.mobile', graphic: 'fire' },
        { title: 'tutorial.step3.title', content: deviceType === 'pc' ? 'tutorial.step3.pc' : 'tutorial.step3.mobile', graphic: 'ability' },
        { title: 'tutorial.step4.title', content: deviceType === 'pc' ? 'tutorial.step4.pc' : 'tutorial.step4.mobile', graphic: 'shop' },
        { title: 'tutorial.step5.title', content: 'tutorial.step5.content', graphic: 'xp' },
        { title: 'tutorial.step6.title', content: 'tutorial.step6.content', graphic: 'survive' },
    ];
    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex justify-center items-center z-50 p-4">
            <div className="bg-[#1a1a1a] border-2 border-[#444] rounded-lg p-8 shadow-lg w-full max-w-4xl text-center">
                <h2 className="text-3xl font-bold text-[#00ff00] mb-6">{t('tutorial.title')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[60vh] overflow-y-auto pr-4">
                    {steps.map((step) => (
                        <div key={step.graphic} className="flex flex-col items-center">
                             <h3 className="text-xl font-bold text-yellow-300 mb-2">{t(step.title)}</h3>
                             <TutorialGraphic stepId={step.graphic} deviceType={deviceType} />
                             <p className="text-gray-300 text-sm">{t(step.content)}</p>
                        </div>
                    ))}
                </div>
                <div className="mt-8 flex justify-center">
                     <button onClick={onFinish} className="bg-[#00ff00] text-black font-bold py-3 px-8 rounded text-lg button-pulse">{t('tutorial.finish')}</button>
                </div>
            </div>
        </div>
    );
};

const CustomizationModal: React.FC<{current: TankCustomization; onSave: (c: TankCustomization) => void; onCancel: () => void; t: (key:string)=>string}> = ({current, onSave, onCancel, t}) => {
    const [custom, setCustom] = useState(current);
    const ColorButton: React.FC<{color:string, type: 'base' | 'turret'}> = ({color, type}) => (
        <button
            onClick={() => setCustom(c => ({...c, [`${type}Color`]: color}))}
            className={`w-10 h-10 rounded-full border-2 ${custom[`${type}Color`] === color ? 'border-white' : 'border-transparent'}`}
            style={{backgroundColor: color}}
            aria-label={`${type} color ${color}`}
        />
    )
    return (
        <div className="flex flex-col gap-6">
            <div>
                <h3 className="text-lg font-bold mb-2">{t('baseColor')}</h3>
                <div className="flex flex-wrap gap-2 justify-center">{CUSTOMIZATION_COLORS.map(c => <ColorButton key={c+"b"} color={c} type="base"/>)}</div>
            </div>
             <div>
                <h3 className="text-lg font-bold mb-2">{t('turretColor')}</h3>
                <div className="flex flex-wrap gap-2 justify-center">{CUSTOMIZATION_COLORS.map(c => <ColorButton key={c+"t"} color={c} type="turret"/>)}</div>
            </div>
            <div className="flex justify-center gap-4 mt-4">
                <button onClick={onCancel} className="text-gray-400">{t('cancel')}</button>
                <button onClick={() => onSave(custom)} className="bg-[#00ff00] text-black font-bold py-2 px-6 rounded">{t('saveAndClose')}</button>
            </div>
        </div>
    );
}

const CheatModal: React.FC<{ onConfirm: (code: string) => void; onCancel: () => void; t: (key: string) => string; }> = ({ onConfirm, onCancel, t }) => {
    const [code, setCode] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleConfirm = () => {
        onConfirm(code.toLowerCase());
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleConfirm();
        }
    };

    return (
         <div className="flex flex-col gap-4">
            <input 
                ref={inputRef}
                type="text" 
                value={code} 
                onChange={e => setCode(e.target.value)} 
                onKeyDown={handleKeyDown}
                className="bg-[#2a2a2a] border border-[#444] text-white p-3 rounded-md w-full" 
            />
             <div className="flex justify-center gap-4 mt-4">
                <button onClick={onCancel} className="text-gray-400">{t('cancel')}</button>
                <button onClick={handleConfirm} className="bg-[#00ff00] text-black font-bold py-2 px-6 rounded">{t('confirm')}</button>
            </div>
        </div>
    );
};

const ModsModal: React.FC<{ current: string[], onSave: (mods: string[]) => void, onCancel: () => void, t: (key: string) => string }> = ({ current, onSave, onCancel, t }) => {
    const [selected, setSelected] = useState<string[]>(current);
    const toggleMod = (id: string) => {
        setSelected(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
    };
    return (
         <div className="flex flex-col gap-4 max-h-96 overflow-y-auto">
            {AVAILABLE_MODS.map(mod => (
                <div key={mod.id} onClick={() => toggleMod(mod.id)} className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${selected.includes(mod.id) ? 'border-green-500 bg-green-500/20' : 'border-[#444]'}`}>
                    <h3 className="font-bold text-lg">{t(mod.titleKey)}</h3>
                    <p className="text-sm text-gray-400">{t(mod.descKey)}</p>
                </div>
            ))}
            <div className="flex justify-center gap-4 mt-4">
                <button onClick={onCancel} className="text-gray-400">{t('cancel')}</button>
                <button onClick={() => onSave(selected)} className="bg-[#00ff00] text-black font-bold py-2 px-6 rounded">{t('saveAndClose')}</button>
            </div>
        </div>
    );
};


export default App;