import type { CSSProperties } from 'react';
export function MosaicLogo() { return <svg viewBox="0 0 48 48" aria-hidden="true"><rect x="2" y="2" width="19" height="19" rx="6" fill="#21695e"/><rect x="27" y="2" width="19" height="19" rx="6" fill="#e8997d"/><rect x="2" y="27" width="19" height="19" rx="6" fill="#dac669"/><path d="M27 33a6 6 0 0 1 6-6h13v13a6 6 0 0 1-6 6H27z" fill="#293731"/></svg>; }
export function ObjectArt({ icon, className = '', style }: { icon: string; className?: string; style?: CSSProperties }) {
  const paths: Record<string, React.ReactNode> = {
    leaf: <><path d="M13 48C4 19 28 9 53 10c0 28-18 43-40 38Z" fill="#b9cfaa"/><path d="m13 49 27-27m-17 17-1-13m7 7 13 1"/></>,
    mug: <><path d="M14 23h31v23c0 9-31 9-31 0Z" fill="#e9b398"/><path d="M45 25h5c12 0 12 16 0 16h-5M23 16v-6m12 6v-6"/><path d="M18 29h22" stroke="#fff7ed"/></>,
    key: <><circle cx="22" cy="21" r="12" fill="#dac669"/><circle cx="22" cy="21" r="4" fill="#f6f4ed"/><path d="m31 29 22 22-7 6-8-8 4-4-8-8Z" fill="#dac669"/></>,
    book: <><path d="M9 15c9-4 16-1 23 4 7-5 14-8 23-4v36c-9-4-16-1-23 4-7-5-14-8-23-4Z" fill="#b9cbd0"/><path d="M32 19v36M16 24l9 3m-9 6 9 3m15-9 8-3m-8 12 8-3"/></>,
    apple: <><path d="M32 23C10 7 1 41 20 53c8 5 11-1 12-1s7 5 14-1C64 36 53 8 32 23Z" fill="#e8997d"/><path d="M32 24c-3-10 3-15 7-17m-7 12c-9-1-12-8-12-8 8-1 12 3 12 8"/></>,
    star: <path d="m32 7 8 16 18 3-13 13 3 19-16-9-16 9 3-19L6 26l18-3Z" fill="#dac669"/>,
    lamp: <><path d="m20 13-9 23h42l-9-23Z" fill="#dac669"/><path d="M32 36v17m-13 3h26M20 13h24"/></>,
    flower: <><path d="M32 33v23m0-9-13-7m13 3 13-8"/><path d="M25 22C7 27 15 2 27 11c1-16 24-9 15 4 17 0 13 23-2 19-5 17-27 8-20-5" fill="#e7b7ac"/><circle cx="32" cy="24" r="7" fill="#dac669"/></>,
    clock: <><circle cx="32" cy="31" r="22" fill="#b9cbd0"/><path d="M32 16v16l10 6M15 52l-4 7m38-7 4 7"/><path d="m10 14 9-9m26 0 9 9"/></>,
    umbrella: <><path d="M6 31c2-31 50-31 52 0-8-5-14-5-26 0-11-5-19-5-26 0Z" fill="#b9cfaa"/><path d="M32 6v44c0 12 15 12 15 0M21 28c1-11 5-17 11-22 6 5 10 11 11 22"/></>,
    moon: <path d="M45 9c-25-7-46 22-29 41 15 18 42 5 42-14-18 11-36-7-13-27Z" fill="#dac669"/>,
    fish: <><path d="M13 32C26 7 49 15 54 32 48 51 25 55 13 32Z" fill="#b9cbd0"/><path d="m13 32-9-14v28Z" fill="#b9cbd0"/><circle cx="44" cy="29" r="2" fill="#293731"/><path d="m28 29-7 8 9 6"/></>,
    bell: <><path d="M15 43c8-8 1-26 17-26s9 18 17 26Z" fill="#dac669"/><path d="M12 44h40M26 50c0 8 12 8 12 0M28 11h8"/></>,
    boat: <><path d="m8 43 9 12h30l9-12Z" fill="#b9cbd0"/><path d="M31 6v37m0-33-18 25h18Z" fill="#e9b398"/><path d="m36 14 16 22H36Z" fill="#dac669"/><path d="M7 60h49"/></>,
    bird: <><path d="M9 39c16 8 35 3 37-15 0-14-16-13-18-3-1 6-6 10-19 18Z" fill="#b9cfaa"/><path d="m44 25 12 4-11 5M25 42v11m9-13v13m-16 0h24"/><circle cx="37" cy="23" r="2" fill="#293731"/><path d="M24 30c-3 12 5 10 11 3"/></>,
    pencil: <><path d="m14 43 27-30 11 10-27 30-16 6Z" fill="#dac669"/><path d="m41 13 5-5c5-5 17 5 12 10l-6 5" fill="#e8997d"/><path d="m14 43 11 10m-8 2-6-6m11-1 24-27"/></>,
  };
  return <svg viewBox="0 0 64 64" aria-hidden="true" className={`object-art ${className}`} style={style} fill="none" stroke="#293731" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{paths[icon] ?? paths.star}</svg>;
}
export function HeroArt() { return <div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><span className="art-spark spark-one">✦</span><span className="art-spark spark-two">✧</span><div className="hero-tile tile-leaf"><ObjectArt icon="leaf"/></div><div className="hero-tile tile-star"><ObjectArt icon="star"/></div><div className="hero-tile tile-mug"><ObjectArt icon="mug"/></div><div className="hero-tile tile-book"><ObjectArt icon="book"/></div><div className="hero-tile tile-key"><ObjectArt icon="key"/></div><div className="hero-note">a piece of your mind <span>↗</span></div></div>; }
