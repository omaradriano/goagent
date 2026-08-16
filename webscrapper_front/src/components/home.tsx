import React from "react";
import styled, { keyframes } from "styled-components";
import { NavLink } from "react-router";

// ── Animations ──────────────────────────────────────────────────────────────
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ── Root wrapper ─────────────────────────────────────────────────────────────
const PageWrapper = styled.div`
  min-height: 100vh;
  background-color: #f2ede7;
  color: #1a1a1a;
  font-family: "SN Pro", sans-serif;
  overflow-x: hidden;
`;

// ── HERO ─────────────────────────────────────────────────────────────────────
const HeroSection = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 6rem 1.5rem 4rem;
  animation: ${fadeUp} 0.8s ease both;
`;

const Eyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: #1a1a1a;
  color: #f2ede7;
  padding: 0.35rem 0.9rem;
  border-radius: 999px;
  margin-bottom: 2rem;

  &::before {
    content: "";
    display: block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #6dba7f;
  }
`;

const HeroTitle = styled.h1`
  font-size: clamp(2.6rem, 6vw, 5.5rem);
  font-weight: 800;
  line-height: 1.08;
  letter-spacing: -0.03em;
  max-width: 860px;
  color: #1a1a1a;
  text-wrap: balance;
  margin-bottom: 1.5rem;
`;

const HeroSubtitle = styled.p`
  font-size: clamp(1rem, 2vw, 1.2rem);
  color: #5a5a5a;
  max-width: 520px;
  line-height: 1.65;
  margin-bottom: 2.5rem;
`;

const HeroCTAGroup = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PrimaryButton = styled(NavLink)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #1a1a1a;
  color: #f2ede7;
  padding: 0.85rem 2rem;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.82;
  }

  &::after {
    content: "→";
  }
`;

const SecondaryButton = styled(NavLink)`
  display: inline-flex;
  align-items: center;
  background: transparent;
  color: #1a1a1a;
  padding: 0.85rem 2rem;
  border-radius: 999px;
  border: 1.5px solid #1a1a1a;
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
  transition:
    background 0.2s,
    color 0.2s;

  &:hover {
    background: #1a1a1a;
    color: #f2ede7;
  }
`;

// ── HERO VISUAL PLACEHOLDER ───────────────────────────────────────────────────
const HeroVisual = styled.div`
  width: 100%;
  max-width: 900px;
  height: clamp(220px, 32vw, 420px);
  margin: 3rem auto 0;
  border-radius: 20px;
  background: #ddd5c8;
  border: 1px solid #c4bab0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
`;

const PlaceholderLabel = styled.span`
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #999;
`;

// ── STATS BAR ────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const StatsBar = styled.section`
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0;
  border-top: 1px solid #d4ccc4;
  border-bottom: 1px solid #d4ccc4;
  margin: 4rem 0;
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const StatItem = styled.div`
  flex: 1;
  min-width: 160px;
  padding: 2rem 2.5rem;
  text-align: center;
  border-right: 1px solid #d4ccc4;

  &:last-child {
    border-right: none;
  }

  @media (max-width: 600px) {
    border-right: none;
    border-bottom: 1px solid #d4ccc4;
    &:last-child {
      border-bottom: none;
    }
  }
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const StatNumber = styled.p`
  font-size: clamp(1.8rem, 3.5vw, 2.8rem);
  font-weight: 800;
  color: #1a1a1a;
  line-height: 1;
  margin-bottom: 0.35rem;
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const StatLabel = styled.p`
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #888;
`;

