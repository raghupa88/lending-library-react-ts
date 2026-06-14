import React, { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Input from "../../components/Input/Input";
import Button from "../../components/Button/Button";
import "../../pages/Login/Login.css";

const Register: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await register({ name, email, password, phone: "", address: "" });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="container">
        <div className="login__card">
          <div className="login__header">
            <h1 className="login__title">Create Account</h1>
            <p className="login__description">
              Join XXXXX Library today
            </p>
          </div>

          <form className="login__form" onSubmit={handleSubmit}>
            {error && <div className="login__error">{error}</div>}

            <Input
              type="text"
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              placeholder="Enter your full name"
            />

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
              placeholder="Choose a password"
            />

            <div className="login__actions">
              <Button type="submit" fullWidth loading={isLoading}>
                Create Account
              </Button>
            </div>
          </form>

          <div className="login__footer">
            <p>
              Already have an account?{" "}
              <Link to="/login" className="login__link">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
