import React, { useContext, useState, useEffect, useRef } from "react";
import styled, { keyframes, css } from "styled-components";
import headerlogo from "@/assets/react.svg";
import Icon from "./icon";
import {
  AuthContext,
  SubscriptionContext,
  AlertContext,
  type UserMode,
} from "../Context/ContextConfig";
import {
  borderTheme__css,
  headerTheme,
  textTheme__css,
  sectionTheme__css,
  sectionBorderTheme__css,
} from "../styles/CssComponents";
import { NavLink, useNavigate } from "react-router";

export interface HeaderProps {
  title?: string;
  logoSrc?: string;
  alt?: string;
  onLogoClick?: () => void;
  children?: React.ReactNode;
  userType?: UserMode;
}

const Header: React.FC<HeaderProps> = ({ userType = "Admin" }) => {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const subscription = useContext(SubscriptionContext);
  const alert = useContext(AlertContext);

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const isAuthenticated = auth?.session != null;
  const isSubscribed = subscription?.isSubscribed ?? false;
  const isAdmin = auth?.session?.agente_role === "admin";

  // Cerrar menús al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("session_jwt");
    auth?.setSession(null);
    auth?.setIsAuthenticated(false);
    navigate("/home");
    setMenuOpen(false);
    setProfileOpen(false);
  };

  const handleCancelSubscription = () => {
    alert?.setAlertOptions({
      title: "Cancelar suscripción",
      message:
        "¿Estás seguro de que deseas cancelar tu suscripción? Perderás el acceso al finalizar el periodo actual.",
      type: "error",
      onConfirm: async () => {
        const token = localStorage.getItem("session_jwt");
        const res = await fetch(
          `${import.meta.env.VITE_API_SERVER_URL}/v1/api/cancel_subscription`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (res.ok) {
          const data: { success: boolean; payload: { current_period_end: number } } =
            await res.json();

          const formattedDate = data.payload?.current_period_end
            ? new Date(data.payload.current_period_end * 1000).toLocaleDateString(
                "es-MX",
                { day: "numeric", month: "long", year: "numeric" },
              )
            : null;

          if (formattedDate) subscription?.setPeriodEnd(formattedDate);

          alert?.setAlertOptions({
            title: "Suscripción cancelada",
            message: formattedDate
              ? `Tu suscripción ha sido cancelada. Tendrás acceso hasta el ${formattedDate}.`
              : "Tu suscripción ha sido cancelada correctamente.",
            type: "success",
          });
          alert?.setShowAlert(true);
        }
      },
    });
    alert?.setShowAlert(true);
    setProfileOpen(false);
    setMenuOpen(false);
  };

  const emailLabel = auth?.session?.email
    ? auth.session.email.split("@")[0]
    : "";

  return (
    <HeaderMain>
      {/* LOGO */}
      <LogoArea onClick={() => navigate("/home")}>
        <HeaderImg src={headerlogo} alt="Logo de app" />
        <AppName>GoAgent</AppName>
      </LogoArea>

      {/* DESKTOP NAV */}
      <DesktopView>
        <CustomNavLink to="/privacy">Privacidad</CustomNavLink>
        <CustomNavLink to="/pricing">Precios</CustomNavLink>

        {isAuthenticated ? (
          <>
            <CustomNavLink to="/dashboard">Dashboard</CustomNavLink>
            <CustomNavLink to="/calendar">Calendario</CustomNavLink>
            {isAdmin && <CustomNavLink to="/admin">Admin Panel</CustomNavLink>}

            <Divider />

            {/* Botón de perfil con dropdown */}
            <ProfileWrapper ref={profileRef}>
              <ProfileBtn
                $usertype={userType}
                onClick={() => setProfileOpen((v) => !v)}
              >
                <Icon iconName="AccountCircle" size={18} customColor="#155dfc" />
                <span>{emailLabel}</span>
                <Icon
                  iconName={profileOpen ? "ExpandLess" : "ExpandMore"}
                  size={16}
                  customColor="#155dfc"
                />
              </ProfileBtn>

              {profileOpen && (
                <ProfileDropdown>
                  {/* Email completo */}
                  <ProfileEmailStrip>
                    <Icon iconName="AccountCircle" size={16} customColor="#155dfc" />
                    <ProfileEmail>{auth?.session?.email}</ProfileEmail>
                  </ProfileEmailStrip>

                  <DrawerDivider />

                  {/* Cambiar contraseña */}
                  <ProfileItem
                    onClick={() => {
                      navigate("/auth/resetpasswordinitflow");
                      setProfileOpen(false);
                    }}
                  >
                    <Icon iconName="Lock" size={16} />
                    <span>Cambiar contraseña</span>
                  </ProfileItem>

                  {/* Cancelar suscripción (solo si activa) */}
                  {isSubscribed && !subscription?.periodEnd && (
                    <CancelSubBtn onClick={handleCancelSubscription}>
                      <Icon iconName="Cancel" size={16} customColor="#ef4444" />
                      <span>Cancelar suscripción</span>
                    </CancelSubBtn>
                  )}

                  <DrawerDivider />

                  {/* Cerrar sesión */}
                  <ProfileLogoutBtn onClick={handleLogout}>
                    <Icon iconName="Logout" size={16} customColor="#ef4444" />
                    <span>Cerrar sesión</span>
                  </ProfileLogoutBtn>
                </ProfileDropdown>
              )}
            </ProfileWrapper>
          </>
        ) : (
          <LoginLink to="/auth/signin">
            <Icon iconName="Login" size={16} customColor="#155dfc" />
            <span>Iniciar sesión</span>
          </LoginLink>
        )}
      </DesktopView>

      {/* MOBILE HAMBURGER */}
      <MobileView ref={menuRef}>
        <HamburgerBtn
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Abrir menú"
          $open={menuOpen}
        >
          <span />
          <span />
          <span />
        </HamburgerBtn>

        {menuOpen && (
          <MobileDrawer>
            {/* User info strip */}
            {isAuthenticated && (
              <DrawerUserStrip>
                <Icon iconName="AccountCircle" size={20} customColor="#155dfc" />
                <DrawerEmail>{auth?.session?.email}</DrawerEmail>
              </DrawerUserStrip>
            )}

            <DrawerDivider />

            <DrawerLink to="/privacy" onClick={() => setMenuOpen(false)}>
              <Icon iconName="Policy" size={18} />
              <span>Privacidad</span>
            </DrawerLink>

            <DrawerLink to="/pricing" onClick={() => setMenuOpen(false)}>
              <Icon iconName="CreditCard" size={18} />
              <span>Precios</span>
            </DrawerLink>

            <DrawerLink to="/support" onClick={() => setMenuOpen(false)}>
              <Icon iconName="SupportAgent" size={18} />
              <span>Soporte</span>
            </DrawerLink>

            {isAuthenticated ? (
              <>
                <DrawerLink to="/dashboard" onClick={() => setMenuOpen(false)}>
                  <Icon iconName="Dashboard" size={18} />
                  <span>Dashboard</span>
                </DrawerLink>
                <DrawerLink to="/calendar" onClick={() => setMenuOpen(false)}>
                  <Icon iconName="CalendarMonth" size={18} />
                  <span>Calendario</span>
                </DrawerLink>
                {isAdmin && (
                  <DrawerLink to="/admin" onClick={() => setMenuOpen(false)}>
                    <Icon iconName="AdminPanelSettings" size={18} />
                    <span>Admin Panel</span>
                  </DrawerLink>
                )}

                <DrawerDivider />

                <DrawerLink
                  to="/auth/resetpasswordinitflow"
                  onClick={() => setMenuOpen(false)}
                >
                  <Icon iconName="Lock" size={18} />
                  <span>Cambiar contraseña</span>
                </DrawerLink>

                {isSubscribed && (
                  <DrawerLogoutBtn onClick={handleCancelSubscription}>
                    <Icon iconName="Cancel" size={18} customColor="#ef4444" />
                    <span>Cancelar suscripción</span>
                  </DrawerLogoutBtn>
                )}

                <DrawerDivider />

                <DrawerLogoutBtn onClick={handleLogout}>
                  <Icon iconName="Logout" size={18} customColor="#ef4444" />
                  <span>Cerrar sesión</span>
                </DrawerLogoutBtn>
              </>
            ) : (
              <DrawerLink to="/auth/signin" onClick={() => setMenuOpen(false)}>
                <Icon iconName="Login" size={18} />
                <span>Iniciar sesión</span>
              </DrawerLink>
            )}
          </MobileDrawer>
        )}
      </MobileView>
    </HeaderMain>
  );
};

