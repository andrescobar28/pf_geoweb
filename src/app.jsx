/* GEOPOTAMO · root app
   Estados:
     loading   → consulta sesión
     viewer    → HIPOVIEWER (sin sesión, modo público)
     login     → pantalla de acceso
     reporter  → HIPOREPORTER dashboard
     admin     → HIPOADMIN dashboard
*/

const { useState, useEffect } = React;

function App() {
  const [view, setView] = useState("loading"); // loading | viewer | login | reporter | admin
  const [user, setUser] = useState(null);

  useEffect(() => {
    window.GP.currentUser().then(u => {
      if (u) {
        setUser(u);
        setView(u.rol === "admin" ? "admin" : "reporter");
      } else {
        setView("login");
      }
    });
  }, []);

  const ToastProvider  = window.GPUI.ToastProvider;
  const LoginScreen    = window.GPLogin;
  const ViewerDashboard= window.GPViewer;
  const ReporterDash   = window.GPReporter;
  const AdminDash      = window.GPAdmin;

  async function signOut() {
    await window.GP.signOut();
    setUser(null);
    setView("login");
  }

  function handleAuth(u) {
    setUser(u);
    setView(u.rol === "admin" ? "admin" : "reporter");
  }

  if (view === "loading") {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="mono uppercase tracking-[.25em] text-[11px] opacity-65">Cargando GEOPOTAMO…</div>
      </div>
    );
  }

  return (
    <ToastProvider>
      {view === "login"    && <LoginScreen onAuth={handleAuth} onViewer={() => setView("viewer")}/>}
      {view === "viewer"   && <ViewerDashboard onSignIn={() => setView("login")}/>}
      {view === "reporter" && user && <ReporterDash user={user} onSignOut={signOut}/>}
      {view === "admin"    && user && <AdminDash user={user} onSignOut={signOut}/>}
    </ToastProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
