import React, { useRef, useEffect } from 'react';
import type { GameState, Tank, Bullet, Explosion, PowerUp, MuzzleFlash, SmokeParticle, ExperienceOrb, KamikazeDrone, Mine, TireTrackPoint, GameEntity, Particle, FloatingText, WeatherState, ArtilleryTarget, MartyrsBeacon } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';

interface GameCanvasProps {
    gameState: GameState;
}

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
    const { x, y, width, height, design, health, maxHealth, country, isInvincible, damageFlashTimer, spawnAnimProgress, isAlly, isBoss, variant } = tank;
    const { base, turret, shadow, highlight, track } = design;
    const scale = isBoss ? 1.8 : 1;

    ctx.save();

    const isSpawning = spawnAnimProgress < 1;
    const animScale = isSpawning ? 0.5 + spawnAnimProgress * 0.5 : 1;
    
    const rumbleX = (Math.random() - 0.5) * 0.5 * (isBoss ? 2 : 1);
    const rumbleY = (Math.random() - 0.5) * 0.5 * (isBoss ? 2 : 1);
    ctx.translate(x + (width*scale) / 2 + rumbleX, y + (height*scale) / 2 + rumbleY);
    ctx.scale(animScale, animScale);
    if(isSpawning) ctx.globalAlpha = spawnAnimProgress;
    
    let angle = 0;
