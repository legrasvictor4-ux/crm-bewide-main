import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const LogoutPage = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    logout().finally(() => navigate("/login", { replace: true }));
  }, [logout, navigate]);

  return <p className="text-sm text-muted-foreground">Déconnexion en cours...</p>;
};

export default LogoutPage;