// ── FEATURES ─────────────────────────────────────────────────────────────────
const FeaturesSection = styled.section`
  max-width: 1100px;
  margin: 0 auto;
  padding: 4rem 1.5rem;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 3rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const SectionTitle = styled.h2`
  font-size: clamp(1.8rem, 3.5vw, 2.8rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #1a1a1a;
  max-width: 420px;
  text-wrap: balance;
`;

const SectionLink = styled(NavLink)`
  font-size: 0.85rem;
  font-weight: 600;
  color: #1a1a1a;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  opacity: 0.6;
  transition: opacity 0.2s;
  white-space: nowrap;

  &:hover {
    opacity: 1;
  }
  &::after {
    content: "→";
  }
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const FeatureCard = styled.div<{ $accent?: string }>`
  background: #e8e1d9;
  border: 1px solid #d4ccc4;
  border-radius: 16px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition:
    transform 0.2s,
    box-shadow 0.2s;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.07);
  }
`;

const FeatureIcon = styled.div<{ $bg: string }>`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: ${(p) => p.$bg};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
`;

const FeatureName = styled.h3`
  font-size: 1rem;
  font-weight: 700;
  color: #1a1a1a;
`;

const FeatureDesc = styled.p`
  font-size: 0.875rem;
  color: #6b6b6b;
  line-height: 1.6;
`;

// ── HOW IT WORKS ─────────────────────────────────────────────────────────────
const HowSection = styled.section`
  background: #1a1a1a;
  color: #f2ede7;
  padding: 5rem 1.5rem;
`;

const HowInner = styled.div`
  max-width: 1100px;
  margin: 0 auto;
`;

const HowTitle = styled.h2`
  font-size: clamp(1.8rem, 3.5vw, 2.8rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 3rem;
  text-wrap: balance;
`;

const StepsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Step = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const StepNumber = styled.span`
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #6dba7f;
  text-transform: uppercase;
`;

const StepTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  color: #f2ede7;
`;

const StepDesc = styled.p`
  font-size: 0.875rem;
  color: #999;
  line-height: 1.65;
`;

const StepDivider = styled.div`
  height: 1px;
  background: #333;
  margin-top: 0.5rem;
`;

// ── TESTIMONIAL / QUOTE ───────────────────────────────────────────────────────
const QuoteSection = styled.section`
  max-width: 800px;
  margin: 0 auto;
  padding: 5rem 1.5rem;
  text-align: center;
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const QuoteText = styled.blockquote`
  font-size: clamp(1.4rem, 3vw, 2.2rem);
  font-weight: 700;
  line-height: 1.4;
  color: #1a1a1a;
  letter-spacing: -0.02em;
  margin-bottom: 2rem;
  text-wrap: balance;
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const QuoteAuthor = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Avatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #d4ccc4;
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const AuthorInfo = styled.div`
  text-align: left;
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const AuthorName = styled.p`
  font-size: 0.875rem;
  font-weight: 700;
  color: #1a1a1a;
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const AuthorRole = styled.p`
  font-size: 0.78rem;
  color: #888;
`;

// ── CTA BANNER ────────────────────────────────────────────────────────────────
const CTASection = styled.section`
  background: #1a1a1a;
  color: #f2ede7;
  margin: 0 1.5rem 4rem;
  border-radius: 20px;
  padding: 4rem 3rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;

  @media (max-width: 600px) {
    padding: 3rem 1.5rem;
    margin: 0 0.75rem 3rem;
  }
`;

const CTATitle = styled.h2`
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  text-wrap: balance;
`;

const CTASubtitle = styled.p`
  font-size: 1rem;
  color: #aaa;
  max-width: 440px;
  line-height: 1.65;
`;

const CTAButton = styled(NavLink)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #f2ede7;
  color: #1a1a1a;
  padding: 0.9rem 2.2rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.95rem;
  text-decoration: none;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.85;
  }
  &::after {
    content: "→";
  }
`;

// ── FOOTER ────────────────────────────────────────────────────────────────────
const Footer = styled.footer`
  border-top: 1px solid #d4ccc4;
  padding: 2.5rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  max-width: 1100px;
  margin: 0 auto;
`;

const FooterBrand = styled.p`
  font-size: 0.875rem;
  font-weight: 700;
  color: #1a1a1a;
`;

const FooterLinks = styled.div`
  display: flex;
  gap: 1.5rem;
`;

const FooterLink = styled(NavLink)`
  font-size: 0.8rem;
  color: #888;
  text-decoration: none;
  transition: color 0.2s;
  &:hover {
    color: #1a1a1a;
  }
`;

const FooterCopy = styled.p`
  font-size: 0.78rem;
  color: #bbb;
  width: 100%;
`;

// ── FEATURES DATA ─────────────────────────────────────────────────────────────
const features = [
  {
    icon: "📋",
    bg: "#d4e9da",
    name: "Captura de polizas",
    desc: "Migra todos tus datos en minutos a nuestra plataforma gracias a nuestra extensión de navegador",
  },
  {
    icon: "⚡",
    bg: "#fde9c8",
    name: "Cálculo automático de tus siguientes pagos",
    desc: "Gracias a nuestra lógica interna tienes la capacidad de re calcular el siguiente pago de manera automática",
  },
  {
    icon: "🔒",
    bg: "#ddd5c8",
    name: "Calendario de cumpleaños",
    desc: "Un calendario diseñados para festejar a tus clientes",
  },
  // {
  //   icon: "📊",
  //   bg: "#d4e9da",
  //   name: "Funcionalidad D",
  //   desc: "Breve descripción de la cuarta funcionalidad principal de tu plataforma.",
  // },
  // {
  //   icon: "🔔",
  //   bg: "#fde9c8",
  //   name: "Funcionalidad E",
  //   desc: "Breve descripción de la quinta funcionalidad principal de tu plataforma.",
  // },
  // {
  //   icon: "🤝",
  //   bg: "#ddd5c8",
  //   name: "Funcionalidad F",
  //   desc: "Breve descripción de la sexta funcionalidad principal de tu plataforma.",
  // },
];

const steps = [
  {
    num: "Paso 01",
    title: "Uso de la extensión",
    desc: "Usa nuestra extensión GoAgent para migrar tus datos de la plataforma original.",
  },
  {
    num: "Paso 02",
    title: "Comienza a usar tu plataforma",
    desc: "Y listo!, ya puedes verificar el estado de tus polizas :)",
  },
  // {
  //   num: "Paso 03",
  //   title: "Tercer paso",
  //   desc: "Descripción del resultado o acción final que completa el proceso.",
  // },
];

// ── COMPONENT ─────────────────────────────────────────────────────────────────
const Home: React.FC = () => {
  return (
    <PageWrapper>
      {/* HERO */}
      <HeroSection>
        <Eyebrow>Nuevo · Plataforma disponible</Eyebrow>
        <HeroTitle>Nada como GoAgent</HeroTitle>
        <HeroSubtitle>
          Con nuestra plataforma puedes llevar un control de todas tus polizas y
          pagos pendientes sin tener que preocuparte de comenzar de cero.
        </HeroSubtitle>
        <HeroCTAGroup>
          <PrimaryButton to="/auth/register">Registrate gratis</PrimaryButton>
          <SecondaryButton to="/auth/signin">Iniciar sesión</SecondaryButton>
        </HeroCTAGroup>
        <HeroVisual>
          <PlaceholderLabel>
            Captura de pantalla / imagen del producto
          </PlaceholderLabel>
        </HeroVisual>
      </HeroSection>

      {/* STATS */}
      {/* <StatsBar>
        <StatItem>
          <StatNumber>+1.000</StatNumber>
          <StatLabel>Métrica clave A</StatLabel>
        </StatItem>
        <StatItem>
          <StatNumber>98%</StatNumber>
          <StatLabel>Métrica clave B</StatLabel>
        </StatItem>
        <StatItem>
          <StatNumber>24/7</StatNumber>
          <StatLabel>Métrica clave C</StatLabel>
        </StatItem>
        <StatItem>
          <StatNumber>+500</StatNumber>
          <StatLabel>Métrica clave D</StatLabel>
        </StatItem>
      </StatsBar> */}

      {/* FEATURES */}
      <FeaturesSection>
        <SectionHeader>
          <SectionTitle>¿Qué incluye la plataforma?</SectionTitle>
          <SectionLink to="/auth/register">Ver todas las funciones</SectionLink>
        </SectionHeader>
        <FeaturesGrid>
          {features.map((f) => (
            <FeatureCard key={f.name}>
              <FeatureIcon $bg={f.bg}>{f.icon}</FeatureIcon>
              <FeatureName>{f.name}</FeatureName>
              <FeatureDesc>{f.desc}</FeatureDesc>
            </FeatureCard>
          ))}
        </FeaturesGrid>
      </FeaturesSection>

      {/* HOW IT WORKS */}
      <HowSection>
        <HowInner>
          <HowTitle>¿Cómo funciona?</HowTitle>
          <StepsGrid>
            {steps.map((s) => (
              <Step key={s.num}>
                <StepNumber>{s.num}</StepNumber>
                <StepDivider />
                <StepTitle>{s.title}</StepTitle>
                <StepDesc>{s.desc}</StepDesc>
              </Step>
            ))}
          </StepsGrid>
        </HowInner>
      </HowSection>

      {/* TESTIMONIAL */}
      <QuoteSection>
        {/* <QuoteText>
          &ldquo;Esta plataforma transformó completamente la manera en que gestionamos
          nuestro trabajo. Resultados increíbles desde el primer día.&rdquo;
        </QuoteText>
        <QuoteAuthor>
          <Avatar />
          <AuthorInfo>
            <AuthorName>Nombre del cliente</AuthorName>
            <AuthorRole>Cargo · Empresa</AuthorRole>
          </AuthorInfo>
        </QuoteAuthor> */}
      </QuoteSection>

      {/* CTA BANNER */}
      <CTASection>
        <CTATitle>¿Listo para empezar?</CTATitle>
        <CTASubtitle>
          Únete hoy y descubre todo lo que la plataforma tiene para ofrecer. Sin
          tarjeta de crédito requerida.
        </CTASubtitle>
        <CTAButton to="/auth/register">Crear cuenta gratuita</CTAButton>
      </CTASection>

      {/* FOOTER */}
      <Footer>
        <FooterBrand>Tu Marca</FooterBrand>
        <FooterLinks>
          <FooterLink to="/privacy">Privacidad</FooterLink>
          <FooterLink to="/auth/signin">Iniciar sesión</FooterLink>
          <FooterLink to="/auth/register">Registro</FooterLink>
        </FooterLinks>
        <FooterCopy>
          © 2026 Tu Empresa. Todos los derechos reservados.
        </FooterCopy>
      </Footer>
    </PageWrapper>
  );
};

export default Home;
