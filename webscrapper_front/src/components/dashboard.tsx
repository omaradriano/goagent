import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import {
  AuthContext,
  DataChangedContext,
  ThemeContext,
  type PreferedScheme,
} from "../Context/ContextConfig";

import StatTag from "./statCard";
import PolizasContainer from "./polizasContainer";
import Button from "./button";
import Icon from "./icon";
import SearchBar from "./searchbar";

import {
  textTheme__css,
} from "../styles/CssComponents";

import type { PolizaGetItem } from "../Types/types";
import { useNavigate } from "react-router";
import { SubscriptionContext } from "../Context/ContextConfig";

const Dashboard: React.FC = () => {
  const theme = useContext(ThemeContext);
  const auth = useContext(AuthContext);
  const dataChanged = useContext(DataChangedContext);
  const subscription = useContext(SubscriptionContext);
  const navigate = useNavigate();
  const isSubscribed = subscription?.isSubscribed ?? false;

  const [polizasData, setPolizasData] = useState<PolizaGetItem[]>([]);
  const [polizasChanged, setPolizasChanged] = useState<PolizaGetItem[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [searchAseguradoValue, setSearchAseguradoValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<{ [key: string]: string }>({});
  const [maxPages, setMaxPages] = useState(1);

  const [showAnuladasFilter, setAnuladasFilter] = useState(true);
  const [showAnuladasCheckbox, setShowAnuladasCheckbox] = useState(true);

  const [detailsData, setDetailsData] = useState<{
    total: number;
    activas: number;
    por_vencer: number;
    inactivas: number;
    sin_pago_registrado: number;
    cobertura_activa: number;
    recientes: number;
  }>({
    total: 0,
    activas: 0,
    por_vencer: 0,
    inactivas: 0,
    sin_pago_registrado: 0,
    cobertura_activa: 0,
    recientes: 0,
  });

  function convertFiltersToString(currentFilters: { [key: string]: string }) {
    const entries = Object.entries(currentFilters);
    if (!entries.length) return "";
    return (
      "&" +
      entries
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&")
    );
  }

  async function fetchPolizas(query_params: string) {
    const session_token = localStorage.getItem("session_jwt");
    if (!session_token) {
      auth?.setIsAuthenticated(false);
      navigate("/home");
      return null;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_SERVER_URL}/v1/scrapping/polizas?pageSize=20&currentPage=${currentPage}${query_params}`,
        { headers: { Authorization: `Bearer ${session_token}` } },
      );
      const data = await res.json();
      if (!data.success) return null;
      return data;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async function getPolizasDetails() {
    const session_token = localStorage.getItem("session_jwt");
    if (!session_token) {
      auth?.setIsAuthenticated(false);
      navigate("/home");
      return null;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_SERVER_URL}/v1/scrapping/details`,
        {
          headers: { Authorization: `Bearer ${session_token}` },
        },
      );
      const data = await res.json();
      if (data && data.success && data.payload) return data.payload;
      return null;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  useEffect(() => {
    const loadData = async () => {
      const filtersString = convertFiltersToString({
        ...filters,
        show_anuladas: showAnuladasFilter ? "true" : "false",
      });
      const data = await fetchPolizas(filtersString);
      if (data?.payload) {
        setPolizasData(data.payload.items);
        setMaxPages(data.payload.pages || 1);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filters, showAnuladasFilter, dataChanged?.dataHasChanged]);

  useEffect(() => {
    const loadDetails = async () => {
      const payload = await getPolizasDetails();
      if (payload) setDetailsData(payload);
    };
    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataChanged?.dataHasChanged]);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAnuladasFilter(e.target.checked);
    setCurrentPage(1);
  };

  const isDark = theme?.theme === "Dark";

  return (
    <DashboardContainer>
      {/* Banner de suscripción inactiva */}
      {!isSubscribed && (
        <SubscriptionBanner>
          <BannerLeft>
            <Icon iconName="LockOutlined" size={20} customColor="#d97706" />
            <BannerText>
              No tienes una suscripción activa. El registro de pagos y el calendario están deshabilitados.
            </BannerText>
          </BannerLeft>
          <BannerAction onClick={() => navigate("/pricing")}>
            Reactivar suscripción
          </BannerAction>
        </SubscriptionBanner>
      )}

      {/* Page header */}
      <DashboardHeader>
        <HeaderLeft>
          <DashboardTitle>Mis pólizas</DashboardTitle>
          <DashboardText $theme={theme?.theme as PreferedScheme}>
            Gestiona tus recordatorios de corte de pólizas.
          </DashboardText>
        </HeaderLeft>
      </DashboardHeader>

      {/* Stat cards */}
      <StatContainer>
        <StatTag
          amount={detailsData.total}
          title="Total"
          type="Default"
          filter={() => {
            setFilters({});
            setCurrentPage(1);
            setSearchValue("");
            setSearchAseguradoValue("");
            setAnuladasFilter(true);
            setShowAnuladasCheckbox(true);
          }}
        />
        <StatTag
          amount={detailsData.activas}
          title="Activas"
          type="Success"
          filter={() => {
            setCurrentPage(1);
            setFilters({ estatus: "En Vigor" });
            setSearchValue("");
            setSearchAseguradoValue("");
            setAnuladasFilter(true);
            setShowAnuladasCheckbox(false);
          }}
        />
        <StatTag
          amount={detailsData.inactivas}
          title="Anuladas"
          type="Danger"
          filter={() => {
            setCurrentPage(1);
            setFilters({ estatus: "Anulada" });
            setSearchValue("");
            setSearchAseguradoValue("");
            setAnuladasFilter(false);
            setShowAnuladasCheckbox(false);
          }}
        />
        <StatTag
          amount={detailsData.por_vencer}
          title="Por vencer o fecha superada"
          type="Warning"
          filter={() => {
            setCurrentPage(1);
            setFilters({ next_due: "true" });
            setSearchValue("");
            setSearchAseguradoValue("");
            setAnuladasFilter(true);
            setShowAnuladasCheckbox(true);
          }}
        />
        <StatTag
          amount={detailsData.recientes}
          title="Modificados recientemente"
          type="DefaultBlue"
          filter={() => {
            setCurrentPage(1);
            setFilters({ recent: "true" });
            setSearchValue("");
            setSearchAseguradoValue("");
            setAnuladasFilter(true);
            setShowAnuladasCheckbox(true);
          }}
        />
      </StatContainer>

      {/* Filters bar */}
      <FiltersBar $isDark={isDark}>
        <SearchBar
          stateValue={filters}
          stateChangeValue={setFilters}
          setCurrentPage={setCurrentPage}
          searchValue={searchValue}
          setSearchValue={setSearchValue}
        />
        <SearchBar
          stateValue={filters}
          stateChangeValue={setFilters}
          setCurrentPage={setCurrentPage}
          searchValue={searchAseguradoValue}
          setSearchValue={setSearchAseguradoValue}
          filterKey="nombre_asegurado"
          placeholder="Buscar asegurado..."
        />

        {showAnuladasCheckbox && (
          <FilterAnuladas htmlFor="hideCanceled" $isDark={isDark}>
            <input
              type="checkbox"
              id="hideCanceled"
              checked={showAnuladasFilter}
              onChange={handleCheckboxChange}
            />
            <span />
            Ocultar anuladas
          </FilterAnuladas>
        )}

        <PaginationRow>
          <PaginationBtn
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            $isDark={isDark}
            aria-label="Página anterior"
          >
            <Icon iconName="KeyboardArrowLeft" customColor={isDark ? "#e2e8f0" : "#374151"} size={18} />
          </PaginationBtn>
          <PageIndicator $isDark={isDark}>
            {currentPage} / {maxPages}
          </PageIndicator>
          <PaginationBtn
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, maxPages))
            }
            $isDark={isDark}
            aria-label="Página siguiente"
          >
            <Icon iconName="KeyboardArrowRight" customColor={isDark ? "#e2e8f0" : "#374151"} size={18} />
          </PaginationBtn>
        </PaginationRow>
      </FiltersBar>

      {/* Table */}
      <PolizasContainer
        data={polizasData}
        notificationsNotifier={{
          stateAction: setPolizasChanged,
          stateValue: polizasChanged,
        }}
      />

      {/* Floating changes toast */}
      <AppliedChangesContainer $visible={polizasChanged.length > 0} $isDark={isDark}>
        <AppliedChangesHeader>
          <Icon iconName="Warning" customColor="#f9e423" size={20} />
          <AppliedChangesText $isDark={isDark}>
            Cambios pendientes en{" "}
            <strong>{polizasChanged.length}</strong>{" "}
            {polizasChanged.length === 1 ? "póliza" : "pólizas"}
          </AppliedChangesText>
        </AppliedChangesHeader>
        <Button
          type="DefaultBlue"
          label="Aplicar cambios"
          action={() => console.log("Aplicando")}
        />
      </AppliedChangesContainer>
    </DashboardContainer>
  );
};

