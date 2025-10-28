import React, { useRef, useEffect } from 'react';
import type { GameState, Tank, Bullet, Explosion, PowerUp, MuzzleFlash, SmokeParticle, ExperienceOrb, KamikazeDrone, Mine, TireTrackPoint, GameEntity, Particle, FloatingText, WeatherState, ArtilleryTarget, MartyrsBeacon, SolarFlareWarning, BlackHole, ScorchMark, EMPBlast, Asteroid, SpaceDebris, Building, Rubble } from '../types';

interface GameCanvasProps {
    gameStateRef: React.RefObject<GameState>;
    width: number;
    height: number;
}

const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const flagRenderers: Record<string, (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => void> = {
    US: (ctx, x, y, w, h) => {
        const stripeH = Math.max(1, Math.round(h / 13));
        for (let i = 0; i < 13; i++) {
            if (y + (i * stripeH) >= y + h) break;
            ctx.fillStyle = i % 2 === 0 ? '#B31942' : '#FFFFFF';
            ctx.fillRect(x, y + i * stripeH, w, stripeH);
        }
        ctx.fillStyle = '#0A3161';
        ctx.fillRect(x, y, Math.round(w * 0.4), Math.round(h * 0.54));
    },
    TR: (ctx, x, y, w, h) => {
        ctx.fillStyle = '#E30A17';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#FFFFFF';
        const cx = x + w * 0.4;
        const cy = y + h / 2;
        const r1 = h * 0.25;
        const r2 = h * 0.2;
        ctx.beginPath();
        ctx.arc(cx, cy, r1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#E30A17';
        ctx.beginPath();
        ctx.arc(cx + w * 0.06, cy, r2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        const starX = x + w * 0.55;
        const starR = h * 0.1;
        ctx.save();
        ctx.translate(starX, cy);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            ctx.lineTo(starR * Math.cos(i * 2 * Math.PI / 5 - Math.PI / 2), starR * Math.sin(i * 2 * Math.PI / 5 - Math.PI / 2));
            ctx.lineTo(starR/2 * Math.cos((i * 2 + 1) * Math.PI / 5 - Math.PI / 2), starR/2 * Math.sin((i * 2 + 1) * Math.PI / 5 - Math.PI / 2));
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    },
    DE: (ctx, x, y, w, h) => {
        const third = Math.round(h / 3);
        ctx.fillStyle = '#000000'; ctx.fillRect(x, y, w, third);
        ctx.fillStyle = '#FF0000'; ctx.fillRect(x, y + third, w, third);
        ctx.fillStyle = '#FFCC00'; ctx.fillRect(x, y + third * 2, w, h - (third * 2));
    },
    RU: (ctx, x, y, w, h) => {
        const third = Math.round(h / 3);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y, w, third);
        ctx.fillStyle = '#0033A0'; ctx.fillRect(x, y + third, w, third);
        ctx.fillStyle = '#D52B1E'; ctx.fillRect(x, y + third * 2, w, h - (third * 2));
    },
    JP: (ctx, x, y, w, h) => {
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#BC002D'; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, h * 0.3, 0, Math.PI * 2); ctx.fill();
    },
    IN: (ctx, x, y, w, h) => {
        const third = Math.round(h / 3);
        ctx.fillStyle = '#FF9933'; ctx.fillRect(x, y, w, third);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y + third, w, third);
        ctx.fillStyle = '#138808'; ctx.fillRect(x, y + third * 2, w, h - (third*2));
        ctx.strokeStyle = '#000080'; ctx.lineWidth = Math.max(1, w * 0.05); ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, h * 0.1, 0, Math.PI * 2); ctx.stroke();
    },
    CN: (ctx, x, y, w, h) => {
        ctx.fillStyle = '#EE1C25'; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#FFFF00';
        const drawStar = (cx: number, cy: number, r: number) => {
             ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        };
        drawStar(x + w * 0.15, y + h * 0.25, h * 0.12);
        drawStar(x + w * 0.3, y + h * 0.1, h * 0.04);
        drawStar(x + w * 0.35, y + h * 0.2, h * 0.04);
        drawStar(x + w * 0.35, y + h * 0.35, h * 0.04);
        drawStar(x + w * 0.3, y + h * 0.45, h * 0.04);
    },
    FR: (ctx, x, y, w, h) => {
        const third = Math.round(w / 3);
        ctx.fillStyle = '#0055A4'; ctx.fillRect(x, y, third, h);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x + third, y, third, h);
        ctx.fillStyle = '#EF4135'; ctx.fillRect(x + third * 2, y, w - (third*2), h);
    },
    GB: (ctx, x, y, w, h) => {
        ctx.fillStyle = '#012169'; ctx.fillRect(x, y, w, h);
        ctx.save();
        ctx.beginPath(); ctx.rect(x,y,w,h); ctx.clip();
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = Math.max(1, h * 0.2);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x, y + h); ctx.stroke();
        ctx.strokeStyle = '#C8102E'; ctx.lineWidth = Math.max(1, h * 0.1);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x, y + h); ctx.stroke();
        
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = Math.max(2, h * 0.33);
        ctx.beginPath();
        ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2);
        ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h);
        ctx.stroke();

        ctx.strokeStyle = '#C8102E';
        ctx.lineWidth = Math.max(1, h * 0.2);
        ctx.beginPath();
        ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2);
        ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h);
        ctx.stroke();
        
        ctx.restore();
    },
    BR: (ctx, x, y, w, h) => {
        ctx.fillStyle = '#009B3A'; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#FFCC29';
        ctx.beginPath();
        ctx.moveTo(x + w * 0.1, y + h / 2);
        ctx.lineTo(x + w / 2, y + h * 0.1);
        ctx.lineTo(x + w * 0.9, y + h / 2);
        ctx.lineTo(x + w / 2, y + h * 0.9);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#002776';
        ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, h * 0.18, 0, Math.PI * 2); ctx.fill();
    },
    CA: (ctx, x, y, w, h) => {
        const third = Math.round(w / 4);
        ctx.fillStyle = '#FF0000'; ctx.fillRect(x, y, third, h);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x + third, y, w - 2 * third, h);
        ctx.fillStyle = '#FF0000'; ctx.fillRect(x + w - third, y, third, h);
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        const cx = x + w / 2, cy = y + h / 2;
        ctx.moveTo(cx, cy - h * 0.2);
        ctx.lineTo(cx + w * 0.05, cy - h * 0.1);
        ctx.lineTo(cx + w * 0.15, cy - h * 0.15);
        ctx.lineTo(cx + w * 0.1, cy);
        ctx.lineTo(cx + w * 0.2, cy + h * 0.1);
        ctx.lineTo(cx, cy + h * 0.3);
        ctx.lineTo(cx - w * 0.2, cy + h * 0.1);
        ctx.lineTo(cx - w * 0.1, cy);
        ctx.lineTo(cx - w * 0.15, cy - h * 0.15);
        ctx.lineTo(cx - w * 0.05, cy - h * 0.1);
        ctx.closePath();
        ctx.fill();
    },
    IT: (ctx, x, y, w, h) => {
        const third = Math.round(w / 3);
        ctx.fillStyle = '#009246'; ctx.fillRect(x, y, third, h);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x + third, y, third, h);
        ctx.fillStyle = '#CE2B37'; ctx.fillRect(x + third * 2, y, w - (third*2), h);
    },
    AU: (ctx, x, y, w, h) => {
        ctx.fillStyle = '#00008B'; ctx.fillRect(x, y, w, h);
        flagRenderers.GB(ctx, x, y, w / 2, h / 2);
        ctx.fillStyle = '#FFFFFF';
        const drawStar = (cx:number, cy:number, r:number, points:number) => {
            ctx.beginPath();
            for (let i = 0; i < points * 2; i++) {
                const radius = i % 2 === 0 ? r : r / 2;
                ctx.lineTo(cx + radius * Math.cos(i * Math.PI / points - Math.PI / 2), cy + radius * Math.sin(i * Math.PI / points - Math.PI / 2));
            }
            ctx.closePath();
            ctx.fill();
        };
        drawStar(x + w * 0.75, y + h * 0.25, h * 0.08, 7);
        drawStar(x + w * 0.75, y + h * 0.75, h * 0.08, 7);
        drawStar(x + w * 0.6, y + h * 0.5, h * 0.05, 7);
        drawStar(x + w * 0.9, y + h * 0.5, h * 0.05, 7);
    },
    KR: (ctx, x, y, w, h) => {
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y, w, h);
        const cx = x + w / 2, cy = y + h / 2, r = h * 0.22;
        ctx.fillStyle = '#CD2E3A'; ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#0047A0'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI); ctx.fill();
        ctx.fillStyle = '#000000';
        const barW = w * 0.1, barH = h * 0.08;
        ctx.fillRect(x + w*0.15, y+h*0.2, barW, barH);
        ctx.fillRect(x + w*0.15, y+h*0.3, barW, barH);
        ctx.fillRect(x + w*0.15, y+h*0.4, barW, barH);
    },
    MX: (ctx, x, y, w, h) => {
        const third = Math.round(w / 3);
        ctx.fillStyle = '#006847'; ctx.fillRect(x, y, third, h);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x + third, y, third, h);
        ctx.fillStyle = '#CE1126'; ctx.fillRect(x + third * 2, y, w - (third*2), h);
        ctx.fillStyle = '#8B4513'; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, h * 0.1, 0, Math.PI*2); ctx.fill();
    },
    ES: (ctx, x, y, w, h) => {
        const half = Math.round(h/2);
        const quarter = Math.round(h/4);
        ctx.fillStyle = '#AA151B'; ctx.fillRect(x, y, w, quarter);
        ctx.fillStyle = '#F1BF00'; ctx.fillRect(x, y + quarter, w, half);
        ctx.fillStyle = '#AA151B'; ctx.fillRect(x, y + quarter + half, w, h - (quarter+half));
    },
    SA: (ctx, x, y, w, h) => {
        ctx.fillStyle = '#006C35'; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x + w * 0.1, y + h * 0.6, w * 0.8, h * 0.1);
    },
    AR: (ctx, x, y, w, h) => {
        const third = Math.round(h / 3);
        ctx.fillStyle = '#75AADB'; ctx.fillRect(x, y, w, third);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y + third, w, third);
        ctx.fillStyle = '#75AADB'; ctx.fillRect(x, y + third * 2, w, h - (third*2));
        ctx.fillStyle = '#F1BF00'; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, h * 0.1, 0, Math.PI * 2); ctx.fill();
    },
    NL: (ctx, x, y, w, h) => {
        const third = Math.round(h / 3);
        ctx.fillStyle = '#AE1C28'; ctx.fillRect(x, y, w, third);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y + third, w, third);
        ctx.fillStyle = '#21468B'; ctx.fillRect(x, y + third * 2, w, h - (third*2));
    },
    SE: (ctx, x, y, w, h) => {
        ctx.fillStyle = '#006AA7'; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#FECC00';
        const crossW = w * 0.15;
        const crossH = h * 0.25;
        ctx.fillRect(x, y + h/2 - crossH/2, w, crossH);
        ctx.fillRect(x + w*0.3, y, crossW, h);
    },
    CH: (ctx, x, y, w, h) => {
        ctx.fillStyle = '#FF0000'; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#FFFFFF';
        const armW = w * 0.2;
        const armL = w * 0.6;
        ctx.fillRect(x + w/2 - armL/2, y + h/2 - armW/2, armL, armW);
        ctx.fillRect(x + w/2 - armW/2, y + h/2 - armL/2, armW, armL);
    },
    PL: (ctx, x, y, w, h) => {
        const half = Math.round(h / 2);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y, w, half);
        ctx.fillStyle = '#DC143C'; ctx.fillRect(x, y + half, w, h - half);
    },
    BE: (ctx, x, y, w, h) => {
        const third = Math.round(w / 3);
        ctx.fillStyle = '#000000'; ctx.fillRect(x, y, third, h);
        ctx.fillStyle = '#FAE042'; ctx.fillRect(x + third, y, third, h);
        ctx.fillStyle = '#ED2939'; ctx.fillRect(x + third * 2, y, w - (third*2), h);
    },
    ID: (ctx, x, y, w, h) => {
        const half = Math.round(h / 2);
        ctx.fillStyle = '#FF0000'; ctx.fillRect(x, y, w, half);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y + half, w, h-half);
    },
    NG: (ctx, x, y, w, h) => {
        const third = Math.round(w/3);
        ctx.fillStyle = '#008751'; ctx.fillRect(x, y, third, h);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x+third, y, third, h);
        ctx.fillStyle = '#008751'; ctx.fillRect(x+2*third, y, w - 2*third, h);
    },
    ZA: (ctx, x, y, w, h) => {
        ctx.fillStyle = '#E03C31'; ctx.fillRect(x,y,w,h/3);
        ctx.fillStyle = '#002395'; ctx.fillRect(x,y+h*2/3,w,h/3);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x,y+h/3,w,h/3);
        ctx.fillStyle = '#007A4D';
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+w/3, y+h/2); ctx.lineTo(x,y+h); ctx.closePath(); ctx.fill();
    },
    EG: (ctx, x, y, w, h) => {
        const third = Math.round(h/3);
        ctx.fillStyle = '#CE1126'; ctx.fillRect(x,y,w,third);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x,y+third,w,third);
        ctx.fillStyle = '#000000'; ctx.fillRect(x,y+2*third,w,h-2*third);
        ctx.fillStyle = '#C09A33'; ctx.fillRect(x+w*0.45,y+h*0.4,w*0.1,h*0.2);
    },
    PK: (ctx, x, y, w, h) => {
        ctx.fillStyle = '#006600'; ctx.fillRect(x,y,w,h);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x,y,w/4,h);
        const cx = x + w * 0.6;
        const cy = y + h / 2;
        const r1 = h * 0.2;
        ctx.beginPath(); ctx.arc(cx, cy, r1, -Math.PI*0.4, Math.PI*0.4); ctx.lineTo(cx,cy); ctx.closePath(); ctx.fill();
    },
    BD: (ctx, x, y, w, h) => {
        ctx.fillStyle = '#006A4E'; ctx.fillRect(x,y,w,h);
        ctx.fillStyle = '#F42A41'; ctx.beginPath(); ctx.arc(x+w*0.45, y+h/2, h*0.25, 0, Math.PI*2); ctx.fill();
    },
    VN: (ctx, x, y, w, h) => {
        ctx.fillStyle = '#DA251D'; ctx.fillRect(x,y,w,h);
        ctx.fillStyle = '#FFFF00';
        const starX = x + w/2, starY = y + h/2, starR = h * 0.2;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            ctx.lineTo(starX + starR * Math.cos(i * 2 * Math.PI / 5 - Math.PI / 2), starY + starR * Math.sin(i * 2 * Math.PI / 5 - Math.PI / 2));
            ctx.lineTo(starX + starR/2 * Math.cos((i * 2 + 1) * Math.PI / 5 - Math.PI / 2), starY + starR/2 * Math.sin((i * 2 + 1) * Math.PI / 5 - Math.PI / 2));
        }
        ctx.closePath();
        ctx.fill();
    },
    PH: (ctx, x, y, w, h) => {
        const half = Math.round(h/2);
        ctx.fillStyle = '#0038A8'; ctx.fillRect(x,y,w,half);
        ctx.fillStyle = '#CE1126'; ctx.fillRect(x,y+half,w,h-half);
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+w/3, y+h/2); ctx.lineTo(x,y+h); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#FCD116'; ctx.beginPath(); ctx.arc(x+w*0.1, y+h/2, h*0.1, 0, Math.PI*2); ctx.fill();
    },
    GR: (ctx, x, y, w, h) => {
        for(let i=0; i<9; i++) {
            ctx.fillStyle = i%2==0 ? '#0D5EAF' : '#FFFFFF';
            ctx.fillRect(x, y + i*h/9, w, h/9);
        }
        ctx.fillStyle = '#0D5EAF'; ctx.fillRect(x,y,w*0.4,h*0.55);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x, y+h*0.22, w*0.4, h*0.11);
        ctx.fillRect(x+w*0.15, y, w*0.1, h*0.55);
    },
    TH: (ctx, x, y, w, h) => {
        const s = h/6;
        ctx.fillStyle = '#A51931'; ctx.fillRect(x,y,w,s);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x,y+s,w,s);
        ctx.fillStyle = '#2D2A4A'; ctx.fillRect(x,y+2*s,w,2*s);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x,y+4*s,w,s);
        ctx.fillStyle = '#A51931'; ctx.fillRect(x,y+5*s,w,h-5*s);
    },
    CL: (ctx, x, y, w, h) => {
        const half = Math.round(h/2);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x,y,w,half);
        ctx.fillStyle = '#DA291C'; ctx.fillRect(x,y+half,w,h-half);
        ctx.fillStyle = '#0032A0'; ctx.fillRect(x,y,w/3,half);
        ctx.fillStyle = '#FFFFFF';
        const starX = x + w/6, starY = y + half/2, starR = h * 0.1;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            ctx.lineTo(starX + starR * Math.cos(i * 2 * Math.PI / 5 - Math.PI / 2), starY + starR * Math.sin(i * 2 * Math.PI / 5 - Math.PI / 2));
            ctx.lineTo(starX + starR/2 * Math.cos((i * 2 + 1) * Math.PI / 5 - Math.PI / 2), starY + starR/2 * Math.sin((i * 2 + 1) * Math.PI / 5 - Math.PI / 2));
        }
        ctx.closePath();
        ctx.fill();
    },
    PE: (ctx, x, y, w, h) => {
        const third = Math.round(w/3);
        ctx.fillStyle = '#D91023'; ctx.fillRect(x,y,third,h);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x+third,y,third,h);
        ctx.fillStyle = '#D91023'; ctx.fillRect(x+2*third,y,w-2*third,h);
    },
    CO: (ctx, x, y, w, h) => {
        const half = Math.round(h/2);
        const quarter = Math.round(h/4);
        ctx.fillStyle = '#FCD116'; ctx.fillRect(x,y,w,half);
        ctx.fillStyle = '#003893'; ctx.fillRect(x,y+half,w,quarter);
        ctx.fillStyle = '#CE1126'; ctx.fillRect(x,y+half+quarter,w,h-(half+quarter));
    },
    IR: (ctx, x, y, w, h) => {
        const third = Math.round(h/3);
        ctx.fillStyle = '#239F40'; ctx.fillRect(x,y,w,third);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x,y+third,w,third);
        ctx.fillStyle = '#DA0000'; ctx.fillRect(x,y+2*third,w,h-2*third);
        ctx.fillStyle = '#DA0000'; ctx.fillRect(x+w*0.45,y+h*0.45,w*0.1,h*0.1);
    },
    IQ: (ctx, x, y, w, h) => {
        const third = Math.round(h/3);
        ctx.fillStyle = '#CE1126'; ctx.fillRect(x,y,w,third);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x,y+third,w,third);
        ctx.fillStyle = '#000000'; ctx.fillRect(x,y+2*third,w,h-2*third);
        ctx.fillStyle = '#007A3D'; ctx.fillRect(x+w*0.2, y+h*0.4, w*0.6, h*0.2);
    },
    UA: (ctx, x, y, w, h) => {
        const half = Math.round(h/2);
        ctx.fillStyle = '#005BBB'; ctx.fillRect(x,y,w,half);
        ctx.fillStyle = '#FFD500'; ctx.fillRect(x,y+half,w,h-half);
    },
    CZ: (ctx, x, y, w, h) => {
        const half = Math.round(h/2);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x,y,w,half);
        ctx.fillStyle = '#D7141A'; ctx.fillRect(x,y+half,w,h-half);
        ctx.fillStyle = '#11457E';
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+w/2, y+h/2); ctx.lineTo(x,y+h); ctx.closePath(); ctx.fill();
    },
    HU: (ctx, x, y, w, h) => {
        const third = Math.round(h/3);
        ctx.fillStyle = '#CD2A3E'; ctx.fillRect(x,y,w,third);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x,y+third,w,third);
        ctx.fillStyle = '#436F4D'; ctx.fillRect(x,y+2*third,w,h-2*third);
    },
    RO: (ctx, x, y, w, h) => {
        const third = Math.round(w/3);
        ctx.fillStyle = '#002B7F'; ctx.fillRect(x,y,third,h);
        ctx.fillStyle = '#FCD116'; ctx.fillRect(x+third,y,third,h);
        ctx.fillStyle = '#CE1126'; ctx.fillRect(x+2*third,y,w-2*third,h);
    },
    PT: (ctx, x, y, w, h) => {
        ctx.fillStyle = '#006600'; ctx.fillRect(x,y,w*0.4,h);
        ctx.fillStyle = '#FF0000'; ctx.fillRect(x+w*0.4,y,w*0.6,h);
        ctx.fillStyle = '#FFE500'; ctx.beginPath(); ctx.arc(x+w*0.4,y+h/2,h*0.2,0,Math.PI*2); ctx.fill();
    },
    IE: (ctx, x, y, w, h) => {
        const third = Math.round(w/3);
        ctx.fillStyle = '#169B62'; ctx.fillRect(x,y,third,h);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x+third,y,third,h);
        ctx.fillStyle = '#FF883E'; ctx.fillRect(x+2*third,y,w-2*third,h);
    },
    NZ: (ctx, x, y, w, h) => {
        ctx.fillStyle = '#012169'; ctx.fillRect(x,y,w,h);
        flagRenderers.GB(ctx, x,y,w/2,h/2);
        ctx.fillStyle = '#CC142B';
        const drawStar = (cx:number, cy:number, r:number) => { ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill(); };
        drawStar(x+w*0.75, y+h*0.25, h*0.06);
        drawStar(x+w*0.75, y+h*0.75, h*0.06);
    },
    SG: (ctx, x, y, w, h) => {
        const half = Math.round(h/2);
        ctx.fillStyle = '#ED2939'; ctx.fillRect(x,y,w,half);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x,y+half,w,h-half);
        ctx.fillStyle = '#FFFFFF';
        const cx = x+w*0.2, cy=y+h*0.25, r1=h*0.15;
        ctx.beginPath(); ctx.arc(cx,cy,r1,-Math.PI*0.4,Math.PI*0.4); ctx.lineTo(cx,cy); ctx.closePath(); ctx.fill();
    },
    DK: (ctx, x, y, w, h) => {
        ctx.fillStyle = '#C8102E'; ctx.fillRect(x,y,w,h);
        ctx.fillStyle = '#FFFFFF';
        const crossW = w * 0.12;
        const crossH = h * 0.20;
        ctx.fillRect(x, y + h/2 - crossH/2, w, crossH);
        ctx.fillRect(x + w*0.3, y, crossW, h);
    },
    NO: (ctx, x, y, w, h) => {
        ctx.fillStyle = '#EF2B2D'; ctx.fillRect(x,y,w,h);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x, y + h*0.4, w, h*0.2);
        ctx.fillRect(x + w*0.3, y, w*0.15, h);
        ctx.fillStyle = '#002868';
        ctx.fillRect(x, y + h*0.45, w, h*0.1);
        ctx.fillRect(x + w*0.325, y, w*0.1, h);
    },
    AT: (ctx, x, y, w, h) => {
        const third = Math.round(h/3);
        ctx.fillStyle = '#ED2939'; ctx.fillRect(x,y,w,third);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x,y+third,w,third);
        ctx.fillStyle = '#ED2939'; ctx.fillRect(x,y+2*third,w,h-2*third);
    },
    FI: (ctx, x, y, w, h) => {
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x,y,w,h);
        ctx.fillStyle = '#003580';
        const crossW = w * 0.18;
        const crossH = h * 0.3;
        ctx.fillRect(x, y + h/2 - crossH/2, w, crossH);
        ctx.fillRect(x + w*0.3, y, crossW, h);
    },
};

