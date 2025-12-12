import { Dashboard } from './components/dashboard/Dashboard'
import { AuthProvider } from './contexts/AuthContext'
import { AdminProvider } from './contexts/AdminContext'
import { FavoritesProvider } from './contexts/FavoritesContext'

function App() {
  return (
    <AuthProvider>
      <AdminProvider>
        <FavoritesProvider>
          <Dashboard />
        </FavoritesProvider>
      </AdminProvider>
    </AuthProvider>
  )
}

export default App
