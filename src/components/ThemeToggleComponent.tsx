import React, { useState } from 'react';

export const ThemeToggleComponent: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2"
    >
      <span>{theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>
    </button>
  );
};
