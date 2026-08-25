import { createPortal } from "react-dom";
import { useState, useEffect, useContext } from "react";
import styled, { css } from "styled-components";
import Icon from "./icon";
import {
  CardTextTheme__CSS,
  CardTheme__CSS,
  sectionBorderTheme__css,
  sectionTheme__css,
  textTheme__css,
} from "../styles/CssComponents";
import Button from "./button";
import type { PolizaGetItem, StatusValues } from "../Types/types";
import CounterCard from "./counterCard";
import {
  calculateDaysUntilLimit,
  formatDate,
} from "../functions/globalFunctions";
import { AlertContext, AuthContext, DataChangedContext, SubscriptionContext } from "../Context/ContextConfig";
import { useNavigate } from "react-router";

type FormaPago = "MENSUAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";

interface EditableFields {
  forma_pago: FormaPago;
  dia_cobro: number;
  estatus: StatusValues;
  telefono: string;
  email: string;
}

export interface ModalProps {
  onClose?: () => void;
  children?: React.ReactNode;
  title: string;
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  modalOpen: boolean;
  polizaData: PolizaGetItem;
}

const FORMAS_PAGO: FormaPago[] = [
  "MENSUAL",
  "TRIMESTRAL",
  "SEMESTRAL",
  "ANUAL",
];

