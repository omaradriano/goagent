import React, { useState } from "react";
import { AuthButton, CredentialAlert, InputText } from "./styles";
import { useNavigate } from "react-router";

const ResetPasswordMail: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = React.useState("");

  const handleEmailChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(evt.target.value);
  };

  const [showError, setShowError] = useState<{
    isValid: boolean;
    errorMessage: string;
  }>({ isValid: true, errorMessage: "" });

  const handlePasswordEmail = async () => {
    // Aquí iría la lógica para enviar el correo de restablecimiento
    console.log("Correo de restablecimiento enviado");

    const resetpassflow = await fetch(
      `${import.meta.env.VITE_API_SERVER_URL}/v1/auth/resetpasswordmail`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      },
    );

    const data = await resetpassflow.json();

    console.log(data);

    if (!data.success) {
      console.error(
        "Error al enviar correo de restablecimiento:",
        data.message,
      );
      setShowError({
        isValid: false,
        errorMessage: 'No existe usuario ligado a este correo electrónico'
      });
      return;
    }

    navigate("/auth/resetpasswordemailsended");
  };

  return (
    <>
      <InputText>
        <p>Correo</p>
        <input
          name="email"
          type="text"
          placeholder="tu@email.com"
          value={email}
          onChange={handleEmailChange}
        />
      </InputText>
      <AuthButton
        label="Enviar correo de restablecimiento"
        type="DefaultBlue"
        action={handlePasswordEmail}
      />

      {!showError.isValid ? (
        <CredentialAlert $valid={false}>
          <p>{showError.errorMessage}</p>
        </CredentialAlert>
      ) : null}
    </>
  );
};

export default ResetPasswordMail;
