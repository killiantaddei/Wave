import { Home, PlusSquare, User } from 'lucide-react'
import { NavLink } from 'react-router-dom'

export default function BottomNav() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center gap-1 px-4 py-2 ${isActive ? 'text-white' : 'text-mist'}`

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-line bg-ink/90 py-2 backdrop-blur md:inset-x-auto md:left-1/2 md:bottom-4 md:w-full md:max-w-[280px] md:-translate-x-1/2 md:rounded-full md:border md:border-line md:bg-surface/95 md:py-2.5 md:shadow-xl">
      <NavLink to="/" className={linkClass} end>
        <Home size={22} />
        <span className="text-[10px] font-medium">Feed</span>
      </NavLink>
      <NavLink to="/upload" className={linkClass}>
        <PlusSquare size={22} />
        <span className="text-[10px] font-medium">Carica</span>
      </NavLink>
      <NavLink to="/profile" className={linkClass}>
        <User size={22} />
        <span className="text-[10px] font-medium">Profilo</span>
      </NavLink>
    </nav>
  )
}