const Modal: React.FC<ModalProps> = ({
  title = "Detalle de Póliza",
  modalOpen = false,
  setModalOpen,
  polizaData,
}) => {
  const principal = polizaData?.asegurados?.filter((a) => a.is_principal)[0];
  const dependientes = polizaData?.asegurados?.filter((a) => !a.is_principal);

  const getInitialFields = () => ({
    forma_pago: (polizaData.forma_pago ?? "MENSUAL") as FormaPago,
    dia_cobro: polizaData.diaCobro ?? 0,
    estatus: polizaData.estatus ?? "En Vigor",
    telefono: polizaData.telefono ?? "",
    email: polizaData.email ?? "",
  });

  // Use a key to force remount and reset state when polizaData or modalOpen changes
  const [editFields, setEditFields] =
    useState<EditableFields>(getInitialFields());
  const auth = useContext(AuthContext);
  const alertContext = useContext(AlertContext);
  const dataChanged = useContext(DataChangedContext);
  const subscription = useContext(SubscriptionContext);
  const isSubscribed = subscription?.isSubscribed ?? false;
  const navigate = useNavigate();

  useEffect(() => {
    setEditFields(getInitialFields());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polizaData, modalOpen]);

  const hasChanges =
    editFields.forma_pago !== polizaData.forma_pago ||
    editFields.dia_cobro !== polizaData.diaCobro ||
    editFields.estatus !== polizaData.estatus ||
    editFields.telefono !== (polizaData.telefono ?? "") ||
    editFields.email !== (polizaData.email ?? "");

  const showSubscriptionAlert = () => {
    alertContext?.setAlertOptions({
      title: "Suscripción requerida",
      message: "Necesitas una suscripción activa para modificar pólizas.",
      type: "error",
      onConfirm: () => alertContext.setShowAlert(false),
    });
    alertContext?.setShowAlert(true);
  };

  const handleDiaCobroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    let num = raw === "" ? 0 : parseInt(raw, 10);
    if (num > 31) num = 31;
    setEditFields((prev) => ({ ...prev, dia_cobro: num }));
  };

  const handleDiaCobroBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "" || isNaN(Number(e.target.value))) {
      setEditFields((prev) => ({ ...prev, dia_cobro: 0 }));
    }
  };

  const toggleEstatus = () => {
    setEditFields((prev) => ({
      ...prev,
      estatus: prev.estatus === "En Vigor" ? "Anulada" : "En Vigor",
    }));
  };

  const handleGuardar = () => {
    alertContext?.setAlertOptions({
      title: "Confirmar cambios",
      message: `Se guardarán los cambios para la póliza ${polizaData.num_poliza}. ¿Desea continuar?`,
      type: "success",
      onConfirm: saveChanges,
    });
    alertContext?.setShowAlert(true);
  };

  const saveChanges = async () => {
    const session_token = localStorage.getItem("session_jwt");
    if (!session_token) {
      auth?.setIsAuthenticated(false);
      navigate("/home");
      return;
    }
    try {
      const body: Record<string, unknown> = {
        numpoliza: polizaData.num_poliza,
      };
      if (editFields.dia_cobro !== polizaData.diaCobro) {
        body.dia_cobro = editFields.dia_cobro;
      }
      if (editFields.telefono !== (polizaData.telefono ?? "")) {
        body.telefono = editFields.telefono;
      }
      if (editFields.email !== (polizaData.email ?? "")) {
        body.email = editFields.email;
      }
      if (editFields.forma_pago !== polizaData.forma_pago) {
        body.forma_pago = editFields.forma_pago;
      }
      if (editFields.estatus !== polizaData.estatus) {
        body.estatus = editFields.estatus;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_SERVER_URL}/v1/scrapping/poliza`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session_token}`,
          },
          body: JSON.stringify(body),
        },
      );

      const data = await response.json();
      if (!data.success) {
        alertContext?.setAlertOptions({
          title: "Error",
          message: data.message || "Error al guardar cambios",
          type: "error",
        });
        alertContext?.setShowAlert(true);
        return;
      }

      dataChanged?.setDataHasChanged((prev) => prev + 1);
      alertContext?.setAlertOptions({
        title: "Cambios guardados",
        message: "Los datos han sido actualizados correctamente",
        type: "success",
      });
      alertContext?.setShowAlert(true);
    } catch {
      alertContext?.setAlertOptions({
        title: "Error",
        message: "Error de conexión al guardar cambios",
        type: "error",
      });
      alertContext?.setShowAlert(true);
    }
  };

  return (
    <>
      {modalOpen &&
        createPortal(
          <ModalShadow onClick={() => setModalOpen(false)}>
            <ModalContent onClick={(e) => e.stopPropagation()}>
              {/* HEADER */}
              <ModalHeader>
                <HeaderLeft>
                  <HeaderIcon>
                    <Icon iconName="Description" size={18} />
                  </HeaderIcon>
                  <div>
                    <ModalTitle>{title}</ModalTitle>
                    <PolizaNum>{polizaData.num_poliza}</PolizaNum>
                  </div>
                </HeaderLeft>
                <HeaderRight>
                  <StatusBadge $type={editFields.estatus}>
                    {editFields.estatus}
                  </StatusBadge>
                  <CloseBtn onClick={() => setModalOpen(false)}>
                    <Icon iconName="Clear" size={18} isButton={false} />
                  </CloseBtn>
                </HeaderRight>
              </ModalHeader>

              {/* BODY */}
              <ModalBody>
                {/* Días para corte — destacado */}
                <CounterSection>
                  <CounterCard
                    parentContainer={"Modal"}
                    count={calculateDaysUntilLimit(polizaData.next_payment)}
                    includePayment={
                      polizaData.payment_exist === "" ? false : true
                    }
                    paymentdata={{
                      poliza: polizaData.poliza_uuid,
                      paid_period: polizaData.next_payment,
                      num_poliza: polizaData.num_poliza,
                    }}
                  />
                  <SectionMeta>
                    <MetaItem>
                      <MetaLabel>Siguiente pago</MetaLabel>
                      <MetaValue>
                        {formatDate(polizaData.next_payment)}
                      </MetaValue>
                    </MetaItem>
                    <MetaItem>
                      <MetaLabel>Día de cobro</MetaLabel>
                      <EditInput
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={String(
                          editFields.dia_cobro === 0
                            ? ""
                            : editFields.dia_cobro,
                        )}
                        placeholder="0"
                        readOnly={!isSubscribed}
                        onChange={isSubscribed ? handleDiaCobroChange : undefined}
                        onFocus={!isSubscribed ? showSubscriptionAlert : undefined}
                        onBlur={handleDiaCobroBlur}
                      />
                    </MetaItem>
                    <MetaItem>
                      <MetaLabel>Forma de pago</MetaLabel>
                      <EditSelect
                        value={editFields.forma_pago}
                        disabled={!isSubscribed}
                        onChange={isSubscribed ? (e) =>
                          setEditFields((prev) => ({
                            ...prev,
                            forma_pago: e.target.value as FormaPago,
                          })) : undefined
                        }
                        onFocus={!isSubscribed ? showSubscriptionAlert : undefined}
                      >
                        {FORMAS_PAGO.map((fp) => (
                          <option key={fp} value={fp}>
                            {fp}
                          </option>
                        ))}
                      </EditSelect>
                    </MetaItem>
                    <MetaItem>
                      <MetaLabel>Estatus</MetaLabel>
                      <EstatusToggle
                        $active={editFields.estatus === "En Vigor"}
                        onClick={isSubscribed ? toggleEstatus : showSubscriptionAlert}
                        type="button"
                      >
                        <EstatusIndicator
                          $active={editFields.estatus === "En Vigor"}
                        />
                        <span>{editFields.estatus}</span>
                      </EstatusToggle>
                    </MetaItem>
                  </SectionMeta>
                </CounterSection>

                <Divider />

                {/* Datos del plan */}
                <SectionGroup>
                  <SectionLabel>Plan y contrato</SectionLabel>
                  <FieldGrid>
                    <Field>
                      <FieldLabel>Plan</FieldLabel>
                      <FieldValue>{polizaData.plan}</FieldValue>
                    </Field>
                    <Field>
                      <FieldLabel>Tipo de seguro</FieldLabel>
                      <FieldValue>{polizaData.tipo_seguro}</FieldValue>
                    </Field>
                    <Field>
                      <FieldLabel>Fecha de emisión</FieldLabel>
                      <FieldValue>
                        {formatDate(polizaData.fecha_emision)}
                      </FieldValue>
                    </Field>
                    <FullWidthField>
                      <FieldLabel>Último pago registrado</FieldLabel>
                      <FieldValue>
                        {polizaData.payment_exist
                          ? formatDate(polizaData.payment_exist)
                          : "Sin pagos registrados"}
                      </FieldValue>
                    </FullWidthField>
                    <Field>
                      <FieldLabel>Moneda</FieldLabel>
                      <FieldValue>{polizaData.moneda}</FieldValue>
                    </Field>
                    <Field>
                      <FieldLabel>Teléfono</FieldLabel>
                      <EditInput
                        type="tel"
                        value={editFields.telefono}
                        placeholder="Sin teléfono"
                        maxLength={15}
                        readOnly={!isSubscribed}
                        onChange={isSubscribed ? (e) =>
                          setEditFields((prev) => ({
                            ...prev,
                            telefono: e.target.value,
                          })) : undefined
                        }
                        onFocus={!isSubscribed ? showSubscriptionAlert : undefined}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Email</FieldLabel>
                      <EditInput
                        type="email"
                        value={editFields.email}
                        placeholder="Sin email"
                        readOnly={!isSubscribed}
                        onChange={isSubscribed ? (e) =>
                          setEditFields((prev) => ({
                            ...prev,
                            email: e.target.value,
                          })) : undefined
                        }
                        onFocus={!isSubscribed ? showSubscriptionAlert : undefined}
                      />
                    </Field>
                  </FieldGrid>
                </SectionGroup>

                <Divider />

                {/* Asegurados */}
                <SectionGroup>
                  <SectionLabel>Asegurados</SectionLabel>
                  <AseguradoCard>
                    <AseguradoBadge>Principal</AseguradoBadge>
                    <AseguradoName>{principal?.nombre}</AseguradoName>
                  </AseguradoCard>
                  {dependientes.length > 0 && (
                    <DependientesGrid>
                      {dependientes.map((dep, i) => (
                        <DependienteItem key={i}>
                          <Icon iconName="Person" size={14} />
                          <span>{dep.nombre}</span>
                        </DependienteItem>
                      ))}
                    </DependientesGrid>
                  )}
                </SectionGroup>

                <Divider />

                {/* Dirección */}
                <SectionGroup>
                  <SectionLabel>Dirección</SectionLabel>
                  <DireccionGrid>
                    <Field>
                      <FieldLabel>Calle y número</FieldLabel>
                      <FieldValue>{polizaData.direccion.calle}</FieldValue>
                    </Field>
                    <Field>
                      <FieldLabel>Colonia</FieldLabel>
                      <FieldValue>{polizaData.direccion.colonia}</FieldValue>
                    </Field>
                    <Field>
                      <FieldLabel>Ciudad</FieldLabel>
                      <FieldValue>{polizaData.direccion.ciudad}</FieldValue>
                    </Field>
                    <Field>
                      <FieldLabel>Estado</FieldLabel>
                      <FieldValue>{polizaData.direccion.estado}</FieldValue>
                    </Field>
                    <Field>
                      <FieldLabel>Código Postal</FieldLabel>
                      <FieldValue>
                        {polizaData.direccion.codigoPostal}
                      </FieldValue>
                    </Field>
                    <Field>
                      <FieldLabel>País</FieldLabel>
                      <FieldValue>{polizaData.pais}</FieldValue>
                    </Field>
                  </DireccionGrid>
                </SectionGroup>
              </ModalBody>

              {/* FOOTER */}
              <ModalFooter>
                {hasChanges && isSubscribed && (
                  <Button
                    action={handleGuardar}
                    label="Guardar cambios"
                    type="DefaultBlue"
                    iconName="Save"
                  />
                )}
                <Button action={() => setModalOpen(false)} label="Cerrar" />
              </ModalFooter>
            </ModalContent>
          </ModalShadow>,
          document.body,
        )}
    </>
  );
};