// ---- STYLED COMPONENTS ----

const DashboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 28px 4vw 40px;
  gap: 20px;
  min-height: calc(100vh - 60px);
  position: relative;
`;

const DashboardHeader = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const StatContainer = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  /* align-items: center; */
  justify-content: center;
`;

const FiltersBar = styled.div<{ $isDark: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  background-color: ${(p) => (p.$isDark ? "var(--bg-dark-header)" : "#ffffff")};
  border: 1px solid
    ${(p) =>
      p.$isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"};
  border-radius: 10px;
  padding: 10px 14px;
`;

const PaginationRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
`;

const PaginationBtn = styled.button<{ $isDark: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 7px;
  border: 1px solid
    ${(p) =>
      p.$isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"};
  background-color: ${(p) =>
    p.$isDark ? "rgba(255,255,255,0.05)" : "#f8fafc"};
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;

  &:hover {
    background-color: ${(p) =>
      p.$isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0"};
    border-color: ${(p) =>
      p.$isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.18)"};
  }
`;

const PageIndicator = styled.span<{ $isDark: boolean }>`
  font-size: 13px;
  font-weight: 600;
  color: ${(p) => (p.$isDark ? "#94a3b8" : "#64748b")};
  min-width: 52px;
  text-align: center;
`;

const FilterAnuladas = styled.label<{ $isDark: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  font-size: 13px;
  font-weight: 500;
  color: ${(p) => (p.$isDark ? "#94a3b8" : "#475569")};
  white-space: nowrap;

  & > input[type="checkbox"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  & > span {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border: 1.5px solid ${(p) => (p.$isDark ? "#475569" : "#cbd5e1")};
    border-radius: 5px;
    background: ${(p) => (p.$isDark ? "rgba(255,255,255,0.04)" : "#f8fafc")};
    transition: all 0.15s ease;
    flex-shrink: 0;
    box-sizing: border-box;

    &::after {
      content: "";
      width: 4px;
      height: 8px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg) translateY(-1px);
      opacity: 0;
      transition: opacity 0.12s ease;
    }
  }

  &:hover > input ~ span {
    border-color: #155dfc;
  }

  & > input:checked ~ span {
    background-color: #155dfc;
    border-color: #155dfc;
  }

  & > input:checked ~ span::after {
    opacity: 1;
  }

  & > input:focus-visible ~ span {
    box-shadow: 0 0 0 3px rgba(21, 93, 252, 0.2);
  }
`;

const AppliedChangesContainer = styled.div<{
  $visible: boolean;
  $isDark: boolean;
}>`
  position: fixed;
  bottom: 28px;
  right: 28px;
  display: ${(p) => (p.$visible ? "flex" : "none")};
  flex-direction: column;
  gap: 12px;
  background-color: ${(p) =>
    p.$isDark ? "var(--bg-dark-header)" : "#ffffff"};
  border: 1px solid
    ${(p) =>
      p.$isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"};
  border-radius: 12px;
  padding: 18px 20px;
  box-shadow: ${(p) =>
    p.$isDark
      ? "0 8px 32px rgba(0,0,0,0.6)"
      : "0 8px 32px rgba(0,0,0,0.12)"};
  min-width: 240px;
  z-index: 100;
`;

const AppliedChangesHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const AppliedChangesText = styled.p<{ $isDark: boolean }>`
  font-size: 14px;
  color: ${(p) => (p.$isDark ? "#cbd5e1" : "#374151")};

  strong {
    color: ${(p) => (p.$isDark ? "#f1f5f9" : "#0f172a")};
  }
`;

const DashboardTitle = styled.h1`
  ${textTheme__css}
  font-size: clamp(20px, 2.2vw, 26px);
  font-weight: 700;
  letter-spacing: -0.3px;
`;

const DashboardText = styled.p<{ $theme: PreferedScheme }>`
  font-size: 14px;
  color: ${(p) => (p.$theme === "Dark" ? "#64748b" : "#64748b")};
`;

const SubscriptionBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.3);
`;

const BannerLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
`;

const BannerText = styled.p`
  font-size: 13px;
  font-weight: 500;
  color: #d97706;
  line-height: 1.4;
`;

const BannerAction = styled.button`
  flex-shrink: 0;
  padding: 6px 14px;
  border-radius: 8px;
  border: 1.5px solid rgba(245, 158, 11, 0.5);
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;

  &:hover {
    background: rgba(245, 158, 11, 0.18);
  }
`;

export { DashboardHeader, DashboardTitle, DashboardText, DashboardContainer };
export default Dashboard;