// ─── Animations ────────────────────────────────────────────────────────────────
const fadeDown = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Styled Components ─────────────────────────────────────────────────────────

const HeaderMain = styled.header`
  ${headerTheme}
  ${borderTheme__css}
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.25rem;

  @media (min-width: 768px) {
    padding: 0 4vw;
  }
`;

const LogoArea = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
`;

const HeaderImg = styled.img`
  width: 28px;
  height: 28px;
`;

const AppName = styled.span`
  ${textTheme__css}
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.3px;
`;

// ── Desktop ──────────────────────────────────────────────────────────────────

const DesktopView = styled.nav`
  display: none;
  align-items: center;
  gap: 4px;

  @media (min-width: 640px) {
    display: flex;
  }
`;

const navLinkBase = css`
  display: flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 8px;
  transition: background 0.18s ease, color 0.18s ease;
  ${textTheme__css}

  &:hover {
    background: ${(p) =>
      p.theme.mode === "Dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)"};
  }

  &.active {
    color: #155dfc;
    background: ${(p) =>
      p.theme.mode === "Dark" ? "rgba(21,93,252,0.12)" : "rgba(21,93,252,0.08)"};
  }
`;

const CustomNavLink = styled(NavLink)`
  ${navLinkBase}
`;

const LoginLink = styled(NavLink)`
  ${navLinkBase}
  color: #155dfc;
  border: 1px solid #155dfc44;

  &:hover {
    background: rgba(21, 93, 252, 0.1);
  }
