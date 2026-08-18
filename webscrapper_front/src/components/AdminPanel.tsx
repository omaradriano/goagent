import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import { AuthContext } from "../Context/ContextConfig";
import {
  textTheme__css,
  sectionTheme__css,
  sectionBorderTheme__css,
  CardComponent__SC,
  MayorText,
  MinorText,
} from "../styles/CssComponents";
import { useNavigate } from "react-router";

interface PolizaAuditEntry {
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
  source: string;
  numpoliza: string;
  agente_email: string;
}

interface AgenteAuditEntry {
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
  source: string;
  agente_email: string;
}

const AdminPanel: React.FC = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  const [polizaLogs, setPolizaLogs] = useState<PolizaAuditEntry[]>([]);
  const [agenteLogs, setAgenteLogs] = useState<AgenteAuditEntry[]>([]);
  const [polizaOffset, setPolizaOffset] = useState(0);
  const [agenteOffset, setAgenteOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  const LIMIT = 20;

  async function fetchAudit(endpoint: string, offset: number) {
    const token = localStorage.getItem("session_jwt");
    if (!token) {
      auth?.setIsAuthenticated(false);
      navigate("/home");
      return null;
    }
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_SERVER_URL}/v1/audit/all/${endpoint}?limit=${LIMIT}&offset=${offset}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) return data.payload || [];
      return [];
    } catch {
      return [];
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [p, a] = await Promise.all([
        fetchAudit("polizas", polizaOffset),
        fetchAudit("agentes", agenteOffset),
      ]);
      setPolizaLogs(p);
      setAgenteLogs(a);
      setLoading(false);
    }
    load();
  }, [polizaOffset, agenteOffset]);

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <PageContainer>
        <MayorText>Cargando...</MayorText>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageTitle>Admin Panel</PageTitle>

      <SectionCard>
        <SectionTitle>Cambios en Polizas</SectionTitle>
        <TableWrapper>
          <AuditTable>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Poliza</Th>
                <Th>Campo</Th>
                <Th>Anterior</Th>
                <Th>Nuevo</Th>
                <Th>Agente</Th>
                <Th>Fuente</Th>
              </tr>
            </thead>
            <tbody>
              {polizaLogs.length === 0 ? (
                <tr>
                  <Td colSpan={7}>
                    <MinorText>Sin registros</MinorText>
                  </Td>
                </tr>
              ) : (
                polizaLogs.map((log, i) => (
                  <tr key={`p-${i}`}>
                    <Td>{formatDate(log.changed_at)}</Td>
                    <Td>
                      <CodeTag>{log.numpoliza}</CodeTag>
                    </Td>
                    <Td>
                      <CodeTag>{log.field_name}</CodeTag>
                    </Td>
                    <Td>{log.old_value ?? "-"}</Td>
                    <Td>{log.new_value ?? "-"}</Td>
                    <Td>{log.agente_email}</Td>
                    <SourceTd $source={log.source}>{log.source}</SourceTd>
                  </tr>
                ))
              )}
            </tbody>
          </AuditTable>
        </TableWrapper>
        <PaginationRow>
          <PagBtn
            disabled={polizaOffset === 0}
            onClick={() => setPolizaOffset(Math.max(0, polizaOffset - LIMIT))}
          >
            Anterior
          </PagBtn>
          <MinorText>
            {polizaOffset + 1} - {polizaOffset + polizaLogs.length}
          </MinorText>
          <PagBtn
            disabled={polizaLogs.length < LIMIT}
            onClick={() => setPolizaOffset(polizaOffset + LIMIT)}
          >
            Siguiente
          </PagBtn>
        </PaginationRow>
      </SectionCard>

      <SectionCard>
        <SectionTitle>Cambios en Agentes</SectionTitle>
        <TableWrapper>
          <AuditTable>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Agente</Th>
                <Th>Evento / Campo</Th>
                <Th>Anterior</Th>
                <Th>Nuevo</Th>
                <Th>Fuente</Th>
              </tr>
            </thead>
            <tbody>
              {agenteLogs.length === 0 ? (
                <tr>
                  <Td colSpan={6}>
                    <MinorText>Sin registros</MinorText>
                  </Td>
                </tr>
              ) : (
                agenteLogs.map((log, i) => (
                  <tr key={`a-${i}`}>
                    <Td>{formatDate(log.changed_at)}</Td>
                    <Td>{log.agente_email}</Td>
                    <Td>
                      <CodeTag>{log.field_name}</CodeTag>
                    </Td>
                    <Td>{log.old_value ?? "-"}</Td>
                    <Td>{log.new_value ?? "-"}</Td>
                    <SourceTd $source={log.source}>{log.source}</SourceTd>
                  </tr>
                ))
              )}
            </tbody>
          </AuditTable>
        </TableWrapper>
        <PaginationRow>
          <PagBtn
            disabled={agenteOffset === 0}
            onClick={() => setAgenteOffset(Math.max(0, agenteOffset - LIMIT))}
          >
            Anterior
          </PagBtn>
          <MinorText>
            {agenteOffset + 1} - {agenteOffset + agenteLogs.length}
          </MinorText>
          <PagBtn
            disabled={agenteLogs.length < LIMIT}
            onClick={() => setAgenteOffset(agenteOffset + LIMIT)}
          >
            Siguiente
          </PagBtn>
        </PaginationRow>
      </SectionCard>
    </PageContainer>
  );
};

export default AdminPanel;

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 30px 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const PageTitle = styled.h1`
  ${textTheme__css}
  font-size: 24px;
  font-weight: 700;
  margin: 0;
`;

const SectionCard = styled.div`
  ${CardComponent__SC}
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SectionTitle = styled.h2`
  ${textTheme__css}
  font-size: 18px;
  font-weight: 600;
  margin: 0;
`;

const TableWrapper = styled.div`
  overflow-x: auto;
`;

const AuditTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
`;

const Th = styled.th`
  ${textTheme__css}
  text-align: left;
  padding: 8px 12px;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid
    ${(p) =>
      p.theme.mode === "Dark"
        ? "var(--border-shadow-dark)"
        : "var(--border-shadow-light)"};
  white-space: nowrap;
`;

const Td = styled.td`
  ${textTheme__css}
  padding: 8px 12px;
  border-bottom: 1px solid
    ${(p) =>
      p.theme.mode === "Dark"
        ? "var(--border-shadow-dark)"
        : "var(--border-shadow-light)"};
  white-space: nowrap;
`;

const CodeTag = styled.code`
  background-color: ${(p) =>
    p.theme.mode === "Dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"};
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
`;

const SourceTd = styled(Td)<{ $source: string }>`
  color: ${(p) =>
    p.$source === "webhook"
      ? "#f59e0b"
      : p.$source === "system"
        ? "#8b5cf6"
        : "#22c55e"};
  font-weight: 500;
`;

const PaginationRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
`;

const PagBtn = styled.button`
  ${textTheme__css}
  ${sectionTheme__css}
  ${sectionBorderTheme__css}
  padding: 6px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    opacity: 0.8;
  }
`;
