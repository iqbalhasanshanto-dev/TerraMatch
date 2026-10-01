import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  Bookmark,
  GitCompareArrows,
  Database,
  Info,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/explore', label: 'Explore Map', icon: Map },
  { to: '/saved', label: 'Saved Locations', icon: Bookmark },
  { to: '/compare', label: 'Compare', icon: GitCompareArrows },
  { to: '/data-sources', label: 'Data Sources', icon: Database },
  { to: '/about', label: 'About', icon: Info }
];

export default function Sidebar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="w-64 shrink-0 h-screen flex flex-col justify-between
                     bg-lightBg dark:bg-darkBg
                     border-r border-lightBorder dark:border-darkBorder
                     px-3 py-4">
      <div>
        <div className="flex items-center gap-2 px-2 mb-6">
          <span className="text-2xl">🪐</span>
          <div>
            <div className="text-sm font-semibold text-lightText dark:text-darkText leading-tight">
              Earth-Moon-Mars
            </div>
            <div className="text-xs text-lightTextSecondary dark:text-darkTextSecondary">
              Analog Sites Explorer
            </div>
          </div>
        </div>

        <ul className="space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors " +
                  (isActive
                    ? "bg-lightActiveNav text-white dark:bg-darkActiveNav dark:text-darkText"
                    : "text-lightTextSecondary dark:text-darkTextSecondary hover:bg-lightInset dark:hover:bg-darkPanel")
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={toggleTheme}
        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm
                   text-lightTextSecondary dark:text-darkTextSecondary
                   hover:bg-lightInset dark:hover:bg-darkPanel"
      >
        {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
        {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
        <span
          className={
            "ml-auto w-9 h-5 rounded-full relative transition-colors " +
            (theme === 'dark' ? 'bg-darkActiveNav' : 'bg-lightActiveNav')
          }
        >
          <span
            className={
              "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all " +
              (theme === 'dark' ? 'left-4' : 'left-0.5')
            }
          />
        </span>
      </button>
    </nav>
  );
}