// FIX: Add a type guard to ensure target has width and height before accessing them. This handles cases like ArtilleryTarget.
    if (target) {
        if ('width' in target && 'height' in target) {
            angle = Math.atan2(target.y + target.height / 2 - (y + (height*scale) / 2), target.x + target.width / 2 - (x + (width*scale) / 2));
        } else {
            angle = Math.atan2(target.y - (y + (height*scale) / 2), target.x - (x + (width*scale) / 2));
        }
    }
    
    // Tracks
    ctx.fillStyle = track;
    ctx.fillRect(-width/2*scale, -height/2*scale - (4*scale), width*scale, height*scale + (8*scale));
    ctx.fillStyle = '#111';
    const numTreads = isBoss ? 10 : 6;
    for (let i = 0; i < numTreads; i++) {
        ctx.fillRect(-width/2*scale + (i * (width*scale/(numTreads-0.5))), -height/2*scale - (4*scale), 2*scale, height*scale + (8*scale));
    }

    // Body
    ctx.fillStyle = shadow;
    ctx.fillRect(-width/2*scale, -height/2*scale, width*scale, height*scale);
    ctx.fillStyle = base;
    ctx.fillRect(-width/2*scale, -height/2*scale, width*scale, height*scale - (2*scale));
    ctx.fillStyle = highlight;
    ctx.fillRect(-width/2*scale + (2*scale), -height/2*scale + (2*scale), width*scale - (4*scale), (2*scale));

    // Ally Indicator
    if(isAlly) {
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 4;
        ctx.strokeRect(-width/2*scale, -height/2*scale, width*scale, height*scale);
    }

    // Turret and Barrel
    ctx.save();
    ctx.rotate(angle);
    const turretWidth = width * (variant === 'artillery' ? 0.8 : 0.6) * scale;
    const turretHeight = height * (variant === 'artillery' ? 1.0 : 0.8) * scale;
    ctx.fillStyle = shadow;
    ctx.fillRect(-turretWidth/2, -turretHeight/2, turretWidth, turretHeight);
    ctx.fillStyle = turret;
    ctx.fillRect(-turretWidth/2, -turretHeight/2, turretWidth, turretHeight - (2*scale));
    
    ctx.fillStyle = '#4a4a4a';
    const barrelLength = width * (variant === 'artillery' ? 0.5 : 0.7) * scale;
    const barrelWidth = (variant === 'artillery' ? 12 : 6) * scale;

    if(isBoss) {
        // Twin barrels for boss
        ctx.fillRect(turretWidth/2 - (5*scale), -(6*scale), barrelLength, 6*scale);
        ctx.fillRect(turretWidth/2 - (5*scale), (1*scale), barrelLength, 6*scale);
    } else {
        ctx.fillRect(turretWidth/2 - (5*scale), -barrelWidth/2, barrelLength, barrelWidth);
        ctx.fillStyle = '#6a6a6a';
        ctx.fillRect(turretWidth/2 - (5*scale), -barrelWidth/2, barrelLength, barrelWidth/2);
    }
    ctx.restore(); // Turret rotation
    
    // Flag
    if(!isBoss){
        const flagRenderer = flagRenderers[country.code];
        if (flagRenderer) {
            flagRenderer(ctx, -width/2*scale + 5, -height/2*scale + 5, 15, 9);
        }
    }
    
    // Damage Flash
    if (damageFlashTimer && damageFlashTimer > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(-width/2*scale, -height/2*scale, width*scale, height*scale);
    }

    ctx.restore(); // Main transform

    // Health Bar - Drawn outside the scaled/transformed context
    if (health < maxHealth && !isBoss) {
        const barY = y - 10;
        ctx.fillStyle = '#333';
        ctx.fillRect(x, barY, width, 5);
        ctx.fillStyle = isAlly ? '#3498db' : health > maxHealth * 0.5 ? '#00FF00' : health > maxHealth * 0.25 ? '#FFFF00' : '#FF0000';
        ctx.fillRect(x, barY, width * (health / maxHealth), 5);
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
    ctx.shadowColor = bullet.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = bullet.color;
    ctx.beginPath();
    ctx.arc(bullet.x + bullet.width/2, bullet.y + bullet.height/2, bullet.width/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Trail
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = bullet.color;
    ctx.fillRect(bullet.x - bullet.vx * 0.5, bullet.y - bullet.vy * 0.5, bullet.width, bullet.height);
    ctx.restore();
};

const drawExplosion = (ctx: CanvasRenderingContext2D, explosion: Explosion) => {
    const lifePercent = explosion.life / explosion.duration;
    
    // Shockwave
    const shockwaveRadius = (1 - lifePercent) * (explosion.width * (explosion.isShrapnel ? 2.5 : 1.5));
    const shockwaveAlpha = lifePercent;
    ctx.strokeStyle = `rgba(255, 255, 220, ${shockwaveAlpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(explosion.x, explosion.y, shockwaveRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Central flash
    if(lifePercent > 0.7) {
        ctx.fillStyle = `rgba(255, 255, 200, ${(1 - lifePercent) / 0.3})`;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, (explosion.duration / 2) * ((1-lifePercent) / 0.3), 0, Math.PI * 2);
        ctx.fill();
    }

    explosion.particles.forEach(p => {
        ctx.globalAlpha = lifePercent;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * lifePercent, 0, Math.PI * 2);
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
    ctx.fillStyle = '#FFD700';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#FFD700';
    const glow = 10 + Math.sin(Date.now() / 150) * 5;
    ctx.shadowBlur = glow;
    ctx.fillText('🔥', 0, 0);
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
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
};

const drawKamikazeDrone = (ctx: CanvasRenderingContext2D, drone: KamikazeDrone) => {
    ctx.fillStyle = '#FF4500';
    ctx.shadowColor = '#FF4500';
    ctx.shadowBlur = 10;
    ctx.fillRect(drone.x, drone.y, drone.width, drone.height);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'white';
    ctx.fillRect(drone.x + 4, drone.y + 4, drone.width-8, drone.height-8);
};

const drawMine = (ctx: CanvasRenderingContext2D, mine: Mine) => {
    const color = mine.isArmed ? (Math.floor(Date.now() / 250) % 2 === 0 ? '#FFD700' : '#8B0000') : '#555';
    ctx.fillStyle = color;
    if(mine.isArmed) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
    }
    ctx.beginPath();
    ctx.arc(mine.x + mine.width/2, mine.y + mine.height/2, mine.width/2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
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
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;
    ctx.fillText(text.text, text.x + 15, text.y);
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
};

const drawWeather = (ctx: CanvasRenderingContext2D, weather: WeatherState) => {
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
        const gradient = ctx.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 100, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.7);
        gradient.addColorStop(0, `rgba(200, 200, 210, 0)`);
        gradient.addColorStop(1, `rgba(200, 200, 210, ${weather.intensity * 1.2})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    ctx.restore();
};

const drawLowHealthVignette = (ctx: CanvasRenderingContext2D, player: Tank | null) => {
    if (!player || player.health > player.maxHealth * 0.25) return;
    
    const healthPercent = player.health / player.maxHealth;
    const alpha = (1 - healthPercent / 0.25) * (0.5 + Math.sin(Date.now() / 150) * 0.3);
    const gradient = ctx.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 200, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH / 2 + 100);
    gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(200, 0, 0, ${alpha})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
};