`;

const Divider = styled.div`
  width: 1px;
  height: 20px;
  background: ${(p) =>
    p.theme.mode === "Dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"};
  margin: 0 6px;
`;

// ── Profile dropdown (desktop) ─────────────────────────────────────────────────

const ProfileWrapper = styled.div`
  position: relative;
`;

const ProfileBtn = styled.button<{ $usertype: UserMode }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  ${textTheme__css}
  background: ${(p) =>
    p.theme.mode === "Dark" ? "rgba(21,93,252,0.12)" : "rgba(21,93,252,0.08)"};
  border: 1px solid
    ${(p) =>
      p.theme.mode === "Dark" ? "rgba(21,93,252,0.3)" : "rgba(21,93,252,0.2)"};
  transition: background 0.18s;

  &:hover {
    background: ${(p) =>
      p.theme.mode === "Dark" ? "rgba(21,93,252,0.2)" : "rgba(21,93,252,0.14)"};
  }
`;

const ProfileDropdown = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  min-width: 230px;
  border-radius: 12px;
  padding: 8px;
  animation: ${fadeDown} 0.2s ease;
  z-index: 200;
  ${sectionTheme__css}
  ${sectionBorderTheme__css}
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
`;

const ProfileEmailStrip = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px 4px;
`;

const ProfileEmail = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: #a9a9a9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 170px;
`;

const ProfileItem = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 12px;
  border-radius: 8px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.15s;
  ${textTheme__css}

  &:hover {
    background: ${(p) =>
      p.theme.mode === "Dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)"};
  }
`;

const CancelSubBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 12px;
  border-radius: 8px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #ef4444;
  transition: background 0.15s;

  &:hover {
    background: rgba(239, 68, 68, 0.1);
  }
`;

const ProfileLogoutBtn = styled(CancelSubBtn)``;


// ── Mobile ────────────────────────────────────────────────────────────────────

const MobileView = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  @media (min-width: 640px) {
    display: none;
  }
`;

const HamburgerBtn = styled.button<{ $open: boolean }>`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 36px;
  height: 36px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  transition: background 0.18s;

  &:hover {
    background: ${(p) =>
      p.theme.mode === "Dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)"};
  }

  span {
    display: block;
    width: 100%;
    height: 2px;
    border-radius: 2px;
    background: ${(p) =>
      p.theme.mode === "Dark" ? "#fff" : "#1d293d"};
    transition: transform 0.25s ease, opacity 0.25s ease;
  }

  ${(p) =>
    p.$open &&
    css`
      span:nth-child(1) {
        transform: translateY(7px) rotate(45deg);
      }
      span:nth-child(2) {
        opacity: 0;
      }
      span:nth-child(3) {
        transform: translateY(-7px) rotate(-45deg);
      }
    `}
`;

const MobileDrawer = styled.div`
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  min-width: 220px;
  border-radius: 12px;
  padding: 8px;
  animation: ${fadeDown} 0.2s ease;
  z-index: 200;
  ${sectionTheme__css}
  ${sectionBorderTheme__css}
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
`;

const DrawerUserStrip = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px 4px;
`;

const DrawerEmail = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: #a9a9a9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
`;

const DrawerDivider = styled.div`
  height: 1px;
  margin: 6px 4px;
  background: ${(p) =>
    p.theme.mode === "Dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"};
`;

const DrawerLink = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.15s;
  ${textTheme__css}

  &:hover {
    background: ${(p) =>
      p.theme.mode === "Dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)"};
  }

  &.active {
    color: #155dfc;
    background: ${(p) =>
      p.theme.mode === "Dark" ? "rgba(21,93,252,0.12)" : "rgba(21,93,252,0.08)"};
  }
`;

const DrawerLogoutBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 12px;
  border-radius: 8px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #ef4444;
  transition: background 0.15s;

  &:hover {
    background: rgba(239, 68, 68, 0.1);
  }
`;

export default Header;
