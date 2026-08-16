import React, { useContext, useState } from "react";
import styled, { keyframes } from "styled-components";
import { NavLink, useNavigate } from "react-router";
import Icon from "./icon";
import {
  textTheme__css,
  sectionTheme__css,
  sectionBorderTheme__css,
  MayorText,
} from "../styles/CssComponents";
import { AuthContext, SubscriptionContext } from "../Context/ContextConfig";

// ── Animations ───────────────────────────────────────────────────────────────
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ── Wrappers ─────────────────────────────────────────────────────────────────
const PageWrapper = styled.div`
  min-height: 100vh;
  padding: 3rem 1.5rem 6rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: ${fadeUp} 0.6s ease both;
`;

const PageHeader = styled.div`
  text-align: center;
  max-width: 560px;
  margin-bottom: 3.5rem;
`;

const Eyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #155dfc;
  background: rgba(21, 93, 252, 0.1);
  border: 1px solid rgba(21, 93, 252, 0.2);
  padding: 0.3rem 0.85rem;
  border-radius: 999px;
  margin-bottom: 1.25rem;
`;

const Title = styled.h1`
  ${textTheme__css}
  font-size: clamp(2rem, 4.5vw, 3rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.1;
  margin-bottom: 0.9rem;
  text-wrap: balance;
`;

const Subtitle = styled.p`
  font-size: 1rem;
  color: #888;
  line-height: 1.7;
`;

// ── Card ─────────────────────────────────────────────────────────────────────
const CardWrapper = styled.div`
  width: 100%;
  max-width: 420px;
`;

const PlanCard = styled.div`
  ${sectionTheme__css}
  ${sectionBorderTheme__css}
  border-radius: 20px;
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: #155dfc;
    border-radius: 20px 20px 0 0;
  }
`;

const PopularBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: #155dfc;
  color: #fff;
  padding: 0.28rem 0.75rem;
  border-radius: 999px;
  width: fit-content;
  margin-bottom: 1.25rem;
`;

const PlanName = styled.h2`
  ${textTheme__css}
  font-size: 1.3rem;
  font-weight: 700;
  margin-bottom: 0.35rem;
`;

const PlanDesc = styled.p`
  font-size: 0.875rem;
  color: #888;
  line-height: 1.6;
  margin-bottom: 1.75rem;
`;

const PriceRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 0.25rem;
  margin-bottom: 0.4rem;
`;

const PriceCurrency = styled.span`
  ${textTheme__css}
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 0.3rem;
`;

const PriceAmount = styled.span`
  ${textTheme__css}
  font-size: 3.5rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
`;

const PricePeriod = styled.span`
  font-size: 0.85rem;
  color: #888;
  margin-bottom: 0.4rem;
`;

const PricingNote = styled.p`
  font-size: 0.78rem;
  color: #aaa;
  margin-bottom: 2rem;
`;

const Divider = styled.div`
  height: 1px;
  background: ${(p) =>
    p.theme.mode === "Dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"};
  margin: 1.5rem 0;
`;

const FeaturesList = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin-bottom: 2rem;
`;

const FeatureItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  font-size: 0.9rem;
  ${textTheme__css}
