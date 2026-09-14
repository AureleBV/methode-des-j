import { NavLink, Outlet } from 'react-router-dom';

const NAV = [
  { to: '/', label: 'Accueil', icon: '🏠' },
  { to: '/repas', label: 'Repas', icon: '🍽️' },
  { to: '/journal', label: 'Journal', icon: '📒' },
  { to: '/sport', label: 'Sport', icon: '💪' },
  { to: '/progres', label: 'Progrès', icon: '📈' },
  { to: '/profil', label: 'Profil', icon: '👤' },
];

export function Layout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <main className="flex-1 px-4 pt-4 pb-28">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur safe-bottom">
        <div className="mx-auto flex max-w-lg justify-between px-1 pt-1.5">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1 text-[11px] font-semibold transition ${isActive ? 'text-primary' : 'text-muted hover:text-ink'}`}>
              {({ isActive }) => (
                <>
                  <span className={`flex h-7 w-11 items-center justify-center rounded-full text-lg transition ${isActive ? 'bg-primary-soft' : ''}`}>{n.icon}</span>
                  {n.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
