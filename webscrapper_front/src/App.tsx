import "./App.css";
import Header from "./components/header";
import GlobalStyle from "./styles/GlobalStyles";
import ContextProvider from "./Context/ContextProvider";
import Dashboard from "./components/dashboard";
import { useContext, useEffect } from "react";
import { ThemeContext, SubscriptionContext, AuthContext, type PreferedScheme } from "./Context/ContextConfig";
import AuthView from "./components/authview";
import { Route, Routes, useNavigate } from "react-router";
import Home from "./components/home";
import Calendar from "./components/calendar/Calendar";
import PrivacyPolicy from "./components/PrivacyPolicy";
import Pricing from "./components/Pricing";
import Support from "./components/Support";
import SuccessPayment from "./components/SuccessPayment";
import Alert from "./components/modalAlert";
import AdminPanel from "./components/AdminPanel";

function App() {
  return (
    <ContextProvider>
      <GlobalStyleWithTheme />
      <Alert />
      <Header />
      {/* <Route path="Auth" element={<AuthView mode="SignIn" />}></Route> */}
      <Routes>
        <Route path="home" element={<Home/>}></Route>
        <Route path="auth/register" element={<AuthView mode="SignUp" />}></Route>
        <Route path="auth/signin" element={<AuthView mode="SignIn" />}></Route>
        <Route path="dashboard" element={<Dashboard />}></Route>
        <Route path="auth/setpassword" element={<AuthView mode="SetPassword"/>}></Route>
        <Route path="auth/registercompleted" element={<AuthView mode="RegisterCompleted"/>}></Route>
        <Route path="auth/resetpasswordinitflow" element={<AuthView mode="ResetPasswordInitFlow"/>}></Route>
        <Route path="auth/resetpasswordcompleted" element={<AuthView mode="ResetPasswordCompleted"/>}></Route>
        <Route path="auth/resetpasswordemailsended" element={<AuthView mode="ResetPasswordEmailSended"/>}></Route>
        <Route path="auth/loggedin" element={<AuthView mode="LoggedIn"/>}></Route>
        <Route path="auth/emailsended" element={<AuthView mode="EmailSended"/>}></Route>
        <Route path="auth/verifiedaccount" element={<AuthView mode="Verified"/>}></Route>
        <Route path="calendar" element={<SubscriptionGuard><Calendar /></SubscriptionGuard>}></Route>
        <Route path="admin" element={<AdminGuard><AdminPanel /></AdminGuard>}></Route>
        <Route path="privacy" element={<PrivacyPolicy />}></Route>
        <Route path="pricing" element={<Pricing />}></Route>
        <Route path="support" element={<Support />}></Route>
        <Route path="success_payment" element={<SuccessPayment />}></Route>
      </Routes>
    </ContextProvider>
  );
}

const GlobalStyleWithTheme = () => {
  const theme = useContext(ThemeContext);
  return <GlobalStyle $theme={(theme?.theme as PreferedScheme) ?? "Dark"} />;
};

const SubscriptionGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const subscription = useContext(SubscriptionContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!subscription?.isSubscribed) navigate("/pricing");
  }, [subscription?.isSubscribed, navigate]);

  if (!subscription?.isSubscribed) return null;
  return <>{children}</>;
};

const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (auth?.session && auth.session.agente_role !== "admin") navigate("/dashboard");
  }, [auth?.session, navigate]);

  if (!auth?.session || auth.session.agente_role !== "admin") return null;
  return <>{children}</>;
};

export default App;