`;

const CheckIcon = styled.span`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(21, 93, 252, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
`;

const CheckoutButton = styled.button`
  width: 100%;
  padding: 0.95rem 1.5rem;
  border-radius: 12px;
  border: none;
  background: #155dfc;
  color: #fff;
  font-size: 0.975rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition:
    opacity 0.2s,
    transform 0.15s;

  &:hover {
    opacity: 0.88;
    transform: translateY(-1px);
  }
  &:active {
    transform: translateY(0);
  }
`;

const CancelledNotice = styled.div`
  width: 100%;
  padding: 0.95rem 1.5rem;
  border-radius: 12px;
  border: 1.5px solid rgba(245, 158, 11, 0.3);
  background: rgba(245, 158, 11, 0.07);
  color: #d97706;
  font-size: 0.9rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  text-align: center;
`;

const AlreadySubscribed = styled.div`
  width: 100%;
  padding: 0.95rem 1.5rem;
  border-radius: 12px;
  border: 1.5px solid rgba(21, 93, 252, 0.3);
  background: rgba(21, 93, 252, 0.06);
  color: #155dfc;
  font-size: 0.95rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

// ── Trust strip ──────────────────────────────────────────────────────────────
const TrustStrip = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1.25rem;
  font-size: 0.78rem;
  color: #aaa;
`;

// ── FAQ ──────────────────────────────────────────────────────────────────────
const FAQSection = styled.div`
  width: 100%;
  max-width: 560px;
  margin-top: 4rem;
`;

const FAQTitle = styled.h3`
  ${textTheme__css}
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  text-align: center;
`;

const FAQItem = styled.div`
  ${sectionTheme__css}
  ${sectionBorderTheme__css}
  border-radius: 12px;
  padding: 1.1rem 1.25rem;
  margin-bottom: 0.75rem;
`;

const FAQQuestion = styled.p`
  ${textTheme__css}
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.4rem;
`;

const FAQAnswer = styled.p`
  font-size: 0.85rem;
  color: #888;
  line-height: 1.65;
`;

// ── Back link ────────────────────────────────────────────────────────────────
const BackLink = styled(NavLink)`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 500;
  color: #888;
  text-decoration: none;
  margin-bottom: 2.5rem;
  transition: color 0.18s;
  align-self: flex-start;

  &:hover {
    color: #155dfc;
  }
`;

// ── Feature data ─────────────────────────────────────────────────────────────
const FEATURES = [
  "Captura ilimitada de pólizas vía extensión",
  "Cálculo automático de próximos pagos",
  "Calendario de cumpleaños de asegurados",
  "Dashboard con estadísticas en tiempo real",
  "Acceso desde cualquier dispositivo",
  "Soporte prioritario por correo",
];

const FAQ_ITEMS = [
  {
    q: "¿Puedo cancelar en cualquier momento?",
    a: "Sí. Puedes cancelar tu suscripción cuando quieras desde la configuración de tu cuenta. No hay penalizaciones ni cargos adicionales.",
  },
  {
    q: "¿Qué métodos de pago aceptan?",
    a: "Aceptamos tarjetas de crédito y débito (Visa, Mastercard, American Express) a través de Stripe, la pasarela de pago más segura del mercado.",
  },
  {
    q: "¿Mis datos están seguros?",
    a: "Absolutamente. Todos los pagos son procesados por Stripe bajo estándar PCI DSS. GoAgent nunca almacena datos de tarjetas.",
  },
  {
    q: "¿Hay periodo de prueba?",
    a: "Por el momento no ofrecemos periodo de prueba, pero puedes crear una cuenta gratuita y explorar la plataforma antes de suscribirte.",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
const Pricing: React.FC = () => {
  const subscription = useContext(SubscriptionContext);
  const isSubscribed = subscription?.isSubscribed ?? false;
  const periodEnd = subscription?.periodEnd ?? null;

  // Estados para controlar el flujo de la petición
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const auth = useContext(AuthContext)
  const navigate = useNavigate()

  const handleCheckout = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const session_token = localStorage.getItem("session_jwt");
      if (!session_token) {
        auth?.setIsAuthenticated(false);
        navigate("/home");
        return null;
      }

      const response = await fetch(`${import.meta.env.VITE_API_SERVER_URL}/v1/api/create_suscription_payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session_token}`,
        },
        body: JSON.stringify({
          amount: 19900,
          currency: 'mxn',
          description: 'Descripción para pago mensual jeje'
        }),
      });

      const data = await response.json();

      console.log(data);

      if (response.ok && data.payload.url) {
        // Redirección inmediata a la pasarela segura de Stripe
        window.location.href = data.payload.url;
      } else {
        setErrorMessage(
          data.message ||
            "No se pudo iniciar el proceso de pago. Inténtalo de nuevo.",
        );
        setLoading(false);
      }
    } catch (error) {
      console.error("Error al conectar con el servidor de pagos:", error);
      setErrorMessage("Hubo un problema de conexión con el servidor.");
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      <BackLink to="/home">
        <Icon iconName="ArrowBack" size={16} />
        Volver al inicio
      </BackLink>

      {/* Header */}
      <PageHeader>
        <Eyebrow>
          <Icon iconName="CreditCard" size={12} />
          Planes y precios
        </Eyebrow>
        <Title>Una sola suscripción, todo incluido</Title>
        <Subtitle>
          Sin costos ocultos. Sin límites artificiales. Todo lo que necesitas
          para gestionar tus pólizas en un solo plan.
        </Subtitle>
      </PageHeader>

      {/* Card */}
      <CardWrapper>
        <PlanCard>
          <PopularBadge>
            <Icon iconName="Star" size={10} />
            Plan Profesional
          </PopularBadge>

          <PlanName>GoAgent Pro</PlanName>
          <PlanDesc>
            Acceso completo a todas las funciones de la plataforma. Ideal para
            agentes de seguros que buscan eficiencia y control total.
          </PlanDesc>

          <PriceRow>
            <PriceCurrency>$</PriceCurrency>
            <PriceAmount>199</PriceAmount>
            <PricePeriod>/ mes</PricePeriod>
          </PriceRow>
          <PricingNote>
            Facturado mensualmente · Cancela cuando quieras
          </PricingNote>

          <Divider />

          <MayorText
            style={{
              fontSize: "0.8rem",
              marginBottom: "0.75rem",
              color: "#888",
            }}
          >
            Incluye:
          </MayorText>
          <FeaturesList>
            {FEATURES.map((f) => (
              <FeatureItem key={f}>
                <CheckIcon>
                  <Icon iconName="Check" size={12} customColor="#155dfc" />
                </CheckIcon>
                {f}
              </FeatureItem>
            ))}
          </FeaturesList>

          {/* Mostrar mensaje de error si la API de Go falla */}
          {errorMessage && (
            <div
              style={{
                color: "#ef4444",
                fontSize: "0.85rem",
                marginBottom: "1rem",
                textAlign: "center",
              }}
            >
              {errorMessage}
            </div>
          )}

          {isSubscribed ? (
            periodEnd ? (
              <CancelledNotice>
                <Icon iconName="EventBusy" size={18} customColor="#f59e0b" />
                Acceso activo hasta el {periodEnd}
              </CancelledNotice>
            ) : (
              <AlreadySubscribed>
                <Icon iconName="CheckCircle" size={18} />
                Suscripción activa
              </AlreadySubscribed>
            )
          ) : (
            <CheckoutButton onClick={handleCheckout} disabled={loading}>
              <Icon iconName="CreditCard" size={18} customColor="#fff" />
              {loading ? "Redirigiendo a Stripe..." : "Suscribirme ahora"}
            </CheckoutButton>
          )}
        </PlanCard>

        <TrustStrip>
          <Icon iconName="Lock" size={13} />
          Pago seguro con Stripe · PCI DSS Compliant
        </TrustStrip>
      </CardWrapper>

      {/* FAQ */}
      <FAQSection>
        <FAQTitle>Preguntas frecuentes</FAQTitle>
        {FAQ_ITEMS.map((item) => (
          <FAQItem key={item.q}>
            <FAQQuestion>{item.q}</FAQQuestion>
            <FAQAnswer>{item.a}</FAQAnswer>
          </FAQItem>
        ))}
      </FAQSection>
    </PageWrapper>
  );
};

export default Pricing;
