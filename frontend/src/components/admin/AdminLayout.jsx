import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { Button } from '../ui/button';
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '../ui/sheet';
import logo from '../../assets/logos/uniqueofy-logo.svg';

const navItems = [
  { label: 'Dashboard', to: '/admin' },
  { label: 'Orders', to: '/admin/orders' },
  { label: 'Services', to: '/admin/services' },
  { label: 'Users', to: '/admin/users' },
];

const sectionTitleMap = {
  '/admin': 'Dashboard',
  '/admin/orders': 'Orders',
  '/admin/services': 'Services',
  '/admin/users': 'Users',
};

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const pageTitle = useMemo(() => sectionTitleMap[location.pathname] || 'Admin', [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="admin-shell min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r bg-white lg:flex lg:flex-col">
          <button
            type="button"
            className="flex items-center gap-3 border-b px-6 py-5 text-left transition-opacity hover:opacity-80 !ring-0 !outline-none focus:!ring-0 focus-visible:!ring-0 focus-visible:!outline-none"
            onClick={() => navigate('/admin')}
          >
            <img src={logo} alt="Uniqueofy logo" className="h-8 w-8 object-contain" />
            <div>
              <div className="text-[15px] font-bold tracking-wider text-slate-900">UNIQUEOFY</div>
              <div className="text-xs font-medium text-slate-500">Admin Console</div>
            </div>
          </button>

          <div className="flex-1 px-4 py-6">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/admin'}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-lg px-4 py-3 font-medium transition-colors',
                      isActive
                        ? 'bg-slate-100 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="border-t p-4">
            <Button className="w-full justify-start gap-3 py-6 text-slate-700 hover:bg-red-50 hover:text-red-600" variant="outline" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
              Logout
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
            <div className="mx-auto w-full max-w-7xl lg:px-8">
              <div className="flex items-center justify-between border-b bg-white p-4 shadow-sm lg:hidden">
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" className="h-12 w-12 p-2" aria-label="Open Menu">
                      <Menu className="h-7 w-7 text-slate-800" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[280px] bg-white p-0">
                    <div className="admin-shell flex h-full flex-col bg-white">
                      <div className="border-b p-6">
                        <div className="flex items-center gap-3">
                          <img src={logo} alt="Uniqueofy logo" className="h-7 w-7 object-contain" />
                          <div>
                            <div className="text-base font-bold tracking-wider text-slate-900">UNIQUEOFY</div>
                            <div className="text-xs font-medium text-slate-500">Admin Console</div>
                          </div>
                        </div>
                      </div>

                      <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
                        {navItems.map((item) => (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/admin'}
                            onClick={() => setMobileOpen(false)}
                            className={({ isActive }) =>
                              [
                                'flex items-center gap-3 rounded-lg px-4 py-3 font-medium transition-colors',
                                isActive
                                  ? 'bg-slate-100 text-blue-700'
                                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                              ].join(' ')
                            }
                          >
                            {item.label}
                          </NavLink>
                        ))}
                      </nav>

                      <div className="border-t p-4">
                        <SheetClose asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start gap-3 py-6 text-slate-700 hover:bg-red-50 hover:text-red-600"
                            onClick={handleLogout}
                          >
                            <LogOut className="h-5 w-5" />
                            Logout
                          </Button>
                        </SheetClose>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>

                <h1 className="text-lg font-semibold text-foreground">{pageTitle}</h1>

                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">Admin</span>
              </div>

              <div className="hidden items-center justify-between gap-4 px-6 py-3 lg:flex">
                <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{pageTitle}</h1>

                <div className="flex items-center gap-2 rounded-full border bg-white px-3 py-1.5">
                  <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">Admin</span>
                  <span className="text-sm text-muted-foreground">
                    {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.phone || 'Administrator'}
                  </span>
                </div>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
