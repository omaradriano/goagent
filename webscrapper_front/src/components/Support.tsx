import React, { useState, useRef } from "react";
import styled, { keyframes } from "styled-components";
import { NavLink } from "react-router";
import Icon from "./icon";
import {
  textTheme__css,
  sectionTheme__css,
  sectionBorderTheme__css,
} from "../styles/CssComponents";

// ── Animations ───────────────────────────────────────────────────────────────
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ── Types ─────────────────────────────────────────────────────────────────────
type PlatformType = "extension" | "webapp" | "";
type StatusType = "idle" | "sending" | "sent" | "error";

// ── Component ─────────────────────────────────────────────────────────────────
const Support: React.FC = () => {
  const [platform, setPlatform] = useState<PlatformType>("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusType>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, image: "Solo se permiten archivos de imagen." }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: "La imagen no puede superar 5 MB." }));
      return;
    }

    setErrors((prev) => { const n = { ...prev }; delete n.image; return n; });
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!email.trim()) newErrors.email = "El correo es requerido.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.email = "Ingresa un correo válido.";
    if (!platform) newErrors.platform = "Selecciona la plataforma afectada.";
    if (!subject.trim()) newErrors.subject = "El asunto es requerido.";
    if (!description.trim() || description.length < 20)
      newErrors.description = "Describe el problema con al menos 20 caracteres.";
    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length > 0) {
      setErrors(v);
      return;
    }
    setErrors({});
    setStatus("sending");

    // TODO: Conectar con backend / email service
    setTimeout(() => {
      setStatus("sent");
    }, 1500);
  };

  const handleReset = () => {
    setPlatform("");
    setSubject("");
    setDescription("");
    setEmail("");
    handleRemoveImage();
    setErrors({});
    setStatus("idle");
  };

  if (status === "sent") {
    return (
      <PageWrapper>
        <SuccessCard>
          <SuccessIcon>
            <Icon iconName="CheckCircle" size={40} customColor="#155dfc" />
          </SuccessIcon>
          <SuccessTitle>Reporte enviado</SuccessTitle>
          <SuccessText>
            Recibimos tu solicitud. Nuestro equipo revisará el problema y te
            responderá a <strong>{email}</strong> en un plazo de 24-48 horas
            hábiles.
          </SuccessText>
          <ResetButton onClick={handleReset}>Enviar otro reporte</ResetButton>
          <BackLink to="/home">
            <Icon iconName="ArrowBack" size={15} />
            Volver al inicio
          </BackLink>
        </SuccessCard>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <BackLink to="/home">
        <Icon iconName="ArrowBack" size={16} />
        Volver al inicio
      </BackLink>

      {/* Header */}
      <PageHeader>
        <Eyebrow>
          <Icon iconName="SupportAgent" size={12} />
          Soporte al cliente
        </Eyebrow>
        <Title>¿Tuviste un problema?</Title>
        <Subtitle>
          Reporta cualquier error que hayas encontrado en la{" "}
          <strong>extensión de Chrome</strong> o en la{" "}
          <strong>aplicación web</strong>. Nuestro equipo lo revisará lo antes
          posible.
        </Subtitle>
      </PageHeader>

      {/* Form */}
      <FormCard as="form" onSubmit={handleSubmit} noValidate>

        {/* Email */}
        <FieldGroup>
          <FieldLabel>
            <Icon iconName="Email" size={15} />
            Tu correo electrónico
          </FieldLabel>
          <Input
            type="email"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            $hasError={!!errors.email}
          />
          {errors.email && <FieldError>{errors.email}</FieldError>}
        </FieldGroup>

        {/* Platform */}
        <FieldGroup>
          <FieldLabel>
            <Icon iconName="Devices" size={15} />
            Plataforma afectada
          </FieldLabel>
          <PlatformGrid>
            <PlatformOption
              type="button"
              $selected={platform === "extension"}
              onClick={() => setPlatform("extension")}
            >
              <Icon
                iconName="Extension"
                size={22}
                customColor={platform === "extension" ? "#155dfc" : undefined}
              />
              <PlatformLabel>Extensión de Chrome</PlatformLabel>
              <PlatformSub>Scraping y captura de pólizas</PlatformSub>
            </PlatformOption>

            <PlatformOption
              type="button"
              $selected={platform === "webapp"}
              onClick={() => setPlatform("webapp")}
            >
              <Icon
                iconName="Language"
                size={22}
                customColor={platform === "webapp" ? "#155dfc" : undefined}
              />
              <PlatformLabel>Aplicación web</PlatformLabel>
              <PlatformSub>Dashboard, calendario y más</PlatformSub>
            </PlatformOption>
          </PlatformGrid>
          {errors.platform && <FieldError>{errors.platform}</FieldError>}
        </FieldGroup>

        {/* Subject */}
        <FieldGroup>
          <FieldLabel>
            <Icon iconName="Title" size={15} />
            Asunto del reporte
          </FieldLabel>
          <Input
            type="text"
            placeholder="Ej: Error al capturar póliza desde la extensión"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            $hasError={!!errors.subject}
          />
          {errors.subject && <FieldError>{errors.subject}</FieldError>}
        </FieldGroup>

        {/* Description */}
        <FieldGroup>
          <FieldLabel>
            <Icon iconName="Description" size={15} />
            Descripción del problema
          </FieldLabel>
          <Textarea
            placeholder="Describe con detalle qué ocurrió, qué estabas haciendo y qué resultado esperabas..."
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            $hasError={!!errors.description}
          />
          <CharCount $warn={description.length < 20 && description.length > 0}>
            {description.length} caracteres {description.length < 20 ? `(mínimo 20)` : ""}
          </CharCount>
          {errors.description && <FieldError>{errors.description}</FieldError>}
        </FieldGroup>

        {/* Image upload */}
        <FieldGroup>
          <FieldLabel>
            <Icon iconName="Image" size={15} />
            Imagen adjunta{" "}
            <OptionalTag>opcional</OptionalTag>
          </FieldLabel>
          <FieldHint>
            Adjunta una captura de pantalla para que podamos visualizar mejor el
            problema. Formatos: PNG, JPG, GIF · Máximo 5 MB.
          </FieldHint>

          {imagePreview ? (
            <ImagePreviewWrapper>
              <PreviewImg src={imagePreview} alt="Vista previa del adjunto" />
              <RemoveImageBtn
                type="button"
                onClick={handleRemoveImage}
                title="Eliminar imagen"
              >
                <Icon iconName="Close" size={16} customColor="#fff" />
              </RemoveImageBtn>
              <ImageFileName>{imageFile?.name}</ImageFileName>
            </ImagePreviewWrapper>
          ) : (
            <DropZone
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon iconName="CloudUpload" size={28} customColor="#155dfc" />
              <DropZoneText>
                Haz clic para seleccionar una imagen
              </DropZoneText>
              <DropZoneSub>o arrastra y suelta aquí</DropZoneSub>
            </DropZone>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImageChange}
          />
          {errors.image && <FieldError>{errors.image}</FieldError>}
        </FieldGroup>

        {/* Submit */}
        <SubmitButton type="submit" disabled={status === "sending"}>
          {status === "sending" ? (
            <>
              <Spinner />
              Enviando...
            </>
          ) : (
            <>
              <Icon iconName="Send" size={18} customColor="#fff" />
              Enviar reporte
            </>
          )}
        </SubmitButton>

        {status === "error" && (
          <ErrorBanner>
            <Icon iconName="ErrorOutline" size={16} customColor="#ef4444" />
            Ocurrió un error al enviar. Por favor intenta de nuevo.
          </ErrorBanner>
        )}
      </FormCard>

      {/* Info strip */}
      <InfoStrip>
        <InfoItem>
          <Icon iconName="Schedule" size={14} customColor="#888" />
          Respuesta en 24-48 h hábiles
        </InfoItem>
        <InfoSep />
        <InfoItem>
          <Icon iconName="Lock" size={14} customColor="#888" />
          Tu información es confidencial
        </InfoItem>
      </InfoStrip>
    </PageWrapper>
  );
};

export default Support;

// ── Styled Components ──────────────────────────────────────────────────────────

const PageWrapper = styled.div`
  min-height: 100vh;
  padding: 3rem 1.5rem 6rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: ${fadeUp} 0.6s ease both;
`;

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

const PageHeader = styled.div`
  text-align: center;
  max-width: 560px;
  margin-bottom: 2.5rem;
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
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.1;
  margin-bottom: 0.9rem;
  text-wrap: balance;
`;

const Subtitle = styled.p`
  font-size: 0.975rem;
  color: #888;
  line-height: 1.7;

  strong {
    color: #aaa;
    font-weight: 600;
  }
`;

const FormCard = styled.div`
  ${sectionTheme__css}
  ${sectionBorderTheme__css}
  border-radius: 20px;
  padding: 2.25rem 2rem;
  width: 100%;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FieldLabel = styled.label`
  ${textTheme__css}
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.875rem;
  font-weight: 600;
`;

const FieldHint = styled.p`
  font-size: 0.8rem;
  color: #888;
  line-height: 1.55;
  margin-top: -0.2rem;
`;

const OptionalTag = styled.span`
  font-size: 0.7rem;
  font-weight: 500;
  color: #888;
  background: ${(p) =>
    p.theme.mode === "Dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"};
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  margin-left: 0.25rem;
`;

const inputBase = `
  width: 100%;
  border-radius: 10px;
  font-size: 0.9rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.18s, box-shadow 0.18s;
  box-sizing: border-box;
`;

const Input = styled.input<{ $hasError?: boolean }>`
  ${inputBase}
  padding: 0.7rem 0.95rem;
  ${sectionTheme__css}
  ${textTheme__css}
  border: 1.5px solid ${(p) =>
    p.$hasError
      ? "#ef4444"
      : p.theme.mode === "Dark"
      ? "rgba(255,255,255,0.1)"
      : "rgba(0,0,0,0.12)"};

  &:focus {
    border-color: #155dfc;
    box-shadow: 0 0 0 3px rgba(21, 93, 252, 0.12);
  }

  &::placeholder {
    color: #666;
  }
`;

const Textarea = styled.textarea<{ $hasError?: boolean }>`
  ${inputBase}
  padding: 0.75rem 0.95rem;
  resize: vertical;
  min-height: 120px;
  ${sectionTheme__css}
  ${textTheme__css}
  border: 1.5px solid ${(p) =>
    p.$hasError
      ? "#ef4444"
      : p.theme.mode === "Dark"
      ? "rgba(255,255,255,0.1)"
      : "rgba(0,0,0,0.12)"};

  &:focus {
    border-color: #155dfc;
    box-shadow: 0 0 0 3px rgba(21, 93, 252, 0.12);
  }

  &::placeholder {
    color: #666;
  }
`;

const CharCount = styled.span<{ $warn?: boolean }>`
  font-size: 0.75rem;
  color: ${(p) => (p.$warn ? "#f59e0b" : "#888")};
  text-align: right;
`;

const FieldError = styled.span`
  font-size: 0.78rem;
  color: #ef4444;
  display: flex;
  align-items: center;
  gap: 0.3rem;
`;

// ── Platform selector ─────────────────────────────────────────────────────────

const PlatformGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
`;

const PlatformOption = styled.button<{ $selected: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.3rem;
  padding: 1rem 1.1rem;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
  ${sectionTheme__css}

  border: 1.5px solid
    ${(p) =>
      p.$selected
        ? "#155dfc"
        : p.theme.mode === "Dark"
        ? "rgba(255,255,255,0.1)"
        : "rgba(0,0,0,0.1)"};

  background: ${(p) =>
    p.$selected
      ? p.theme.mode === "Dark"
        ? "rgba(21,93,252,0.12)"
        : "rgba(21,93,252,0.06)"
      : p.theme.mode === "Dark"
      ? "rgba(255,255,255,0.03)"
      : "rgba(0,0,0,0.01)"};

  box-shadow: ${(p) =>
    p.$selected ? "0 0 0 3px rgba(21,93,252,0.12)" : "none"};

  &:hover {
    border-color: #155dfc;
  }
`;

const PlatformLabel = styled.span`
  ${textTheme__css}
  font-size: 0.875rem;
  font-weight: 600;
`;

const PlatformSub = styled.span`
  font-size: 0.75rem;
  color: #888;
`;

// ── Image Upload ──────────────────────────────────────────────────────────────

const DropZone = styled.button`
  width: 100%;
  border-radius: 12px;
  padding: 2rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: border-color 0.18s, background 0.18s;
  border: 2px dashed
    ${(p) =>
      p.theme.mode === "Dark"
        ? "rgba(255,255,255,0.12)"
        : "rgba(0,0,0,0.12)"};
  background: ${(p) =>
    p.theme.mode === "Dark"
      ? "rgba(255,255,255,0.02)"
      : "rgba(0,0,0,0.02)"};

  &:hover {
    border-color: #155dfc;
    background: rgba(21, 93, 252, 0.04);
  }
`;

const DropZoneText = styled.span`
  ${textTheme__css}
  font-size: 0.875rem;
  font-weight: 600;
`;

const DropZoneSub = styled.span`
  font-size: 0.78rem;
  color: #888;
`;

const ImagePreviewWrapper = styled.div`
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  border: 1.5px solid
    ${(p) =>
      p.theme.mode === "Dark"
        ? "rgba(255,255,255,0.1)"
        : "rgba(0,0,0,0.1)"};
`;

const PreviewImg = styled.img`
  width: 100%;
  max-height: 280px;
  object-fit: contain;
  display: block;
  background: ${(p) =>
    p.theme.mode === "Dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"};
`;

const RemoveImageBtn = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.55);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.18s;

  &:hover {
    background: rgba(239, 68, 68, 0.8);
  }
`;

const ImageFileName = styled.div`
  font-size: 0.75rem;
  color: #888;
  padding: 0.45rem 0.85rem;
  ${sectionTheme__css}
  border-top: 1px solid ${(p) =>
    p.theme.mode === "Dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"};
`;

// ── Submit ────────────────────────────────────────────────────────────────────

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Spinner = styled.span`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
  flex-shrink: 0;
`;

const SubmitButton = styled.button`
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
  gap: 0.6rem;
  transition: opacity 0.2s, transform 0.15s;
  margin-top: 0.5rem;

  &:hover:not(:disabled) {
    opacity: 0.88;
    transform: translateY(-1px);
  }
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

const ErrorBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #ef4444;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
`;

// ── Info strip ────────────────────────────────────────────────────────────────

const InfoStrip = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1.25rem;
  font-size: 0.78rem;
  color: #888;
  flex-wrap: wrap;
  justify-content: center;
`;

const InfoItem = styled.span`
  display: flex;
  align-items: center;
  gap: 0.35rem;
`;

const InfoSep = styled.div`
  width: 1px;
  height: 14px;
  background: ${(p) =>
    p.theme.mode === "Dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"};
`;

// ── Success state ─────────────────────────────────────────────────────────────

const SuccessCard = styled.div`
  ${sectionTheme__css}
  ${sectionBorderTheme__css}
  border-radius: 20px;
  padding: 3rem 2.5rem;
  max-width: 460px;
  width: 100%;
  margin-top: 4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
  animation: ${fadeUp} 0.5s ease both;
`;

const SuccessIcon = styled.div`
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(21, 93, 252, 0.1);
  border: 1.5px solid rgba(21, 93, 252, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
`;

const SuccessTitle = styled.h2`
  ${textTheme__css}
  font-size: 1.5rem;
  font-weight: 800;
`;

const SuccessText = styled.p`
  font-size: 0.9rem;
  color: #888;
  line-height: 1.65;

  strong {
    color: #aaa;
    font-weight: 600;
  }
`;

const ResetButton = styled.button`
  margin-top: 0.5rem;
  padding: 0.75rem 1.75rem;
  border-radius: 10px;
  border: none;
  background: #155dfc;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.85;
  }
`;
