import React, { useContext, useState, useEffect } from "react";
import styled from "styled-components";
import { ThemeContext } from "../Context/ContextConfig";
import type { PreferedScheme } from "../Context/ContextConfig";
import {
  textTheme__css,
  sectionTheme__css,
  sectionBorderTheme__css,
} from "../styles/CssComponents";

const sections = [
  { id: "responsable", label: "1. Responsable" },
  { id: "datos", label: "2. Datos Recolectados" },
  { id: "finalidad", label: "3. Finalidad" },
  { id: "seguridad", label: "4. Seguridad" },
  { id: "transferencia", label: "5. Transferencia" },
  { id: "derechos", label: "6. Derechos ARCO" },
  { id: "cambios", label: "7. Cambios" },
];

const PrivacyPolicy: React.FC = () => {
  const themeCtx = useContext(ThemeContext);
  const theme = (themeCtx?.theme as PreferedScheme) ?? "Dark";
  const [activeId, setActiveId] = useState<string>("responsable");

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(id);
        },
        { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <PageWrapper $theme={theme}>
      <Header $theme={theme}>
        <HeaderInner>
          <Tag $theme={theme}>Aviso de Privacidad</Tag>
          <Title $theme={theme}>Privacidad &amp; Datos</Title>
          <Subtitle $theme={theme}>
            Ultima actualizacion: 25 de Mayo de 2026
          </Subtitle>
        </HeaderInner>
      </Header>

      <Body>
        <Sidebar>
          <SidebarInner>
            <SidebarLabel $theme={theme}>Contenido</SidebarLabel>
            <NavList>
              {sections.map(({ id, label }) => (
                <NavItem
                  key={id}
                  $active={activeId === id}
                  $theme={theme}
                  onClick={() => scrollTo(id)}
                >
                  <NavDot $active={activeId === id} $theme={theme} />
                  {label}
                </NavItem>
              ))}
            </NavList>
          </SidebarInner>
        </Sidebar>

        <Content>
          <Intro $theme={theme}>
            En GoAgent (en adelante, "Nosotros" o "el Sitio"), accesible a
            traves de la direccion web{" "}
            <Anchor href="https://www.goagent.com.mx" $theme={theme}>
              https://www.goagent.com.mx
            </Anchor>
            , nos tomamos muy en serio la seguridad y la privacidad de sus
            datos. Este Aviso de Privacidad describe como recolectamos,
            utilizamos, almacenamos y protegemos la informacion de los agentes
            de seguros y usuarios que utilizan nuestra plataforma web y nuestra
            extension oficial de Google Chrome.
          </Intro>

          <Section id="responsable">
            <SectionNumber $theme={theme}>01</SectionNumber>
            <SectionTitle $theme={theme}>
              Responsable del Tratamiento de los Datos
            </SectionTitle>
            <Divider $theme={theme} />
            <Paragraph $theme={theme}>
              El responsable de la recoleccion y tratamiento de sus datos
              personales es GoAgent, con domicilio de contacto en Chihuahua,
              Chihuahua, Mexico y correo electronico de soporte:{" "}
              <Anchor href="mailto:oadriandev@gmail.com" $theme={theme}>
                oadriandev@gmail.com
              </Anchor>
              .
            </Paragraph>
          </Section>

          <Section id="datos">
            <SectionNumber $theme={theme}>02</SectionNumber>
            <SectionTitle $theme={theme}>
              Datos Personales que Recolectamos
            </SectionTitle>
            <Divider $theme={theme} />
            <Paragraph $theme={theme}>
              Para ofrecer las funciones de automatizacion y gestion de
              cobranza, GoAgent procesa los siguientes datos, divididos segun
              su origen:
            </Paragraph>
            <ItemGrid>
              <ItemCard $theme={theme}>
                <ItemCardLabel $theme={theme}>
                  Datos de Cuenta
                </ItemCardLabel>
                <ItemCardSub $theme={theme}>Plataforma Web</ItemCardSub>
                <Paragraph $theme={theme}>
                  Nombre completo del agente, direccion de correo electronico,
                  credenciales de acceso cifradas, y datos de facturacion en
                  caso de suscripciones de pago.
                </Paragraph>
              </ItemCard>
              <ItemCard $theme={theme}>
                <ItemCardLabel $theme={theme}>
                  Datos de Operacion
                </ItemCardLabel>
                <ItemCardSub $theme={theme}>Extension de Chrome</ItemCardSub>
                <Paragraph $theme={theme}>
                  Numero de poliza, nombre del asegurado, vigencia, montos de
                  prima, estatus de pago y fechas de corte, procesados bajo la
                  accion explicita del usuario.
                </Paragraph>
              </ItemCard>
            </ItemGrid>
            <Notice $theme={theme}>
              <NoticeIcon>&#9432;</NoticeIcon>
              <span>
                Declaracion de Proposito Unico (Chrome Web Store): La
                extension lee la informacion de las polizas unicamente bajo
                accion explicita del usuario. No almacenamos las contrasenas
                de acceso a los portales de las aseguradoras.
              </span>
            </Notice>
          </Section>

          <Section id="finalidad">
            <SectionNumber $theme={theme}>03</SectionNumber>
            <SectionTitle $theme={theme}>
              Finalidad del Tratamiento de los Datos
            </SectionTitle>
            <Divider $theme={theme} />
            <Paragraph $theme={theme}>
              Los datos recolectados se utilizan estrictamente para las
              siguientes finalidades necesarias para el servicio:
            </Paragraph>
            <OrderedList $theme={theme}>
              <li>
                Centralizar, organizar y mostrar el estatus de la cartera de
                polizas en el Dashboard de GoAgent.
              </li>
              <li>
                Generar alertas automaticas de recordatorios de corte de
                polizas y vencimientos de cobranza.
              </li>
              <li>
                Proporcionar soporte tecnico y resolver incidencias del
                servicio.
              </li>
              <li>
                Mejorar las funciones de la plataforma mediante estadisticas
                de uso agregadas y anonimas.
              </li>
            </OrderedList>
          </Section>

          <Section id="seguridad">
            <SectionNumber $theme={theme}>04</SectionNumber>
            <SectionTitle $theme={theme}>
              Seguridad y Almacenamiento Tecnologico
            </SectionTitle>
            <Divider $theme={theme} />
            <Paragraph $theme={theme}>
              Implementamos medidas de seguridad tecnicas, administrativas y
              fisicas para proteger su informacion:
            </Paragraph>
            <SecurityGrid>
              <SecurityItem $theme={theme}>
                <SecurityItemTitle $theme={theme}>
                  Encriptacion en Transito
                </SecurityItemTitle>
                <Paragraph $theme={theme}>
                  Toda la comunicacion viaja cifrada mediante protocolos
                  HTTPS / SSL.
                </Paragraph>
              </SecurityItem>
              <SecurityItem $theme={theme}>
                <SecurityItemTitle $theme={theme}>
                  Autenticacion Segura
                </SecurityItemTitle>
                <Paragraph $theme={theme}>
                  El acceso a la API esta protegido mediante tokens de sesion
                  firmados digitalmente (JWT).
                </Paragraph>
              </SecurityItem>
              <SecurityItem $theme={theme}>
                <SecurityItemTitle $theme={theme}>
                  Infraestructura en la Nube
                </SecurityItemTitle>
                <Paragraph $theme={theme}>
                  Los datos se almacenan en servidores con altos estandares
                  de seguridad y cifrado de datos en reposo.
                </Paragraph>
              </SecurityItem>
            </SecurityGrid>
          </Section>

          <Section id="transferencia">
            <SectionNumber $theme={theme}>05</SectionNumber>
            <SectionTitle $theme={theme}>
              Transferencia de Datos
            </SectionTitle>
            <Divider $theme={theme} />
            <Paragraph $theme={theme}>
              GoAgent no vende, no alquila, no comercializa ni transfiere sus
              datos personales ni la informacion de sus polizas a terceros
              bajo ninguna circunstancia. La informacion solo es procesada
              internamente por las herramientas de infraestructura necesarias
              para mantener el servicio activo.
            </Paragraph>
          </Section>

          <Section id="derechos">
            <SectionNumber $theme={theme}>06</SectionNumber>
            <SectionTitle $theme={theme}>
              Derechos ARCO
            </SectionTitle>
            <Divider $theme={theme} />
            <Paragraph $theme={theme}>
              Como titular de sus datos, usted tiene derecho a conocer que
              datos tenemos de usted, solicitar correcciones (Rectificacion),
              pedir que los eliminemos de nuestros servidores (Cancelacion) u
              oponerse al uso de los mismos para fines especificos.
            </Paragraph>
            <Paragraph $theme={theme}>
              Para ejercer cualquiera de estos derechos, o solicitar la baja
              definitiva de su cuenta y el borrado de todo su historico de
              polizas, puede enviar una solicitud formal por correo electronico
              a:{" "}
              <Anchor href="mailto:oadriandev@gmail.com" $theme={theme}>
                oadriandev@gmail.com
              </Anchor>
              . Su solicitud sera procesada en un plazo maximo de 5 dias
              habiles.
            </Paragraph>
          </Section>

          <Section id="cambios">
            <SectionNumber $theme={theme}>07</SectionNumber>
            <SectionTitle $theme={theme}>
              Cambios al Aviso de Privacidad
            </SectionTitle>
            <Divider $theme={theme} />
            <Paragraph $theme={theme}>
              Nos reservamos el derecho de modificar este aviso en cualquier
              momento para adaptarlo a novedades legislativas o mejoras en
              nuestra extension. Cualquier cambio sera publicado en esta misma
              seccion web con su respectiva fecha de actualizacion.
            </Paragraph>
          </Section>
        </Content>
      </Body>
    </PageWrapper>
  );
};