const drawTank = (ctx: CanvasRenderingContext2D, tank: Tank, target: GameEntity | null) => {
    const { x, y, width, height, design, health, maxHealth, country, isInvincible, damageFlashTimer, spawnAnimProgress, isAlly, isBoss, variant, motionBlurTrail, isStunned, isAdrenalineActive, healingAuraTimer } = tank;
    const { base, turret, shadow, highlight, track } = design;
    const scale = isBoss ? 1.8 : (variant === 'swarmer' ? 0.6 : 1);

    ctx.save();

    const isSpawning = spawnAnimProgress < 1;
    const animScale = isSpawning ? 0.1 + spawnAnimProgress * 0.9 : 1;
    
    ctx.translate(x + (width*scale) / 2, y + (height*scale) / 2);

    // Adrenaline Rush Aura
    if (isAdrenalineActive) {
        const time = Date.now();
        const auraRadius = (width * scale / 2) + 10 + Math.sin(time / 100) * 3;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, auraRadius);
        gradient.addColorStop(0, 'rgba(255, 100, 0, 0.8)');
        gradient.addColorStop(0.7, 'rgba(255, 140, 0, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 200, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
        ctx.fill();
    }
    
     // Healing Aura
    if (healingAuraTimer && healingAuraTimer > 0) {
        const time = Date.now();
        const auraRadius = 40 + Math.sin(time / 150) * 5;
        const alpha = Math.min(1, healingAuraTimer / 60) * 0.5;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, auraRadius);
        gradient.addColorStop(0, 'rgba(0, 255, 100, 0)');
        gradient.addColorStop(0.7, `rgba(0, 255, 100, ${alpha})`);
        gradient.addColorStop(1, 'rgba(0, 255, 100, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.scale(animScale, animScale);
    if(isSpawning) ctx.globalAlpha = spawnAnimProgress;
    
    let angle = 0;
    if (target) {
        const targetX = target.x + (target.width || 0) / 2;
        const targetY = target.y + (target.height || 0) / 2;
        angle = Math.atan2(targetY - (y + (height*scale) / 2), targetX - (x + (width*scale) / 2));
    }
    
    // Motion Blur Trail for Overdrive
    if (motionBlurTrail && motionBlurTrail.length > 0) {
        motionBlurTrail.forEach(trail => {
            ctx.globalAlpha = trail.life * 0.3;
            ctx.fillStyle = base;
            ctx.translate(trail.x - (x + width*scale/2), trail.y - (y + height*scale/2));
            ctx.fillRect(-width/2*scale, -height/2*scale, width*scale, height*scale);
            ctx.translate(-(trail.x - (x + width*scale/2)), -(trail.y - (y + height*scale/2)));
        });
        ctx.globalAlpha = isSpawning ? spawnAnimProgress : 1.0;
    }

    // Tracks
    const treadWidth = width * scale;
    const treadHeight = height * scale + 8 * scale;
    ctx.fillStyle = track;
    ctx.fillRect(-treadWidth / 2, -treadHeight / 2, treadWidth, treadHeight);
    
    // Body
    ctx.fillStyle = shadow;
    ctx.fillRect(-width/2*scale + 2, -height/2*scale + 2, width*scale, height*scale);
    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.moveTo(-width/2*scale, -height/2*scale);
    ctx.lineTo(width/2*scale - 5, -height/2*scale);
    ctx.lineTo(width/2*scale, -height/2*scale + 5);
    ctx.lineTo(width/2*scale, height/2*scale);
    ctx.lineTo(-width/2*scale, height/2*scale);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = highlight;
    ctx.fillRect(-width/2*scale, -height/2*scale, width*scale, 4*scale);

    // Antenna detail
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(-width/2 * scale * 0.8, -height/2 * scale * 0.8);
    ctx.lineTo(-width/2 * scale * 1.2, -height/2 * scale * 1.2);
    ctx.stroke();

    // Ally Indicator
    if(isAlly) {
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 4;
        ctx.strokeRect(-width/2*scale - 4, -height/2*scale - 4, width*scale + 8, height*scale + 8);
    }

    // Turret and Barrel
    ctx.save();
    ctx.rotate(angle);
    const turretWidth = width * (variant === 'artillery' ? 0.8 : 0.6) * scale;
    const turretHeight = height * (variant === 'artillery' ? 1.0 : 0.8) * scale;
    
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.arc(0, 0, turretHeight/2 + 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isAdrenalineActive ? '#ff8c00' : turret;
    ctx.beginPath();
    ctx.arc(0, 0, turretHeight/2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#4a4a4a';
    const barrelLength = width * (variant === 'artillery' ? 0.5 : (variant === 'spawner' ? 0 : (variant === 'sniper' ? 1.2 : 0.7))) * scale;
    const barrelWidth = (variant === 'artillery' ? 12 : (variant === 'sniper' ? 4 : 6)) * scale;


    if(isBoss) {
        // Twin barrels for boss
        ctx.fillRect(turretWidth/2 - (5*scale), -(8*scale), barrelLength, 6*scale);
        ctx.fillRect(turretWidth/2 - (5*scale), (2*scale), barrelLength, 6*scale);
    } else if (variant !== 'spawner') {
        ctx.fillRect(0, -barrelWidth/2, barrelLength, barrelWidth);
        ctx.fillStyle = '#6a6a6a';
        ctx.fillRect(0, -barrelWidth/2, barrelLength, barrelWidth/2);
    }

    if (variant === 'medic') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-5 * scale, -12 * scale, 10 * scale, 24 * scale);
        ctx.fillRect(-12 * scale, -5 * scale, 24 * scale, 10 * scale);
    }

    ctx.restore(); // Turret rotation
    
    // Flag
    if(!isBoss && variant !== 'swarmer' && variant !== 'spawner'){
        const flagRenderer = flagRenderers[country.code];
        if (flagRenderer) {
            flagRenderer(ctx, -width/2*scale + 5, -height/2*scale + 5, 15, 9);
        }
    }
    
    // Damage Flash
    if (damageFlashTimer && damageFlashTimer > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(-width*scale/2, -height*scale/2, width*scale, height*scale);
    }

    // Stun effect
    if (isStunned) {
        ctx.fillStyle = 'rgba(0, 180, 255, 0.5)';
        ctx.font = `${20 * scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('⚡', 0, -height*scale*0.7);
    }

    ctx.restore(); // Main transform

    // Health Bar
    if (health < maxHealth && !isBoss) {
        const barY = y - 10;
        ctx.fillStyle = '#333';
        ctx.fillRect(x, barY, width*scale, 5);
        ctx.fillStyle = isAlly ? '#3498db' : health > maxHealth * 0.5 ? '#00FF00' : health > maxHealth * 0.25 ? '#FFFF00' : '#FF0000';
        ctx.fillRect(x, barY, width*scale * (health / maxHealth), 5);
    }

    // Shield effect
    if (isInvincible) {
        ctx.strokeStyle = '#00BFFF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x + width*scale / 2, y + height*scale / 2, width*scale/2 + 5, 0, Math.PI * 2);
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 100) * 0.2;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }
};

const drawShellCasing = (ctx: CanvasRenderingContext2D, shell: Particle) => {
    ctx.save();
    ctx.translate(shell.x, shell.y);
    ctx.rotate(shell.rotation || 0);
    ctx.fillStyle = `rgba(218, 165, 32, ${shell.life || 1})`;
    ctx.fillRect(-3, -1, 6, 2);
    ctx.restore();
};

const drawBullet = (ctx: CanvasRenderingContext2D, bullet: Bullet) => {
    ctx.save();
    
    if (bullet.isHealing) {
        const time = Date.now();
        const radius = bullet.width / 2 + Math.sin(time / 50) * 2;
        const gradient = ctx.createRadialGradient(bullet.x, bullet.y, 0, bullet.x, bullet.y, radius);
        gradient.addColorStop(0, 'rgba(200, 255, 200, 1)');
        gradient.addColorStop(0.7, 'rgba(0, 255, 0, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, radius, 0, Math.PI * 2);
        ctx.fill();
    } else {
        const trailStart = bullet.trail?.[0] || {x: bullet.x, y: bullet.y};
        const gradient = ctx.createLinearGradient(trailStart.x, trailStart.y, bullet.x, bullet.y);
        gradient.addColorStop(0, `rgba(${parseInt(bullet.color.slice(1,3), 16)}, ${parseInt(bullet.color.slice(3,5), 16)}, ${parseInt(bullet.color.slice(5,7), 16)}, 0)`);
        gradient.addColorStop(0.8, bullet.color);
        gradient.addColorStop(1, '#FFFFFF');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = bullet.width / 1.5;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(trailStart.x, trailStart.y);
        ctx.lineTo(bullet.x, bullet.y);
        ctx.stroke();
    }
    
    ctx.restore();
};

const drawExplosion = (ctx: CanvasRenderingContext2D, explosion: Explosion) => {
    const lifePercent = explosion.life / explosion.duration;

    // Shockwave
    if (explosion.shockwave) {
        ctx.strokeStyle = `rgba(255, 220, 180, ${explosion.shockwave.alpha})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.shockwave.radius, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Central flash
    if (lifePercent > 0.6 && !explosion.isRockDebris) {
        const flashAlpha = (lifePercent - 0.6) / 0.4;
        const gradient = ctx.createRadialGradient(explosion.x, explosion.y, 0, explosion.x, explosion.y, explosion.width * 0.5 * (1-lifePercent));
        gradient.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`);
        gradient.addColorStop(0.5, `rgba(255, 220, 100, ${flashAlpha * 0.8})`);
        gradient.addColorStop(1, `rgba(255, 100, 0, 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(explosion.x - explosion.width, explosion.y - explosion.width, explosion.width * 2, explosion.width * 2);
    }

    // Particles
    explosion.particles.forEach(p => {
        ctx.globalAlpha = lifePercent;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        if (explosion.isRockDebris) {
            ctx.rect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
        } else {
            ctx.arc(p.x, p.y, p.size * lifePercent, 0, Math.PI * 2);
        }
        ctx.fill();
    });

    // Smoke
    explosion.smokeParticles.forEach(p => {
        const smokeLife = p.life / p.maxLife;
        const color = explosion.isRockDebris ? '120, 120, 110' : '80, 80, 80';
        ctx.fillStyle = `rgba(${color}, ${0.4 * smokeLife * lifePercent})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + (1 - smokeLife)), 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.globalAlpha = 1;
};

const drawSpark = (ctx: CanvasRenderingContext2D, spark: Particle) => {
    ctx.strokeStyle = spark.color;
    ctx.lineWidth = spark.size;
    ctx.beginPath();
    ctx.moveTo(spark.x - spark.vx, spark.y - spark.vy);
    ctx.lineTo(spark.x, spark.y);
    ctx.stroke();
};

const drawPowerUp = (ctx: CanvasRenderingContext2D, powerUp: PowerUp) => {
    ctx.save();
    ctx.translate(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2);
    ctx.rotate(Date.now() / 200);
    const text = powerUp.powerUpType === 'rapid_fire' ? '🔥' : '🌌';
    const color = powerUp.powerUpType === 'rapid_fire' ? '#FFD700' : '#8A2BE2';
    ctx.fillStyle = color;
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0);
    ctx.restore();
};

const drawMuzzleFlash = (ctx: CanvasRenderingContext2D, flash: MuzzleFlash) => {
    const lifePercent = flash.life / flash.duration;
    const size = (1 - lifePercent) * 40;
    ctx.save();
    ctx.translate(flash.x, flash.y);
    ctx.rotate(flash.angle + (Math.random() - 0.5) * 0.2);
    ctx.fillStyle = `rgba(255, 220, 100, ${1 - lifePercent})`;
    for (let i = 0; i < 5; i++) {
        ctx.fillRect(0, -size / 10, size, size / 5);
        ctx.rotate(Math.PI * 2 / 5);
    }
    ctx.restore();
};

const drawSmokeParticle = (ctx: CanvasRenderingContext2D, particle: SmokeParticle) => {
    const lifePercent = particle.life / particle.maxLife;
    ctx.fillStyle = `rgba(100, 100, 100, ${0.5 - lifePercent * 0.5})`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * (1 + (1 - lifePercent)), 0, Math.PI * 2);
    ctx.fill();
};

const drawExperienceOrb = (ctx: CanvasRenderingContext2D, orb: ExperienceOrb) => {
    ctx.fillStyle = '#00FFFF';
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.width / 2, 0, Math.PI * 2);
    ctx.fill();
};

const drawKamikazeDrone = (ctx: CanvasRenderingContext2D, drone: KamikazeDrone) => {
    ctx.fillStyle = '#FF4500';
    ctx.fillRect(drone.x, drone.y, drone.width, drone.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(drone.x + 4, drone.y + 4, drone.width-8, drone.height-8);
};

const drawMine = (ctx: CanvasRenderingContext2D, mine: Mine) => {
    const color = mine.isArmed ? (Math.floor(Date.now() / 250) % 2 === 0 ? '#FFD700' : '#8B0000') : '#555';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(mine.x + mine.width/2, mine.y + mine.height/2, mine.width/2, 0, Math.PI * 2);
    ctx.fill();
};

const drawTireTrack = (ctx: CanvasRenderingContext2D, track: TireTrackPoint) => {
    ctx.globalAlpha = track.life * 0.3;
    ctx.fillStyle = `rgba(0, 0, 0, ${track.life * 0.3})`;
    ctx.fillRect(track.x - 2, track.y - 2, 4, 4);
    ctx.globalAlpha = 1.0;
};

const drawFloatingText = (ctx: CanvasRenderingContext2D, text: FloatingText) => {
    const alpha = text.life / 60; // 60 is max life
    ctx.globalAlpha = alpha;
    ctx.fillStyle = text.color;
    ctx.font = 'bold 18px "Chivo Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text.text, text.x + 15, text.y);
    ctx.globalAlpha = 1.0;
};

const drawWeather = (ctx: CanvasRenderingContext2D, weather: WeatherState, width: number, height: number) => {
    if (weather.type === 'none') return;

    ctx.save();
    if (weather.type === 'rain') {
        ctx.strokeStyle = 'rgba(174,194,224,0.5)';
        ctx.lineWidth = 1;
        weather.particles.forEach(p => {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + p.vx, p.y + p.vy);
            ctx.stroke();
        });
    } else if (weather.type === 'snow') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        weather.particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    } else if (weather.type === 'fog') {
        const gradient = ctx.createRadialGradient(width / 2, height / 2, 100, width / 2, height / 2, width * 0.7);
        gradient.addColorStop(0, `rgba(200, 200, 210, 0)`);
        gradient.addColorStop(1, `rgba(200, 200, 210, ${weather.intensity * 1.2})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
};

const drawLowHealthVignette = (ctx: CanvasRenderingContext2D, player: Tank | null, width: number, height: number) => {
    if (!player || player.health > player.maxHealth * 0.25) return;
    
    const healthPercent = player.health / player.maxHealth;
    const alpha = (1 - healthPercent / 0.25) * (0.6 + Math.sin(Date.now() / 150) * 0.4);
    const gradient = ctx.createRadialGradient(width / 2, height / 2, width * 0.6, width / 2, height / 2, width);
    gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(200, 0, 0, ${alpha})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
};

const drawStarfield = (ctx: CanvasRenderingContext2D, stars: Particle[], width: number, height: number) => {
    ctx.fillStyle = '#01040f'; // Deep space blue
    ctx.fillRect(0, 0, width, height);
    
    // Nebula
    const grad = ctx.createRadialGradient(width*0.7, height*0.3, 50, width*0.7, height*0.3, Math.min(width, height) * 0.6);
    grad.addColorStop(0, 'rgba(60, 20, 80, 0.6)');
    grad.addColorStop(1, 'rgba(60, 20, 80, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,width,height);
    
    stars.forEach(star => {
        if(star.isDebris) {
            ctx.fillStyle = `rgba(50, 50, 60, ${star.alpha || 1})`;
        } else {
            ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha || 1})`;
        }
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

const drawCityscapeBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = '#4a4a4a'; // Dark asphalt color
    ctx.fillRect(0, 0, width, height);
    
    // Draw road lines
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
    ctx.lineWidth = 10;
    ctx.setLineDash([40, 60]);
    
    const numLanes = 5;
    for (let i = 1; i < numLanes; i++) {
        const x = (width / numLanes) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    ctx.setLineDash([]);
};

const drawBuilding = (ctx: CanvasRenderingContext2D, building: Building) => {
    // Main structure
    ctx.fillStyle = '#333';
    ctx.fillRect(building.x, building.y, building.width, building.height);
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.strokeRect(building.x, building.y, building.width, building.height);

    // Windows
    ctx.fillStyle = 'rgba(100, 100, 150, 0.4)';
    const windowSize = 10;
    const gap = 15;
    for (let y = building.y + 10; y < building.y + building.height - 10; y += gap) {
        for (let x = building.x + 10; x < building.x + building.width - 10; x += gap) {
            if (Math.random() > 0.2) { // Some windows are dark
                 ctx.fillRect(x, y, windowSize, windowSize);
            }
        }
    }
    
    // Damage
    if (building.damageState > 0) {
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (building.damageState >= 1) {
            ctx.moveTo(building.x + 5, building.y + 5);
            ctx.lineTo(building.x + building.width - 5, building.y + building.height - 5);
        }
        if (building.damageState >= 2) {
            ctx.moveTo(building.x + building.width - 5, building.y + 5);
            ctx.lineTo(building.x + 5, building.y + building.height - 5);
        }
        ctx.stroke();
    }
};

const drawRubble = (ctx: CanvasRenderingContext2D, rubble: Rubble) => {
    const alpha = rubble.life / rubble.maxLife;
    ctx.fillStyle = `rgba(50, 50, 50, ${alpha * 0.8})`;
    // Draw a few overlapping rects to simulate a pile
    ctx.fillRect(rubble.x, rubble.y, rubble.width, rubble.height);
    ctx.fillStyle = `rgba(30, 30, 30, ${alpha * 0.8})`;
    ctx.fillRect(rubble.x + 10, rubble.y + 10, rubble.width - 20, rubble.height - 20);
};


const drawArtilleryTarget = (ctx: CanvasRenderingContext2D, target: ArtilleryTarget) => {
    const progress = 1 - target.timer / target.maxTimer;
    const time = Date.now();
    ctx.save();
    ctx.translate(target.x, target.y);

    if (target.state === 'sweeping') {
        const sweepAngle = Math.sin(time / 150) * 0.5; // Sweeps back and forth
        const alpha = 0.5 + Math.sin(time / 100) * 0.2;
        ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.lineTo(Math.cos(sweepAngle - 0.2) * target.radius, Math.sin(sweepAngle - 0.2) * target.radius);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.lineTo(Math.cos(sweepAngle + 0.2) * target.radius, Math.sin(sweepAngle + 0.2) * target.radius);
        ctx.stroke();
    } else { // 'locking'
        const rotation = (time / 200) * Math.PI * 2;
        const alpha = 0.8;
        const radius = target.radius * (1 - progress * 0.5); // Circle shrinks
        ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
        ctx.lineWidth = 4;
        
        ctx.beginPath();
        ctx.arc(0, 0, radius, rotation, rotation + Math.PI * 1.5);
        ctx.stroke();
    }

    ctx.restore();
}

const drawSolarFlareWarning = (ctx: CanvasRenderingContext2D, flare: SolarFlareWarning) => {
    const progress = flare.timer / flare.maxTimer;
    const alpha = (1 - progress) * (0.6 + Math.sin(Date.now() / 100) * 0.2);
    
    const gradient = ctx.createRadialGradient(flare.x, flare.y, 0, flare.x, flare.y, flare.radius);
    gradient.addColorStop(0, `rgba(255, 100, 0, ${alpha * 0.5})`);
    gradient.addColorStop(0.8, `rgba(255, 120, 0, ${alpha * 0.2})`);
    gradient.addColorStop(1, `rgba(255, 150, 0, 0)`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(flare.x, flare.y, flare.radius, 0, Math.PI * 2);
    ctx.fill();
}

const drawBlackHole = (ctx: CanvasRenderingContext2D, hole: BlackHole) => {
    const lifePercent = hole.life / hole.maxLife;
    const pullRadius = hole.pullRadius * lifePercent;

    ctx.save();
    ctx.translate(hole.x, hole.y);

    // Accretion disk
    const gradient = ctx.createRadialGradient(0, 0, 10, 0, 0, pullRadius);
    gradient.addColorStop(0, 'rgba(20, 0, 30, 0.9)');
    gradient.addColorStop(0.5, 'rgba(120, 50, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(150, 80, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(-pullRadius, -pullRadius, pullRadius * 2, pullRadius * 2);

    // Swirling particles
    ctx.rotate(hole.rotation);
    for (let i = 0; i < 20; i++) {
        const dist = (i / 20) * pullRadius;
        const angle = (i * 1.375 + hole.rotation * 2) % (Math.PI*2);
        ctx.fillStyle = `rgba(255, 255, 255, ${lifePercent * (1 - i/20)})`;
        ctx.fillRect(Math.cos(angle) * dist, Math.sin(angle) * dist, 2, 2);
    }
    
    ctx.restore();
}

const drawMartyrsBeacon = (ctx: CanvasRenderingContext2D, beacon: MartyrsBeacon) => {
    const progress = beacon.timer / beacon.maxTimer;
    const time = Date.now();
    
    // Core pulsating light
    const coreRadius = 10 + progress * 20;
    const coreAlpha = 0.5 + Math.sin(time / 100) * 0.3;
    const coreGradient = ctx.createRadialGradient(beacon.x, beacon.y, 0, beacon.x, beacon.y, coreRadius);
    coreGradient.addColorStop(0, `rgba(255, 100, 100, ${coreAlpha})`);
    coreGradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
    ctx.fillStyle = coreGradient;
    ctx.fillRect(beacon.x - coreRadius, beacon.y - coreRadius, coreRadius * 2, coreRadius * 2);

    // Expanding shockwave rings
    for(let i=0; i<3; i++) {
        const ringProgress = (progress + i * 0.33) % 1;
        const ringRadius = ringProgress * 150;
        const ringAlpha = (1 - ringProgress) * 0.8;
        ctx.strokeStyle = `rgba(255, 0, 0, ${ringAlpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(beacon.x, beacon.y, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
    }
}

const drawVignette = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gradient = ctx.createRadialGradient(width/2, height/2, height/2, width/2, height/2, width/2 + 150);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
}

const drawScorchMark = (ctx: CanvasRenderingContext2D, mark: ScorchMark) => {
    const alpha = (mark.life / mark.maxLife) * 0.4;
    ctx.fillStyle = `rgba(20, 20, 20, ${alpha})`;
    ctx.beginPath();
    ctx.arc(mark.x, mark.y, mark.radius, 0, Math.PI * 2);
    ctx.fill();
};

const drawEMPBlast = (ctx: CanvasRenderingContext2D, blast: EMPBlast) => {
    const lifePercent = 1 - (blast.life / blast.maxLife);
    const radius = blast.radius;
    const alpha = Math.sin(lifePercent * Math.PI); // Fades in and out

    const gradient = ctx.createRadialGradient(blast.x, blast.y, radius * 0.8, blast.x, blast.y, radius);
    gradient.addColorStop(0, `rgba(0, 180, 255, 0)`);
    gradient.addColorStop(0.5, `rgba(0, 180, 255, ${alpha * 0.5})`);
    gradient.addColorStop(1, `rgba(100, 200, 255, ${alpha})`);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(blast.x, blast.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Add some electrical arcs
    ctx.strokeStyle = `rgba(200, 220, 255, ${alpha * 0.8})`;
    ctx.lineWidth = 2;
    for(let i=0; i<5; i++) {
        ctx.beginPath();
        const startAngle = Math.random() * Math.PI * 2;
        const endAngle = startAngle + (Math.random() - 0.5);
        ctx.arc(blast.x, blast.y, radius * (0.8 + Math.random() * 0.2), startAngle, endAngle);
        ctx.stroke();
    }
}

const drawAsteroid = (ctx: CanvasRenderingContext2D, asteroid: Asteroid) => {
    ctx.save();
    ctx.translate(asteroid.x, asteroid.y);

    // Body
    ctx.fillStyle = '#696969';
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(asteroid.shape[0].x, asteroid.shape[0].y);
    for(let i = 1; i < asteroid.shape.length; i++) {
        ctx.lineTo(asteroid.shape[i].x, asteroid.shape[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Craters and highlights
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.arc(asteroid.width * 0.1, asteroid.height * 0.1, asteroid.width * 0.15, 0, Math.PI*2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.moveTo(asteroid.shape[0].x, asteroid.shape[0].y);
    ctx.lineTo(asteroid.shape[1].x, asteroid.shape[1].y);
    ctx.lineTo(asteroid.shape[2].x, asteroid.shape[2].y);
    ctx.closePath();
    ctx.fill();

    // Damage cracks
    const damagePercent = 1 - (asteroid.health / asteroid.maxHealth);
    if (damagePercent > 0.3) {
        ctx.strokeStyle = `rgba(0,0,0,${(damagePercent - 0.3) * 2})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(asteroid.shape[0].x * 0.8, asteroid.shape[0].y * 0.8);
        ctx.lineTo(asteroid.shape[4].x * 0.7, asteroid.shape[4].y * 0.7);
        ctx.stroke();
    }
     if (damagePercent > 0.6) {
        ctx.beginPath();
        ctx.moveTo(asteroid.shape[2].x * 0.9, asteroid.shape[2].y * 0.9);
        ctx.lineTo(asteroid.shape[6].x * 0.6, asteroid.shape[6].y * 0.6);
        ctx.stroke();
    }


    ctx.restore();
};

const drawSpaceDebris = (ctx: CanvasRenderingContext2D, debris: SpaceDebris) => {
    ctx.save();
    ctx.translate(debris.x, debris.y);

    // Main body
    ctx.fillStyle = '#4B4E53';
    ctx.strokeStyle = '#2A2C30';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(debris.shape[0].x, debris.shape[0].y);
    for(let i = 1; i < debris.shape.length; i++) {
        ctx.lineTo(debris.shape[i].x, debris.shape[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Highlights and details
    ctx.fillStyle = 'rgba(200, 200, 210, 0.2)';
    ctx.beginPath();
    ctx.moveTo(debris.shape[0].x, debris.shape[0].y);
    ctx.lineTo(debris.shape[1].x, debris.shape[1].y);
    ctx.lineTo(debris.width * 0.1, debris.height * 0.1);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
};

const drawFrame = (ctx: CanvasRenderingContext2D, gameState: GameState, width: number, height: number) => {
    ctx.save();
        
    const { magnitude, duration } = gameState.screenShake;
    if (duration > 0) {
        const dx = (Math.random() - 0.5) * magnitude;
        const dy = (Math.random() - 0.5) * magnitude;
        ctx.translate(dx, dy);
    }

    if (gameState.isUrbanMode) {
        drawCityscapeBackground(ctx, width, height);
    } else {
        drawStarfield(ctx, gameState.starfield, width, height);
    }
    
    gameState.scorchMarks.forEach(mark => drawScorchMark(ctx, mark));
    gameState.tireTracks.forEach(track => drawTireTrack(ctx, track));
    gameState.exhaustParticles.forEach(smoke => drawSmokeParticle(ctx, smoke));
    
    const allEntities: GameEntity[] = [
        ...(gameState.player ? [gameState.player] : []), 
        ...gameState.enemies, 
        ...gameState.allies, 
        ...(gameState.boss ? [gameState.boss] : []),
        ...gameState.drones,
        ...gameState.asteroids,
        ...gameState.spaceDebris,
        ...gameState.mines,
        ...gameState.powerUps,
        ...gameState.experienceOrbs,
        ...gameState.buildings,
        ...gameState.rubble,
    ];
    allEntities.sort((a, b) => (a.y + a.height) - (b.y + b.height));

    allEntities.forEach(entity => {
        switch (entity.type) {
            case 'tank': {
                const allTanksAndDrones = [
                    ...(gameState.player ? [gameState.player] : []),
                    ...gameState.enemies,
                    ...gameState.allies,
                    ...(gameState.boss ? [gameState.boss] : []),
                    ...gameState.drones,
                ];
                const target = allTanksAndDrones.find(t => t.id === entity.targetId);
                drawTank(ctx, entity, target || null);
                break;
            }
            case 'kamikaze_drone':
                drawKamikazeDrone(ctx, entity);
                break;
            case 'mine':
                drawMine(ctx, entity);
                break;
            case 'powerup':
                drawPowerUp(ctx, entity);
                break;
            case 'experience_orb':
                drawExperienceOrb(ctx, entity);
                break;
            case 'asteroid':
                drawAsteroid(ctx, entity);
                break;
            case 'space_debris':
                drawSpaceDebris(ctx, entity);
                break;
            case 'building':
                drawBuilding(ctx, entity);
                break;
            case 'rubble':
                drawRubble(ctx, entity);
                break;
        }
    });

    // Drawing things that should be on top of tanks
    gameState.bullets.forEach(b => drawBullet(ctx, b));
    gameState.explosions.forEach(e => drawExplosion(ctx, e));
    gameState.muzzleFlashes.forEach(f => drawMuzzleFlash(ctx, f));
    gameState.smokeParticles.forEach(p => drawSmokeParticle(ctx, p));
    gameState.sparks.forEach(s => drawSpark(ctx, s));
    gameState.shellCasings.forEach(s => drawShellCasing(ctx, s));
    gameState.artilleryTargets.forEach(t => drawArtilleryTarget(ctx, t));
    gameState.solarFlares.forEach(f => drawSolarFlareWarning(ctx, f));
    gameState.blackHoles.forEach(h => drawBlackHole(ctx, h));
    if (gameState.martyrsBeacon) {
        drawMartyrsBeacon(ctx, gameState.martyrsBeacon);
    }
    gameState.empBlasts.forEach(b => drawEMPBlast(ctx, b));
    
    drawWeather(ctx, gameState.weather, width, height);
    if (gameState.lightTone !== '#ffffff') {
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = gameState.lightTone;
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'source-over';
    }

    drawLowHealthVignette(ctx, gameState.player, width, height);
    drawVignette(ctx, width, height);
    
    gameState.floatingTexts.forEach(t => drawFloatingText(ctx, t));
    
    ctx.restore(); // Restore from screen shake
};

export const GameCanvas: React.FC<GameCanvasProps> = ({ gameStateRef, width, height }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) return;
        
        let animationFrameId: number;
        
        const render = () => {
            if (gameStateRef.current) {
                drawFrame(context, gameStateRef.current, width, height);
            }
            animationFrameId = requestAnimationFrame(render);
        };
        
        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [gameStateRef, width, height]);

    return <canvas ref={canvasRef} width={width} height={height} />;
};
