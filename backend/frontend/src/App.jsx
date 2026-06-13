import { useEffect, useState } from "react";
import axios from "axios";
import logo from "./assets/image.png";

const API = "https://deskguard-kts5.onrender.com";

function App() {
  const [desks, setDesks] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    occupied: 0,
    away: 0,
    free: 0,
  });

  const [currentSession, setCurrentSession] = useState(null);
  const [showUsers, setShowUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState("Librarian");
  const [screen, setScreen] = useState("dashboard");

  const [studentName, setStudentName] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchDesks = async () => {
    const res = await axios.get(`${API}/desks`);
    setDesks(res.data);
  };

  const fetchStats = async () => {
    const res = await axios.get(`${API}/admin/stats`);
    setStats(res.data);
  };

  const fetchCurrentSession = async () => {
    try {
      const res = await axios.get(`${API}/student/current-session`);

      if (!res.data.active) {
        setCurrentSession(null);
        return;
      }

      setCurrentSession(res.data);
    } catch (error) {
      console.error(error);
      setCurrentSession(null);
    }
  };

  const fetchData = async () => {
    try {
      await Promise.all([fetchDesks(), fetchStats()]);

      if (selectedUser === "Student") {
        await fetchCurrentSession();
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, [selectedUser]);

  const scrollToLibraryFloor = () => {
    document.getElementById("library-floor")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  const handleRoleSelect = (role) => {
    setSelectedUser(role);
    setMessage("");

    if (role === "Librarian") {
      setScreen("dashboard");
    }

    if (role === "Student") {
      setScreen("student-login");
    }

    if (role === "Support Staff") {
      setScreen("support-login");
    }
  };

  const handleStudentLogin = (event) => {
    event.preventDefault();

    if (!studentName.trim()) {
      setMessage("Please enter your name.");
      return;
    }

    setSelectedUser("Student");
    setScreen("student-dashboard");
    setMessage("");
    fetchCurrentSession();
  };

  const handleDeskCheckIn = async (desk) => {
    if (!desk?.desk_number) {
      setMessage("Invalid desk selected.");
      return;
    }

    if (currentSession) {
      setMessage(
        "You already have an active session. Checkout before selecting another desk."
      );
      return;
    }

    if (desk.status !== "FREE") {
      setMessage("This desk is not available right now.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const res = await axios.post(`${API}/checkin/${desk.desk_number}`, {
        student_name: studentName,
      });

      if (res.data.error) {
        setMessage(res.data.error);
        return;
      }

      setCurrentSession({
        active: true,
        session_id: res.data.session_id,
        desk_number: res.data.desk_number || desk.desk_number,
        status: res.data.status || "OCCUPIED",
      });

      await fetchDesks();
      await fetchStats();
      await fetchCurrentSession();

      setMessage(res.data.message || `Checked into Desk ${desk.desk_number}.`);
    } catch (error) {
      console.error(error);
      setMessage(
        error.response?.data?.error ||
          error.response?.data?.detail ||
          "Unable to check in."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAway = async () => {
    if (!currentSession?.session_id) {
      setMessage("No active session found.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const res = await axios.post(`${API}/away/${currentSession.session_id}`);

      if (res.data.error) {
        setMessage(res.data.error);
        return;
      }

      await fetchDesks();
      await fetchStats();
      await fetchCurrentSession();

      setMessage(res.data.message || "Away timer started.");
    } catch (error) {
      setMessage(error.response?.data?.error || "Unable to mark away.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!currentSession?.session_id) {
      setMessage("No active session found.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const res = await axios.post(
        `${API}/checkout/${currentSession.session_id}`
      );

      if (res.data.error) {
        setMessage(res.data.error);
        return;
      }

      setCurrentSession(null);

      await fetchDesks();
      await fetchStats();

      setMessage(res.data.message || "Checked out successfully.");
    } catch (error) {
      setMessage(error.response?.data?.error || "Unable to checkout.");
    } finally {
      setLoading(false);
    }
  };

  const getDeskColor = (status) => {
    if (status === "OCCUPIED") {
      return "bg-red-500 text-white";
    }

    if (status === "AWAY") {
      return "bg-yellow-400 text-slate-900";
    }

    return "bg-green-500 text-white";
  };

  const renderDeskGrid = (clickable = false) => (
    <div className="grid grid-cols-5 gap-3">
      {[...desks]
        .sort((a, b) => a.desk_number - b.desk_number)
        .map((desk) => {
          const isFree = desk.status === "FREE";

          if (clickable) {
            return (
              <button
                key={desk.id}
                type="button"
                disabled={loading || !isFree || Boolean(currentSession)}
                onClick={() => handleDeskCheckIn(desk)}
                className={`${getDeskColor(
                  desk.status
                )} h-32 rounded-xl shadow flex flex-col items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                <div className="bg-white text-slate-800 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-2">
                  {desk.desk_number}
                </div>

                <h3 className="font-bold text-sm">Desk {desk.desk_number}</h3>

                <div className="text-xs bg-white/20 px-2 py-1 rounded-lg mt-2">
                  {desk.status}
                </div>
              </button>
            );
          }

          return (
            <div
              key={desk.id}
              className={`${getDeskColor(
                desk.status
              )} h-32 rounded-xl shadow flex flex-col items-center justify-center`}
            >
              <div className="bg-white text-slate-800 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-2">
                {desk.desk_number}
              </div>

              <h3 className="font-bold text-sm">Desk {desk.desk_number}</h3>

              <div className="text-xs bg-white/20 px-2 py-1 rounded-lg mt-2">
                {desk.status}
              </div>
            </div>
          );
        })}
    </div>
  );

  return (
    <div className="h-screen flex bg-slate-100 overflow-hidden">
      <img
        src={logo}
        alt="Logo"
        className="fixed top-4 right-6 h-16 z-50"
      />

      <div className="w-44 bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950 text-white flex flex-col">
        <div className="p-4">
          <h1 className="text-2xl font-bold">DeskGuard</h1>
        </div>

        <div className="px-2 flex flex-col gap-2">
          <button
            onClick={() => {
              if (selectedUser === "Student") {
                setScreen("student-dashboard");
              } else {
                setScreen("dashboard");
              }
            }}
            className="w-full flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2 transition"
          >
            <span>Home</span>
          </button>

          <button
            onClick={() => {
              if (selectedUser === "Student") {
                setScreen("student-dashboard");
              } else {
                setScreen("dashboard");
              }

              setTimeout(scrollToLibraryFloor, 100);
            }}
            className="w-full flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2 transition"
          >
            <span>Floor</span>
          </button>

          <button
            onClick={() => setShowUsers(!showUsers)}
            className="w-full flex items-center justify-between bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2 transition"
          >
            <span>User</span>
            <span>{showUsers ? "▲" : "▼"}</span>
          </button>

          {showUsers && (
            <div className="bg-white/10 rounded-lg overflow-hidden">
              {["Librarian", "Student", "Support Staff"].map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleSelect(role)}
                  className="w-full text-left px-3 py-2 hover:bg-white/20 flex justify-between"
                >
                  <span>{role}</span>
                  {selectedUser === role && <span>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-auto p-4 text-xs text-slate-400">
          Current User:
          <br />
          <span className="text-white font-semibold">{selectedUser}</span>
        </div>
      </div>

      {screen === "student-login" && (
        <div className="flex-1 flex items-center justify-center">
          <form
            onSubmit={handleStudentLogin}
            className="bg-white rounded-2xl shadow-xl p-8 w-96"
          >
            <h2 className="text-3xl font-bold mb-2">Student Login</h2>

            <p className="text-slate-500 mb-6">
              Access your desk booking portal
            </p>

            <input
              type="text"
              placeholder="Name"
              value={studentName}
              onChange={(event) => setStudentName(event.target.value)}
              className="w-full border rounded-xl p-3 mb-4"
            />

            <input
              type="password"
              placeholder="Password"
              value={studentPassword}
              onChange={(event) => setStudentPassword(event.target.value)}
              className="w-full border rounded-xl p-3 mb-4"
            />

            {message && (
              <p className="text-sm text-red-600 mb-4">{message}</p>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-semibold"
            >
              Sign In
            </button>
          </form>
        </div>
      )}

      {screen === "support-login" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-96">
            <h2 className="text-3xl font-bold mb-2">Support Staff Login</h2>

            <p className="text-slate-500 mb-6">
              Access support operations
            </p>

            <input
              type="text"
              placeholder="Name"
              className="w-full border rounded-xl p-3 mb-4"
            />

            <input
              type="password"
              placeholder="Password"
              className="w-full border rounded-xl p-3 mb-6"
            />

            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-semibold">
              Sign In
            </button>
          </div>
        </div>
      )}

      {screen === "student-dashboard" && (
        <div className="flex-1 p-5 overflow-auto">
          <div className="mb-5">
            <h1 className="text-3xl font-bold text-slate-900">
              Student Dashboard
            </h1>

            <p className="text-sm text-slate-500">
              Select a free desk, manage your current session, and checkout when
              done.
            </p>
          </div>

          {message && (
            <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl px-4 py-3">
              {message}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-xs text-slate-500">Student</p>
              <h2 className="text-xl font-bold">{studentName || "Student"}</h2>
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-xs text-slate-500">Current Desk</p>
              <h2 className="text-xl font-bold">
                {currentSession?.desk_number || "None"}
              </h2>
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-xs text-slate-500">Session Status</p>
              <h2 className="text-xl font-bold">
                {currentSession?.status || "No Active Session"}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_360px] gap-5">
            <div id="library-floor" className="bg-white rounded-2xl shadow p-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-bold">Live Desk Selection</h2>
                  <p className="text-sm text-slate-500">
                    Click any free desk to check in.
                  </p>
                </div>
              </div>

              {renderDeskGrid(true)}
            </div>

            <div className="bg-white rounded-2xl shadow p-5 h-fit">
              <h2 className="text-xl font-bold mb-1">Current Session</h2>

              <p className="text-sm text-slate-500 mb-5">
                Your active library desk session.
              </p>

              {currentSession ? (
                <>
                  <div className="bg-slate-50 border rounded-xl p-4 mb-4">
                    <p className="text-xs text-slate-500">Desk</p>

                    <h3 className="text-2xl font-bold mb-3">
                      Desk {currentSession.desk_number}
                    </h3>

                    <p className="text-xs text-slate-500">Session ID</p>
                    <p className="font-semibold mb-3">
                      {currentSession.session_id}
                    </p>

                    <p className="text-xs text-slate-500">Status</p>
                    <p className="font-semibold">{currentSession.status}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleAway}
                      disabled={loading}
                      className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 rounded-xl py-3 font-semibold disabled:opacity-60"
                    >
                      Away
                    </button>

                    <button
                      onClick={handleCheckout}
                      disabled={loading}
                      className="bg-red-600 hover:bg-red-700 text-white rounded-xl py-3 font-semibold disabled:opacity-60"
                    >
                      Checkout
                    </button>
                  </div>
                </>
              ) : (
                <div className="bg-slate-50 border rounded-xl p-4 text-slate-500">
                  No active session. Select a free desk to check in.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {screen === "dashboard" && (
        <div className="flex-1 p-5 overflow-auto">
          <div className="mb-5">
            <h1 className="text-3xl font-bold text-slate-900">
              Librarian Dashboard
            </h1>

            <p className="text-sm text-slate-500">
              Real-Time Library Monitoring
            </p>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded-xl shadow p-3">
              <p className="text-xs text-slate-500">Total</p>
              <h2 className="text-2xl font-bold">{stats.total}</h2>
            </div>

            <div className="bg-red-500 text-white rounded-xl shadow p-3">
              <p className="text-xs">Occupied</p>
              <h2 className="text-2xl font-bold">{stats.occupied}</h2>
            </div>

            <div className="bg-green-500 text-white rounded-xl shadow p-3">
              <p className="text-xs">Free</p>
              <h2 className="text-2xl font-bold">{stats.free}</h2>
            </div>

            <div className="bg-yellow-400 rounded-xl shadow p-3">
              <p className="text-xs">Away</p>
              <h2 className="text-2xl font-bold">{stats.away}</h2>
            </div>
          </div>

          <div id="library-floor" className="bg-white rounded-2xl shadow p-4">
            <h2 className="text-xl font-bold mb-4">Library Floor</h2>
            {renderDeskGrid(false)}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;