/* ─── Overlay ─────────────────────────────────────────────────── */
const ModalShadow = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(4, 4, 4, 0.55);
  backdrop-filter: blur(3px);
  z-index: 10;
`;

/* ─── Card ────────────────────────────────────────────────────── */
const ModalContent = styled.div`
  display: flex;
  flex-direction: column;
  width: clamp(320px, 92%, 620px);
  max-height: 90vh;
  border-radius: 12px;
  overflow: hidden;
  ${sectionTheme__css}
  ${sectionBorderTheme__css}
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.22);
  z-index: 10;
`;

/* ─── Header ──────────────────────────────────────────────────── */
const ModalHeader = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid
    ${(p) =>
      p.theme.mode === "Dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"};
  flex-shrink: 0;
`;

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
`;

const HeaderIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background-color: rgba(21, 93, 252, 0.12);
  color: #155dfc;
  flex-shrink: 0;
`;

const ModalTitle = styled.h3`
  ${textTheme__css}
  font-size: 15px;
  font-weight: 600;
  margin: 0;
  line-height: 1.2;
`;

const PolizaNum = styled.p`
  font-size: 12px;
  color: #8a8a8a;
  margin: 2px 0 0 0;
`;

const HeaderRight = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
`;

const StatusBadge = styled.span<{ $type: StatusValues }>`
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  letter-spacing: 0.02em;
  ${CardTheme__CSS}
  ${CardTextTheme__CSS}
