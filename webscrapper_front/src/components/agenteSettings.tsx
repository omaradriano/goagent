import { createPortal } from "react-dom";
import { useState, useEffect, useContext } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router";
import Icon from "./icon";
import Button from "./button";
import {
  sectionBorderTheme__css,
  sectionTheme__css,
  textTheme__css,
} from "../styles/CssComponents";
import {
  AlertContext,
  AuthContext,
  DataChangedContext,
} from "../Context/ContextConfig";

export interface AgenteSettingsProps {
  modalOpen: boolean;
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const MIN_DAYS = 1;
const MAX_DAYS = 8;

const AgenteSettings: React.FC<AgenteSettingsProps> = ({
  modalOpen,
  setModalOpen,
}) => {
  const auth = useContext(AuthContext);
  const alertContext = useContext(AlertContext);
  const dataChanged = useContext(DataChangedContext);
  const navigate = useNavigate();

  const [daysUntilAdvice, setDaysUntilAdvice] = useState<number | null>(null);
  const [initialValue, setInitialValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const getSessionToken = () => {
    const session_token = localStorage.getItem("session_jwt");
    if (!session_token) {
      auth?.setIsAuthenticated(false);
      navigate("/home");
      return null;
    }
    return session_token;
  };

  useEffect(() => {
    if (!modalOpen) return;
    const loadProfile = async () => {
      const session_token = getSessionToken();
      if (!session_token) return;
      setLoading(true);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_SERVER_URL}/v1/auth/profile`,
          { headers: { Authorization: `Bearer ${session_token}` } },
        );
        const data = await res.json();
        if (data?.success && typeof data.payload?.daysuntiladvice === "number") {
          setDaysUntilAdvice(data.payload.daysuntiladvice);
          setInitialValue(data.payload.daysuntiladvice);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen]);

  const hasChanges =
    daysUntilAdvice !== null &&
    initialValue !== null &&
    daysUntilAdvice !== initialValue;

  const handleGuardar = () => {
    alertContext?.setAlertOptions({
      title: "Confirmar cambios",
      message:
        "Se actualizará la ventana de días para las pólizas próximas a vencer. ¿Desea continuar?",
      type: "success",
      onConfirm: saveChanges,
    });
    alertContext?.setShowAlert(true);
  };

  const saveChanges = async () => {
    if (daysUntilAdvice === null) return;
    const session_token = getSessionToken();
    if (!session_token) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_SERVER_URL}/v1/auth/profile`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session_token}`,
          },
          body: JSON.stringify({ daysuntiladvice: daysUntilAdvice }),
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

      setInitialValue(daysUntilAdvice);
      dataChanged?.setDataHasChanged((prev) => prev + 1);
      alertContext?.setAlertOptions({
        title: "Cambios guardados",
        message: "La preferencia se ha actualizado correctamente",
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value);
    if (Number.isNaN(raw)) return;
    const clamped = Math.min(MAX_DAYS, Math.max(MIN_DAYS, raw));
    setDaysUntilAdvice(clamped);
  };

  return (
    <>
      {modalOpen &&
        createPortal(
          <ModalShadow onClick={() => setModalOpen(false)}>
            <ModalContent onClick={(e) => e.stopPropagation()}>
              <ModalHeader>
                <HeaderLeft>
                  <HeaderIcon>
                    <Icon iconName="Settings" size={18} />
                  </HeaderIcon>
                  <ModalTitle>Preferencias de cuenta</ModalTitle>
                </HeaderLeft>
                <CloseBtn onClick={() => setModalOpen(false)}>
                  <Icon iconName="Clear" size={18} isButton={false} />
                </CloseBtn>
              </ModalHeader>

              <ModalBody>
                <Field>
                  <FieldLabel>Días de anticipación</FieldLabel>
                  <FieldHint>
                    Ventana de días antes del vencimiento en la que una
                    póliza se considera "próxima a vencer". Entre más
                    grande, más pólizas se recorren en cada
                    re-sincronización.
                  </FieldHint>
                  <EditInput
                    type="number"
                    min={MIN_DAYS}
                    max={MAX_DAYS}
                    value={daysUntilAdvice ?? ""}
                    disabled={loading}
                    onChange={handleChange}
                  />
                </Field>
              </ModalBody>

              <ModalFooter>
                {hasChanges && (
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

const ModalContent = styled.div`
  display: flex;
  flex-direction: column;
  width: clamp(300px, 92%, 420px);
  border-radius: 12px;
  overflow: hidden;
  ${sectionTheme__css}
  ${sectionBorderTheme__css}
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.22);
  z-index: 10;
`;

const ModalHeader = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid
    ${(p) =>
      p.theme.mode === "Dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"};
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

const ModalBody = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FieldLabel = styled.span`
  font-size: 13px;
  font-weight: 600;
  ${textTheme__css}
`;

const FieldHint = styled.span`
  font-size: 12px;
  color: #8a8a8a;
  line-height: 1.4;
`;

const EditInput = styled.input`
  font-size: 14px;
  font-weight: 600;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid
    ${(p) =>
      p.theme.mode === "Dark" ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"};
  background-color: ${(p) =>
    p.theme.mode === "Dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"};
  ${textTheme__css}
  outline: none;
  width: 100px;
  transition: border-color 0.15s;

  &:focus {
    border-color: #155dfc;
  }
`;

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
`;

export default AgenteSettings;