// ─── Styled Components ────────────────────────────────────────────────────────

const PageWrapper = styled.div<{ $theme: PreferedScheme }>`
  min-height: 100vh;
  ${textTheme__css}
`;

const Header = styled.header<{ $theme: PreferedScheme }>`
  ${sectionTheme__css}
  ${sectionBorderTheme__css}
  border-top: none;
  border-left: none;
  border-right: none;
  padding: 48px 8vw 40px;
`;

const HeaderInner = styled.div`
  max-width: 900px;
`;

const Tag = styled.span<{ $theme: PreferedScheme }>`
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--sc-warning-color-defaultBlue);
  background-color: ${({ $theme }) =>
    $theme === "Dark" ? "rgba(21, 93, 252, 0.12)" : "rgba(21, 93, 252, 0.08)"};
  border: 1px solid rgba(21, 93, 252, 0.25);
  border-radius: 4px;
  padding: 3px 10px;
  margin-bottom: 16px;
`;

const Title = styled.h1<{ $theme: PreferedScheme }>`
  font-size: clamp(28px, 4vw, 48px);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: ${({ $theme }) => ($theme === "Dark" ? "#fff" : "#0f1720")};
  margin-bottom: 10px;
`;

const Subtitle = styled.p<{ $theme: PreferedScheme }>`
  font-size: 14px;
  color: #a9a9a9;
`;