`;

const CloseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  ${textTheme__css}
  opacity: 0.6;
  transition:
    opacity 0.15s,
    background 0.15s;
  &:hover {
    opacity: 1;
    background-color: ${(p) =>
      p.theme.mode === "Dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"};
  }
`;

/* ─── Body ────────────────────────────────────────────────────── */
const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    border-radius: 4px;
    background-color: rgba(128, 128, 128, 0.35);
  }
`;

/* ─── Counter section ─────────────────────────────────────────── */
const CounterSection = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 10px;
  background-color: ${(p) =>
    p.theme.mode === "Dark" ? "rgba(21,93,252,0.08)" : "rgba(21,93,252,0.05)"};
  border: 1px solid rgba(21, 93, 252, 0.18);

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const SectionMeta = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
  flex: 1;
`;

const MetaItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const MetaLabel = styled.span`
  font-size: 11px;
  color: #8a8a8a;
  font-weight: 500;
`;

const MetaValue = styled.span`
  font-size: 13px;
  font-weight: 600;
  ${textTheme__css}
`;

/* ─── Divider ─────────────────────────────────────────────────── */
const Divider = styled.hr`
  border: none;
  border-top: 1px solid
    ${(p) =>
      p.theme.mode === "Dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"};
  margin: 0;
`;

/* ─── Section group ───────────────────────────────────────────── */
const SectionGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const SectionLabel = styled.p`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #155dfc;
  margin: 0;
`;

