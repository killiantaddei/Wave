import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import DeviceGate from './components/DeviceGate'
import BottomNav from './components/BottomNav'
import Feed from './pages/Feed'
import Upload from './pages/Upload'
import ProfilePage from './pages/ProfilePage'
import EditProfile from './pages/EditProfile'
import Auth from './pages/Auth'

export default function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return <div className="flex h-[100dvh] items-center justify-center bg-ink text-mist">Caricamento…</div>
  }

  return (
    <DeviceGate>
      <Routes>
        <Route path="/auth" element={session ? <Navigate to="/" /> : <Auth />} />
        <Route
          path="/*"
          element={
            <div className="relative">
              <Routes>
                <Route path="/" element={<Feed />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/profile" element={session ? <ProfilePage /> : <Navigate to="/auth" />} />
                <Route path="/profile/edit" element={session ? <EditProfile /> : <Navigate to="/auth" />} />
                <Route path="/profile/:userId" element={<ProfilePage />} />
              </Routes>
              <BottomNav />
            </div>
          }
        />
      </Routes>
    </DeviceGate>
  )
}
