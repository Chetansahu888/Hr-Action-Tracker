import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, BarChart3, Settings,
  Layers, X, Menu, ChevronRight, PanelLeftClose, PanelLeftOpen,
  History as HistoryIcon, LogOut, ShieldCheck, User as UserIcon,
  RefreshCw, PlusCircle, FileSpreadsheet, CheckCircle2, FileText
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { taskService } from '../services/taskService';
import { AppLogo } from '../components/common/AppLogo';

const NAV = [
  { label: 'Dashboard',         href: '/dashboard', icon: LayoutDashboard, sub: 'Overview & KPIs' },
  { label: 'All Action Tasks',  href: '/tasks',     icon: CheckSquare,      sub: 'Manage actions' },
  { label: 'Audit History',     href: '/history',   icon: HistoryIcon,      sub: 'Activity & changes' },
  { label: 'Reports & Export',  href: '/reports',   icon: BarChart3,        sub: 'Analytics & downloads' },
  { label: 'Administration',    href: '/settings',  icon: Settings,         sub: 'Configuration & security' },
];

const SIDEBAR_W = 240;

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [taskCount, setTaskCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    taskService.getTasks().then(tasks => {
      if (tasks && Array.isArray(tasks)) {
        setTaskCount(tasks.length);
      }
    }).catch(() => {});
  }, [location.pathname]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Prevent non-admin users from accessing Settings
  if (!isAdmin && location.pathname.startsWith('/settings')) {
    return <Navigate to="/tasks" replace />;
  }

  const navItems = NAV.filter(n => n.href !== '/settings' || isAdmin);
  const activePage = navItems.find(n => location.pathname.startsWith(n.href));

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const triggerSync = async () => {
    setIsSyncing(true);
    try {
      const res = await taskService.getInitialData();
      if (res && res.tasks) setTaskCount(res.tasks.length);
    } catch { /* ignore */ }
    setTimeout(() => setIsSyncing(false), 800);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f4fbf7', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Mobile Overlay ─────────────────────── */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 49,
            background: 'rgba(15,23,42,0.4)',
            backdropFilter: 'blur(3px)',
            transition: 'opacity 0.2s ease',
          }}
        />
      )}

      {/* ── Sidebar ────────────────────────────── */}
      <aside
        style={{
          width: isMobile ? SIDEBAR_W : (isCollapsed ? 0 : SIDEBAR_W),
          minWidth: isMobile ? SIDEBAR_W : (isCollapsed ? 0 : SIDEBAR_W),
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          borderRight: '1px solid #e5e7eb',
          position: isMobile ? 'fixed' : 'relative',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
          transform: isMobile
            ? (mobileOpen ? 'translateX(0)' : `translateX(-${SIDEBAR_W}px)`)
            : 'translateX(0)',
          overflow: 'hidden',
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isMobile ? '4px 0 24px rgba(0,0,0,0.1)' : 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <div style={{ width: SIDEBAR_W, display: 'flex', flexDirection: 'column', height: '100%' }}>
          
          {/* Brand Header */}
          <div style={{ padding: '0 16px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: '#55642a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(85, 100, 42, 0.3)',
                }}
              >
                <AppLogo size={22} color="#ffffff" />
              </div>
              <div>
                <div style={{ color: '#0f172a', fontSize: 14, fontWeight: 800, lineHeight: 1.2 }}>
                  Action Tracker <span style={{ color: '#059669' }}>System</span>
                </div>
                <div style={{ color: '#64748b', fontSize: 11, fontWeight: 500, lineHeight: 1.2, marginTop: 2 }}>
                  HR Department
                </div>
              </div>
            </div>

            {/* Collapse toggle */}
            <button
              onClick={toggleSidebar}
              title={isMobile ? "Close menu" : "Collapse sidebar"}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                padding: 6,
                borderRadius: 8,
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              {isMobile ? <X size={15} /> : <PanelLeftClose size={15} />}
            </button>
          </div>

          {/* Nav Items */}
          <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {navItems.map(item => {
              const active = location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => isMobile && setMobileOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 12,
                    textDecoration: 'none',
                    position: 'relative',
                    background: active ? '#047857' : 'transparent',
                    color: active ? '#ffffff' : '#475569',
                    boxShadow: active ? '0 2px 10px rgba(4, 120, 87, 0.25)' : 'none',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      (e.currentTarget as HTMLAnchorElement).style.background = '#f0fdf4';
                      (e.currentTarget as HTMLAnchorElement).style.color = '#047857';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                      (e.currentTarget as HTMLAnchorElement).style.color = '#475569';
                    }
                  }}
                >
                  <item.icon size={17} color={active ? '#ffffff' : '#64748b'} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: active ? 700 : 500, lineHeight: 1.2 }}>
                      {item.label}
                    </div>
                  </div>
                  
                  {item.href === '/tasks' && (
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 99,
                        fontSize: 11,
                        fontWeight: 700,
                        background: active ? 'rgba(255,255,255,0.25)' : '#ecfdf5',
                        color: active ? '#ffffff' : '#059669',
                      }}
                    >
                      {taskCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Account / Role Card at Bottom of Sidebar */}
          <div style={{ padding: '12px 14px', borderTop: '1px solid #f1f5f9' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 12,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: '#047857',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {isAdmin ? <ShieldCheck size={16} /> : user.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: '#0f172a', fontSize: 12, fontWeight: 700, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.name}
                  </div>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '1px 6px',
                      borderRadius: 4,
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      backgroundColor: isAdmin ? '#ecfdf5' : '#f1f5f9',
                      color: isAdmin ? '#059669' : '#64748b',
                      marginTop: 2,
                    }}
                  >
                    {isAdmin ? 'Admin' : 'Doer User'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Logout"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#ef4444',
                  padding: 6,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fef2f2'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>

        </div>
      </aside>

      {/* ── Main Workspace ──────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Top Header Bar */}
        <header
          style={{
            height: 62,
            background: '#ffffff',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            gap: 16,
            flexShrink: 0,
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          {/* Left: Collapse Toggle + Brand Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={toggleSidebar}
              title={isCollapsed || (isMobile && !mobileOpen) ? "Open Sidebar" : "Close Sidebar"}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                padding: '7px 9px',
                borderRadius: 8,
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              {isCollapsed || (isMobile && !mobileOpen) ? <PanelLeftOpen size={16} /> : <Menu size={16} />}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: '#55642a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 2px 6px rgba(85, 100, 42, 0.25)',
                }}
              >
                <AppLogo size={18} color="#ffffff" />
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                Action Tracker <span style={{ color: '#059669' }}>System</span>
              </div>
            </div>
          </div>

          {/* Right Controls: Syncing Pill, User Badge, Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            
            {/* Live Sync Indicator */}
            <button
              onClick={triggerSync}
              title="Click to sync live with Google Sheet"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 99,
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#15803d',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
              <span>{isSyncing ? 'Syncing...' : 'Live Connected'}</span>
            </button>

            {/* Administrator Badge Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 12px',
                borderRadius: 99,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: 12,
              }}
            >
              <UserIcon size={14} color="#64748b" />
              <span style={{ fontWeight: 700, color: '#1e293b' }}>{user.name}</span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 99,
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  backgroundColor: '#047857',
                  color: '#ffffff',
                }}
              >
                {isAdmin ? 'ADMIN' : 'USER'}
              </span>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid #fee2e2',
                background: '#ffffff',
                color: '#ef4444',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fef2f2'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#ffffff'; }}
            >
              <LogOut size={13} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

