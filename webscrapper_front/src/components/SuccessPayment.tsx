import React, { useContext } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router";
import { ThemeContext, type PreferedScheme } from "../Context/ContextConfig";

const SuccessPayment: React.FC = () => {
  const theme = useContext(ThemeContext);
  const navigate = useNavigate();

  return (
    <AuthWrapper $theme={theme?.theme as PreferedScheme}>
      {/* Panel izquierdo */}
      <BrandPanel>
        <BrandContent>
          <BrandLogoMark />
          <BrandHeadline>Gestiona tus pólizas con confianza</BrandHeadline>
          <BrandBody>
            Plataforma web para asesores de seguros. Visualiza, filtra y
            gestiona el estado de tus pólizas en un solo lugar.
          </BrandBody>
          <BrandPillsRow>
            <BrandPill>Pólizas activas</BrandPill>
            <BrandPill>Vencimientos</BrandPill>
            <BrandPill>Cobranza</BrandPill>
          </BrandPillsRow>
        </BrandContent>
        <BrandPattern aria-hidden="true" />
      </BrandPanel>

      {/* Panel derecho */}
      <FormPanel $theme={theme?.theme as PreferedScheme}>
        <FormCard $theme={theme?.theme as PreferedScheme}>
          <IconWrapper>
            <CheckCircle>✓</CheckCircle>
          </IconWrapper>

          <FormHeader>
            <FormTitle $theme={theme?.theme as PreferedScheme}>
              ¡Pago completado!
            </FormTitle>
            <FormSubtitle>Tu suscripción ya está activa</FormSubtitle>
          </FormHeader>

          <StatusMessage>
            Tu suscripción a GoAgent Pro ha sido registrada con éxito. Ya
            tienes acceso completo a todas las funciones de la plataforma.
          </StatusMessage>

          <DashboardButton onClick={() => navigate("/dashboard")}>
            Ir al dashboard
          </DashboardButton>
        </FormCard>
      </FormPanel>
    </AuthWrapper>
  );
};

// ── Estilos ───────────────────────────────────────────────────────────────────

const AuthWrapper = styled.div<{ $theme: PreferedScheme }>`
  display: flex;
  min-height: calc(100vh - 60px);
  width: 100%;
  background-color: ${(p) =>
    p.$theme === "Dark" ? "var(--bg-dark-body)" : "var(--bg-light-body)"};
`;

const BrandPanel = styled.div`
  display: none;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #0f2049 0%, #155dfc 100%);

  @media (min-width: 900px) {
    display: flex;
    flex: 0 0 42%;
    flex-direction: column;
    justify-content: center;
    padding: 60px 52px;
  }
`;

const BrandContent = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const BrandLogoMark = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.2);
  border: 1.5px solid rgba(255, 255, 255, 0.35);
`;

const BrandHeadline = styled.h1`
  font-size: clamp(22px, 2.4vw, 32px);
  font-weight: 700;
  color: #fff;
  line-height: 1.3;
  letter-spacing: -0.3px;
`;

const BrandBody = styled.p`
  font-size: 15px;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.65;
  max-width: 360px;
`;

const BrandPillsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
`;

const BrandPill = styled.span`
  padding: 5px 14px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.22);
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 500;
`;

const BrandPattern = styled.div`
  position: absolute;
  bottom: -80px;
  right: -80px;
  width: 340px;
  height: 340px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.07) 0%,
    transparent 70%
  );
  pointer-events: none;
  z-index: 1;
`;

const FormPanel = styled.div<{ $theme: PreferedScheme }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  background-color: ${(p) =>
    p.$theme === "Dark" ? "var(--bg-dark-body)" : "var(--bg-light-body)"};
`;

const FormCard = styled.div<{ $theme: PreferedScheme }>`
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background-color: ${(p) =>
    p.$theme === "Dark" ? "var(--bg-dark-header)" : "#ffffff"};
  border: 1px solid
    ${(p) =>
      p.$theme === "Dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"};
  border-radius: 16px;
  padding: 40px 36px;
  box-shadow: ${(p) =>
    p.$theme === "Dark"
      ? "0 4px 32px rgba(0,0,0,0.5)"
      : "0 4px 32px rgba(0,0,0,0.08)"};
`;

const IconWrapper = styled.div`
  display: flex;
  justify-content: center;
`;

const CheckCircle = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(34, 197, 94, 0.12);
  border: 1.5px solid rgba(34, 197, 94, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #22c55e;
  font-weight: 700;
`;

const FormHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: center;
`;

const FormTitle = styled.h2<{ $theme: PreferedScheme }>`
  font-size: 22px;
  font-weight: 700;
  color: ${(p) => (p.$theme === "Dark" ? "#f1f5f9" : "#0f1720")};
  letter-spacing: -0.2px;
`;

const FormSubtitle = styled.p`
  font-size: 14px;
  color: #8a9ab0;
`;

const StatusMessage = styled.p`
  font-size: 15px;
  line-height: 1.6;
  padding: 14px 16px;
  border-radius: 10px;
  background-color: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.25);
  color: #16a34a;
  text-align: center;
`;

const DashboardButton = styled.button`
  width: 100%;
  padding: 0.9rem 1.5rem;
  border-radius: 12px;
  border: none;
  background: #155dfc;
  color: #fff;
  font-size: 0.975rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;

  &:hover {
    opacity: 0.88;
    transform: translateY(-1px);
  }
  &:active {
    transform: translateY(0);
  }
`;

export default SuccessPayment;