const Body = styled.div`
  display: flex;
  align-items: flex-start;
  max-width: 1200px;
  margin: 0 auto;
  padding: 48px 8vw 80px;
  gap: 56px;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 32px;
  }
`;

const Sidebar = styled.aside`
  width: 200px;
  flex-shrink: 0;
  position: sticky;
  top: 80px;

  @media (max-width: 768px) {
    width: 100%;
    position: static;
  }
`;

const SidebarInner = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const SidebarLabel = styled.p<{ $theme: PreferedScheme }>`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #a9a9a9;
  margin-bottom: 12px;
`;

const NavList = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const NavItem = styled.button<{ $active: boolean; $theme: PreferedScheme }>`
  display: flex;
  align-items: center;
  gap: 10px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font-size: 13px;
  font-family: inherit;
  padding: 6px 8px;
  border-radius: 6px;
  color: ${({ $active, $theme }) =>
    $active
      ? $theme === "Dark"
        ? "#fff"
        : "#0f1720"
      : "#a9a9a9"};
  background-color: ${({ $active, $theme }) =>
    $active
      ? $theme === "Dark"
        ? "rgba(255,255,255,0.06)"
        : "rgba(0,0,0,0.05)"
      : "transparent"};
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  transition: color 0.2s, background-color 0.2s;

  &:hover {
    color: ${({ $theme }) => ($theme === "Dark" ? "#fff" : "#0f1720")};
    background-color: ${({ $theme }) =>
      $theme === "Dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"};
  }
`;

