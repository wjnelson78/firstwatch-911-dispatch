import { Dashboard } from './components/dashboard/Dashboard'
import { AuthProvider } from './contexts/AuthContext'
import { AdminProvider } from './contexts/AdminContext'

function App() {
  return (
    <AuthProvider>
      <AdminProvider>
        <Dashboard />
      </AdminProvider>
    </AuthProvider>
  )
}

export default App