/* ─── Field grid ──────────────────────────────────────────────── */
const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 16px;

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
  }
`;

const DireccionGrid = styled(FieldGrid)`
  grid-template-columns: 1fr 1fr 1fr;

  @media (max-width: 480px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

const FullWidthField = styled(Field)`
  grid-column: 1 / -1;
`;

const FieldLabel = styled.span`
  font-size: 11px;
  color: #8a8a8a;
  font-weight: 500;
`;

const FieldValue = styled.span`
  font-size: 13px;
  font-weight: 500;
  ${textTheme__css}
`;

/* ─── Asegurados ──────────────────────────────────────────────── */
const AseguradoCard = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  background-color: ${(p) =>
    p.theme.mode === "Dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"};
  border: 1px solid
    ${(p) =>
      p.theme.mode === "Dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"};
`;

const AseguradoBadge = styled.span`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background-color: rgba(21, 93, 252, 0.12);
  color: #155dfc;
  padding: 2px 8px;
  border-radius: 20px;
  flex-shrink: 0;
`;

const AseguradoName = styled.span`
  font-size: 14px;
  font-weight: 600;
  ${textTheme__css}
`;

const DependientesGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const DependienteItem = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  ${textTheme__css}
  opacity: 0.8;
`;

/* ─── Editable fields ─────────────────────────────────────────── */
const editableBase = css`
  font-size: 13px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid
    ${(p) =>
      p.theme.mode === "Dark" ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"};
  background-color: ${(p) =>
    p.theme.mode === "Dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"};
  ${textTheme__css}
  outline: none;
  width: 100%;
  transition: border-color 0.15s;

  &:focus {
    border-color: #155dfc;
  }
`;

const EditInput = styled.input`
  ${editableBase}
  /* Hide number spin buttons */
  -moz-appearance: textfield;
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

const EditSelect = styled.select`
  ${editableBase}
  cursor: pointer;
  appearance: auto;
`;

const EstatusToggle = styled.button<{ $active: boolean }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid
    ${(p) => (p.$active ? "rgba(34, 197, 94, 0.4)" : "rgba(239, 68, 68, 0.4)")};
  background-color: ${(p) =>
    p.$active ? "rgba(34, 197, 94, 0.10)" : "rgba(239, 68, 68, 0.10)"};
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: ${(p) =>
    p.$active ? "var(--sc-success-color)" : "var(--sc-danger-color)"};
  transition:
    background-color 0.15s,
    border-color 0.15s;
  width: 100%;
`;

const EstatusIndicator = styled.span<{ $active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background-color: ${(p) =>
    p.$active ? "var(--sc-success-color)" : "var(--sc-danger-color)"};
`;

/* ─── Footer ──────────────────────────────────────────────────── */
const ModalFooter = styled.div`
  border-top: 1px solid
    ${(p) =>
      p.theme.mode === "Dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"};
  padding: 14px 20px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-shrink: 0;
`;

export default Modal;
