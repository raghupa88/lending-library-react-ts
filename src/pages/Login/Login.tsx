import React, { useState, FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Input from "../../components/Input/Input";
import Button from "../../components/Button/Button";
import "./Login.css";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || "/dashboard";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="container">
        <div className="login__card">
          <div className="login__header">
            <h1 className="login__title">Welcome Back</h1>
            <p className="login__description">
              Sign in to your XXXXX Library account
            </p>
          </div>

          <form className="login__form" onSubmit={handleSubmit}>
            {error && <div className="login__error">{error}</div>}

            <Input
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              placeholder="Enter your email"
            />

            <Input
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              placeholder="Enter your password"
            />

            <div className="login__actions">
              <Button type="submit" fullWidth loading={isLoading}>
                Sign In
              </Button>
            </div>

            <div className="login__demo">
              <p>
                <strong>Demo Credentials:</strong>
              </p>
              <p>Member: member@example.com / password123</p>
              <p>Admin: admin@example.com / password123</p>
            </div>
          </form>

          <div className="login__footer">
            <p>
              Don't have an account?{" "}
              <Link to="/register" className="login__link">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
