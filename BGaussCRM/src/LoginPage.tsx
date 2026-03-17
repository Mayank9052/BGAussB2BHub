import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

import logo from "./assets/logo.jpg";


const LoginPage = () => {

  const [identifier,setIdentifier] = useState("");
  const [password,setPassword] = useState("");

  const navigate = useNavigate();

  const handleLogin = (e:React.FormEvent) =>{
    e.preventDefault();

    if(identifier && password){
      navigate("/dashboard");
    }else{
      alert("Enter credentials");
    }
  };

  return (

    <div className="page">

      {/* NAVBAR */}

      <nav className="navbar">

        <div className="nav-left">
         <img src={logo} alt="BGauss" className="nav-logo"/>
          <span className="nav-title">BGauss Dealer Portal</span>
        </div>

      </nav>


      {/* LOGIN AREA */}

      <div className="login-container">

        <form className="login-card" onSubmit={handleLogin}>

          <h2>Dealer Login</h2>

          {/* EMAIL */}

          <div className="input-group">

            <input
              type="text"
              required
              value={identifier}
              onChange={(e)=>setIdentifier(e.target.value)}
            />

            <label>Email</label>

          </div>


          {/* PASSWORD */}

          <div className="input-group">

            <input
              type="password"
              required
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
            />

            <label>Password</label>

          </div>


          <button className="login-btn">
            Login
          </button>

        </form>


        {/* SCOOTER IMAGE */}

       

      </div>

    </div>

  );
};

export default LoginPage;