export function LoginPage({ error }: { error?: string }) {
  return (
    `<html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Login — Atta Chakki Admin</title>
      </head>
      <body>
        <h1>Admin Login</h1>
        {error && <p style="color:red">Invalid email or password</p>}
        <form method="POST" action="/login">
          <input name="email" type="email" placeholder="Email" required />
          <input name="password" type="password" placeholder="Password" required />
          <button type="submit">Login</button>
        </form>
      </body>
    </html>`
  )
}