import { useState } from "react";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

function App() {
  const [page, setPage] = useState<"login" | "register">("login");

  if (page === "register") {
    return <RegisterPage onNavigateLogin={() => setPage("login")} />;
  }
  return <LoginPage onNavigateRegister={() => setPage("register")} />;
}

export default App;
