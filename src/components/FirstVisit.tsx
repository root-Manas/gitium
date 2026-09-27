"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Code2, FolderGit2, Users } from "lucide-react";

const sections = [
  { label: "Projects", icon: FolderGit2, lines: ["open source", "languages & topics", "issues to work on"] },
  { label: "People", icon: Users, lines: ["GitHub profiles", "people you follow", "shared projects"] },
  { label: "Code", icon: Code2, lines: ["commits", "contributors", "repository history"] },
];
export function FirstVisit() {
  const dialog = useRef<HTMLDialogElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [section, setSection] = useState(0);
  const [closed, setClosed] = useState(false);
  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    try { sessionStorage.setItem("gitium-intro-seen", "1"); } catch {}
    delete document.documentElement.dataset.intro;
    dialog.current?.close();
    setClosed(true);
  }, []);
  useEffect(() => {
    if (document.documentElement.dataset.intro !== "pending") return;
    const node = dialog.current;
    node?.showModal();
    timer.current = setTimeout(dismiss, matchMedia("(prefers-reduced-motion: reduce)").matches ? 1000 : 2400);
    return () => { clearTimeout(timer.current); node?.close(); };
  }, [dismiss]);
  if (closed) return null;
  const selected = sections[section];
  return <dialog ref={dialog} className="first-visit" aria-labelledby="intro-title" onCancel={event => { event.preventDefault(); dismiss(); }}>
    <div className="intro-inner">
      <div className="intro-brand"><svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M27 11H16a7 7 0 0 0-7 7v4a7 7 0 0 0 7 7h8a7 7 0 0 0 7-7v-3H20" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/><circle cx="28" cy="10" r="4" fill="var(--accent)"/></svg><h1 id="intro-title">gitium<span>_</span></h1></div>
      <div className="intro-preview" key={section} aria-hidden="true"><div className="intro-orbit"><selected.icon size={32}/><i/><i/><i/></div><div className="intro-lines">{selected.lines.map((line,index)=><span key={line} style={{animationDelay:`${index*100}ms`}}>{line}</span>)}</div></div>
      <div className="intro-choices" aria-label="Preview Gitium">{sections.map(({label,icon:Icon},index)=><button key={label} aria-pressed={section===index} onClick={()=>{clearTimeout(timer.current);setSection(index);}}><Icon size={15}/>{label}</button>)}</div>
      <div className="intro-footer"><span role="status">Opening Gitium<span className="intro-dots">…</span></span><button autoFocus onClick={dismiss}>Enter Gitium <ArrowRight size={16}/></button></div>
    </div>
  </dialog>;
}
