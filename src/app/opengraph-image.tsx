import { ImageResponse } from 'next/og';
export const alt = 'Gitium — find useful GitHub projects';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function OpenGraphImage() {
  return new ImageResponse(<div style={{display:'flex',flexDirection:'column',justifyContent:'space-between',width:'100%',height:'100%',background:'#151517',color:'#eeeef0',padding:70,fontFamily:'Arial, sans-serif'}}>
    <div style={{display:'flex',alignItems:'center',gap:17,fontSize:36}}><svg width="54" height="54" viewBox="0 0 64 64"><rect width="64" height="64" rx="17" fill="#eeeef0"/><path d="M43 18H26a11 11 0 0 0-11 11v6a11 11 0 0 0 11 11h12a11 11 0 0 0 11-11v-5H32" fill="none" stroke="#242529" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="44" cy="16" r="6" fill="#556de5"/></svg>gitium</div>
    <div style={{display:'flex',flexDirection:'column',gap:24}}><div style={{display:'flex',fontSize:78,letterSpacing:-3,lineHeight:1.05,maxWidth:920}}>Find your next project.</div><div style={{display:'flex',fontSize:27,lineHeight:1.5,color:'#a4a4af',maxWidth:900}}>Explore GitHub projects, search 1,000+ essential tools, and find somewhere to contribute.</div></div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:'1px solid #323237',paddingTop:25,fontSize:20,color:'#a4a4af'}}><span>gitium.vercel.app</span><span style={{color:'#a3b0ff'}}>Built for exploring open source ↗</span></div>
  </div>,size);
}
