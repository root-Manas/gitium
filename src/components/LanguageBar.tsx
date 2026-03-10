"use client";

interface Language {
  name: string;
  percentage: number;
  color: string;
}

export default function LanguageBar({ languages }: { languages: Language[] }) {
  return (
    <div className="flex h-2 rounded-full overflow-hidden">
      {languages.map((lang) => (
        <div
          key={lang.name}
          style={{
            width: `${lang.percentage}%`,
            backgroundColor: lang.color,
          }}
          title={`${lang.name}: ${lang.percentage.toFixed(1)}%`}
        />
      ))}
    </div>
  );
}
