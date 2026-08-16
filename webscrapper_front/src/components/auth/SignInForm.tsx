import React, { useContext, useState } from "react";
import { AuthButton, CredentialAlert, InputText } from "./styles";
import { useNavigate } from "react-router";
import { AuthContext } from "../../Context/ContextConfig";
import type { session_claims } from "../../Types/types";
import styled from "styled-components";

const SignInForm: React.FC = () => {
  const navigate = useNavigate();

  const auth = useContext(AuthContext);

  const [credentials, setCredentials] = React.useState({
    email: "",
    password: "",
  });

  const [showError, setShowError] = useState<{
    isValid: boolean;
    errorMessage: string;
  }>({ isValid: true, errorMessage: "" });

  async function handleSignIn(credentials: {
    email: string;
    password: string;
  }) {
    const auth_res = await fetch(
      `${import.meta.env.VITE_API_SERVER_URL}/v1/auth/authenticate/manual`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      },
    );

    const auth_data = await auth_res.json();

    if (auth_data.success) {
      console.log(auth_data);
      /**
       * Aqui se debe de guardar el JWT de sesion
       */
      localStorage.setItem("session_jwt", auth_data.payload.jwt_token);

      const session_req = await fetch(
        `${import.meta.env.VITE_API_SERVER_URL}/v1/auth/checkSession`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth_data.payload.jwt_token}`,
          },
        },
      );

      const session_data: {
        success: boolean;
        payload: session_claims;
        message?: string;
      } = await session_req.json();
      if (!session_data.success) {
        console.error("Error al verificar sesión:", session_data.message);
        auth?.setIsAuthenticated(false);
        navigate("/home");
        return;
      }

      auth?.setSession(session_data.payload);
      auth?.setIsAuthenticated(true);
      navigate("/dashboard");
    } else {
      console.error("Error al iniciar sesión:", auth_data.message);
      setShowError({
        isValid: false,
        errorMessage: auth_data.message,
      });
    }
  }

  return (
    <>
      <p>Inicia sesion para acceder al sistema</p>
      <InputText>
        <p>Email</p>
        <input
          type="text"
          placeholder="tu@email.com"
          value={credentials.email}
          onChange={(e) =>
            setCredentials({ ...credentials, email: e.target.value })
          }
        />
      </InputText>
      <InputText>
        <p>Contraseña</p>
        <input
          type="password"
          placeholder="Contraseña"
          value={credentials.password}
          onChange={(e) =>
            setCredentials({ ...credentials, password: e.target.value })
          }
        />
      </InputText>
      <SignInFooter>
        <AuthButton
          label="Iniciar sesión"
          type="DefaultBlue"
          action={() => {
            handleSignIn(credentials);
          }}
        />
        <ForgotPassLink onClick={()=>{navigate('/auth/resetpasswordinitflow')}}>Olvidé mi contraseña</ForgotPassLink>
      </SignInFooter>
      {!showError.isValid ? (
        <CredentialAlert $valid={false}>
          <p>{showError.errorMessage}</p>
        </CredentialAlert>
      ) : null}
      {/* <Button label="Entrar como Demo" type="Default" /> */}
    </>
  );
};

const SignInFooter = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
`

const ForgotPassLink = styled.p`
  display: inline-block;
  color: blue;
  text-decoration: underline;
  cursor: pointer;
`

export default SignInForm;