const NavDot = styled.span<{ $active: boolean; $theme: PreferedScheme }>`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
  background-color: ${({ $active }) =>
    $active ? "var(--sc-warning-color-defaultBlue)" : "#555"};
  transition: background-color 0.2s;
`;

const Content = styled.main`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 56px;
`;

const Intro = styled.p<{ $theme: PreferedScheme }>`
  font-size: 16px;
  line-height: 1.75;
  color: ${({ $theme }) => ($theme === "Dark" ? "#c9d6e8" : "#374151")};
  padding-bottom: 40px;
  border-bottom: 1px solid
    ${({ $theme }) =>
      $theme === "Dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"};
`;

const Section = styled.section`
  scroll-margin-top: 90px;
`;

const SectionNumber = styled.span<{ $theme: PreferedScheme }>`
  display: block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--sc-warning-color-defaultBlue);
  margin-bottom: 8px;
`;

const SectionTitle = styled.h2<{ $theme: PreferedScheme }>`
  font-size: clamp(18px, 2.5vw, 24px);
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ $theme }) => ($theme === "Dark" ? "#fff" : "#0f1720")};
  margin-bottom: 16px;
`;

const Divider = styled.hr<{ $theme: PreferedScheme }>`
  border: none;
  border-top: 1px solid
    ${({ $theme }) =>
      $theme === "Dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"};
  margin-bottom: 20px;
`;

const Paragraph = styled.p<{ $theme: PreferedScheme }>`
  font-size: 15px;
  line-height: 1.75;
  color: ${({ $theme }) => ($theme === "Dark" ? "#c9d6e8" : "#374151")};
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const ItemGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin: 16px 0;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const ItemCard = styled.div<{ $theme: PreferedScheme }>`
  ${sectionTheme__css}
  ${sectionBorderTheme__css}
  border-radius: 10px;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ItemCardLabel = styled.p<{ $theme: PreferedScheme }>`
  font-size: 14px;
  font-weight: 700;
  color: ${({ $theme }) => ($theme === "Dark" ? "#fff" : "#0f1720")};
`;

const ItemCardSub = styled.p<{ $theme: PreferedScheme }>`
  font-size: 12px;
  color: var(--sc-warning-color-defaultBlue);
  font-weight: 500;
  margin-bottom: 8px;
`;

const Notice = styled.div<{ $theme: PreferedScheme }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background-color: ${({ $theme }) =>
    $theme === "Dark" ? "rgba(21, 93, 252, 0.08)" : "rgba(21, 93, 252, 0.05)"};
  border: 1px solid rgba(21, 93, 252, 0.2);
  border-radius: 8px;
  padding: 14px 18px;
  font-size: 14px;
  line-height: 1.65;
  color: ${({ $theme }) => ($theme === "Dark" ? "#c9d6e8" : "#374151")};
  margin-top: 4px;
`;

const NoticeIcon = styled.span`
  font-size: 16px;
  color: var(--sc-warning-color-defaultBlue);
  flex-shrink: 0;
  margin-top: 1px;
`;

const OrderedList = styled.ol<{ $theme: PreferedScheme }>`
  font-size: 15px;
  line-height: 1.75;
  color: ${({ $theme }) => ($theme === "Dark" ? "#c9d6e8" : "#374151")};
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
`;

const SecurityGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 14px;
  margin-top: 16px;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const SecurityItem = styled.div<{ $theme: PreferedScheme }>`
  ${sectionTheme__css}
  ${sectionBorderTheme__css}
  border-radius: 10px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 2px solid var(--sc-warning-color-defaultBlue);
`;

const SecurityItemTitle = styled.p<{ $theme: PreferedScheme }>`
  font-size: 13px;
  font-weight: 700;
  color: ${({ $theme }) => ($theme === "Dark" ? "#fff" : "#0f1720")};
`;

const Anchor = styled.a<{ $theme: PreferedScheme }>`
  color: var(--sc-warning-color-defaultBlue);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;

  &:hover {
    border-bottom-color: var(--sc-warning-color-defaultBlue);
  }
`;

export default PrivacyPolicy;
