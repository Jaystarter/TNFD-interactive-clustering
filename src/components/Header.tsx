import { useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";

export default function Header() {
  // On mount, sync theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <Card className="w-full rounded-none shadow-sm px-0 py-0 border-0 bg-gradient-to-r from-tnfd-green to-tnfd-dark-green h-10">
      <header className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <img src="/vite.svg" alt="TNFD Logo" className="h-6 w-6" />
          <span className="text-white text-lg font-bold tracking-wide drop-shadow">TNFD Tools Relational Map</span>
        </div>
        <nav className="hidden md:flex gap-1">
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 h-8 px-2 text-sm">Home</Button>
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 h-8 px-2 text-sm">About</Button>
        </nav>
        <Button
          variant="outline"
          size="sm"
          className="ml-3 w-7 h-7 p-0 rounded-full border-white/30 text-white bg-white/20 hover:bg-white/40 transition flex items-center justify-center"
          onClick={() => {
            const html = document.documentElement;
            const isDark = html.classList.toggle('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
          }}
          aria-label="Toggle dark mode"
        >
          <span className="text-sm">
            {typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '🌙' : '☀️'}
          </span>
        </Button>
      </header>
    </Card>
  );
}
