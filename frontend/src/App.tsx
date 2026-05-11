import { Routes, Route, Link as RouterLink, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faLeaf, 
  faLayerGroup, 
  faPlusCircle, 
  faList, 
  faRightFromBracket, 
  faRightToBracket 
} from '@fortawesome/free-solid-svg-icons'
import { Button } from "@/components/ui/button"
import Home from './pages/Home'
import TemplateEditPage from './pages/TemplateEditPage'
import TemplateDetailPage from './pages/TemplateDetailPage'
import ItemDetailPage from './pages/ItemDetailPage'
import NewItemScratchPage from './pages/NewItemScratchPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import { useAuth } from './context/AuthContext'

// Simple wrapper for protected routes
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Library', path: '/', icon: faLayerGroup },
    { name: 'New from Scratch', path: '/items/new', icon: faPlusCircle },
  ];

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-2 lg:px-4">
        <div className="container flex h-16 items-center justify-between mx-auto">
          <RouterLink to="/" className="flex items-center space-x-2">
            <FontAwesomeIcon icon={faLeaf} className="h-6 w-6 text-primary" />
            <span className="inline-block font-bold text-xl tracking-tight">PicoMango</span>
          </RouterLink>

          <nav className="flex items-center space-x-2">
            <div className="hidden md:flex items-center space-x-1 mr-4">
              {navItems.map((item) => (
                <RouterLink
                  key={item.path}
                  to={item.path}
                >
                  <Button
                    variant={location.pathname === item.path ? "secondary" : "ghost"}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={item.icon} className="h-4 w-4" />
                    {item.name}
                  </Button>
                </RouterLink>
              ))}
            </div>

            <div className="h-6 w-[1px] bg-border mx-2 hidden md:block" />

            {isAuthenticated ? (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
              >
                <FontAwesomeIcon icon={faRightFromBracket} className="h-4 w-4" />
                Logout
              </Button>
            ) : (
              <RouterLink to="/login">
                <Button variant="default" size="sm" className="gap-2">
                  <FontAwesomeIcon icon={faRightToBracket} className="h-4 w-4" />
                  Login
                </Button>
              </RouterLink>
            )}
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-1 lg:px-4 flex-1 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          
          <Route path="/items/new" element={
            <ProtectedRoute>
              <NewItemScratchPage />
            </ProtectedRoute>
          } />
          
          <Route path="/templates/:id/edit" element={
            <ProtectedRoute>
              <TemplateEditPage />
            </ProtectedRoute>
          } />

          <Route path="/templates/:id" element={
            <ProtectedRoute>
              <TemplateDetailPage />
            </ProtectedRoute>
          } />

          <Route path="/items/:id" element={
            <ProtectedRoute>
              <ItemDetailPage />
            </ProtectedRoute>
          } />

          <Route path="/templates" element={<div className="p-8 text-center text-muted-foreground">Templates Route (Coming Soon)</div>} />
          <Route path="/items" element={<div className="p-8 text-center text-muted-foreground">Items Route (Coming Soon)</div>} />
        </Routes>
      </main>
    </div>
  )
}

export default App
