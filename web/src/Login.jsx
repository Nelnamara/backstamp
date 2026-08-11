import { useState } from "react";

export default function Login() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  function submit(e) {
    e.preventDefault();
    setSending(true);
    setError(null);

    const url = mode === "signin" ? "/auth/login/request" : "/auth/signup/request";
    const body =
      mode === "signin"
        ? { email }
        : { email, username, invite_code: inviteCode };

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data.detail || "Something went wrong");
        }
        setSent(true);
      })
      .catch((err) => setError(err.message))
      .finally(() => setSending(false));
  }

  if (sent) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <span className="wordmark">BACKSTAMP</span>
          <div className="state-title" style={{ marginTop: 24 }}>Check your email</div>
          <p className="state-sub">
            A sign-in link is on its way to <strong>{email}</strong>. It expires in 15 minutes —
            if it doesn't show up, check spam.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <span className="wordmark">BACKSTAMP</span>
        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab ${mode === "signin" ? "active" : ""}`}
            onClick={() => {
              setMode("signin");
              setError(null);
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`login-tab ${mode === "signup" ? "active" : ""}`}
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
          >
            Sign up with invite
          </button>
        </div>

        <label className="login-label">Email</label>
        <input
          className="finput"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />

        {mode === "signup" && (
          <>
            <label className="login-label">Username</label>
            <input
              className="finput"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="How you'll appear to others"
            />
            <label className="login-label">Invite code</label>
            <input
              className="finput"
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="From someone already in"
            />
          </>
        )}

        {error && <div className="login-error">{error}</div>}

        <button className="add-btn" type="submit" disabled={sending} style={{ marginTop: 16 }}>
          {sending ? "Sending…" : "Send sign-in link"}
        </button>
      </form>
    </div>
  );
}
