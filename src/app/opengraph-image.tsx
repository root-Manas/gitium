import { ImageResponse } from 'next/og';

export const alt = 'Gitium — find the work worth following';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(<div style={{ display: 'flex', width: '100%', height: '100%', background: '#11131d', color: '#f1f2f7', padding: 72, position: 'relative', fontFamily: 'Arial, sans-serif' }}>
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 36, fontWeight: 700 }}><span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 54, height: 54, borderRadius: 14, background: '#b5a9ff', color: '#11131d', fontSize: 40 }}>⌁</span> gitium<span style={{ color: '#ff9e87' }}>.</span></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}><div style={{ display: 'flex', color: '#b5a9ff', fontSize: 20, letterSpacing: 3 }}>DISCOVER · EXPLORE · TALK</div><div style={{ display: 'flex', fontSize: 76, fontWeight: 700, lineHeight: 1.02, maxWidth: 900 }}>Find the work worth following.</div><div style={{ display: 'flex', fontSize: 25, color: '#abb0c0', maxWidth: 900 }}>GitHub discovery, code graphs, account scores, and private rooms.</div></div>
      <div style={{ display: 'flex', color: '#abb0c0', fontSize: 20 }}>gitium.vercel.app</div>
    </div><div style={{ position: 'absolute', width: 300, height: 300, border: '2px solid #b5a9ff', borderRadius: 150, right: -80, top: 80, opacity: .32 }}/><div style={{ position: 'absolute', width: 180, height: 180, border: '2px solid #ff9e87', borderRadius: 90, right: 55, bottom: -60, opacity: .5 }}/>
  </div>, size);
}