const drawStarfield = (ctx: CanvasRenderingContext2D, stars: Particle[]) => {
    ctx.fillStyle = '#01040f'; // Deep space blue
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    stars.forEach(star => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.life || 1})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

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

const drawVignette = (ctx: CanvasRenderingContext2D) => {
    const gradient = ctx.createRadialGradient(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_HEIGHT/2, CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_WIDTH/2 + 150);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ gameState }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.save();
        
        const { magnitude, duration } = gameState.screenShake;
        if (duration > 0) {
            const dx = (Math.random() - 0.5) * magnitude;
            const dy = (Math.random() - 0.5) * magnitude;
            ctx.translate(dx, dy);
        }

        drawStarfield(ctx, gameState.starfield);
        
        gameState.tireTracks.forEach(track => drawTireTrack(ctx, track));
        gameState.mines.forEach(mine => drawMine(ctx, mine));
        gameState.powerUps.forEach(powerUp => drawPowerUp(ctx, powerUp));
        gameState.experienceOrbs.forEach(orb => drawExperienceOrb(ctx, orb));
        gameState.artilleryTargets.forEach(target => drawArtilleryTarget(ctx, target));
        
        if (gameState.martyrsBeacon) {
            drawMartyrsBeacon(ctx, gameState.martyrsBeacon);
        }
        
        const allEntities: GameEntity[] = [
            ...(gameState.player ? [gameState.player] : []), 
            ...gameState.enemies, 
            ...gameState.allies, 
            ...(gameState.boss ? [gameState.boss] : []),
            ...gameState.drones,
            ...gameState.bullets,
        ];
        allEntities.sort((a, b) => (a.y + a.height) - (b.y + b.height));

        const allGameObjects = [...gameState.enemies, ...gameState.drones, ...(gameState.player ? [gameState.player] : []), ...gameState.allies, ...(gameState.boss ? [gameState.boss] : [])];

        allEntities.forEach(entity => {
            if (entity.type === 'tank') {
                 const target = allGameObjects.find(t => t.id === entity.targetId) ?? null;
                 drawTank(ctx, entity, target);
            } else if (entity.type === 'kamikaze_drone') {
                drawKamikazeDrone(ctx, entity);
            } else if (entity.type === 'bullet') {
                drawBullet(ctx, entity);
            }
        });
        
        gameState.shellCasings.forEach(shell => drawShellCasing(ctx, shell));
        gameState.sparks.forEach(spark => drawSpark(ctx, spark));
        gameState.smokeParticles.forEach(smoke => drawSmokeParticle(ctx, smoke));
        gameState.explosions.forEach(explosion => drawExplosion(ctx, explosion));
        gameState.muzzleFlashes.forEach(flash => drawMuzzleFlash(ctx, flash));
        
        gameState.floatingTexts.forEach(text => drawFloatingText(ctx, text));
        
        // Weather and low health vignettes should be drawn last to overlay everything
        drawWeather(ctx, gameState.weather);
        drawLowHealthVignette(ctx, gameState.player);
        drawVignette(ctx);

        ctx.restore();

    }, [gameState]);

    return (
        <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
        />
    );
};
