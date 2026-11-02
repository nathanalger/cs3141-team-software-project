# Getting Started

## Appendix: Things to Research

### Git Conventional Commits

This website gives an overview of the best (standardized) way to write commit messages.

[https://www.conventionalcommits.org/en/v1.0.0/](https://www.conventionalcommits.org/en/v1.0.0/)

### React Roadmap

If you haven't used React much, this roadmap will help:

[https://roadmap.sh/react](https://roadmap.sh/react)

## 1. Installing Deno, Node.js, and pnpm

### Linux + MacOS

Open a terminal on Linux/macOS:

```sh
mkdir -p ~/tmp/
cd ~/tmp/
curl -fsSL https://deno.land/install.sh | sh
```

This will make a temp direcory if it doesnt exist, download the install script, and execute it. The install script will ask you if you'd like to add deno to your PATH. Agree, and then choose your terminal if necessary.

Now, restart your terminal session for changes to take effect.

Install the latest Node.js LTS release from [nodejs.org](https://nodejs.org/en/download). Then install pnpm:

```sh
npm install --global pnpm
```

### Windows

```powershell
irm https://deno.land/install.ps1 | iex
```

This downloads an install script and executes it.

Now, restart your terminal session for changes to take effect.

Install the latest Node.js LTS release from [nodejs.org](https://nodejs.org/en/download), then open a new terminal and install pnpm:

```powershell
npm install --global pnpm
```

Verify that Node.js and pnpm are available:

```sh
node --version
pnpm --version
```

## 2. Clone Repository

You must have git bash installed. Most linux distros come with this by default, and MacOS makes it easy to install with `brew`. You can download it for Windows [here](https://git-scm.com/install/windows).

To get Git SSH to work with your GitHub account, you must make an [SSH key and add it to your github account](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account). Then, set up your Name and Email for your commits with the following commands:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

_(Replace "Your Name" and "your.email@example.com" with your actual name and email respectively)_

Navigate to a directory where you would like the source code downloaded to and run

```sh
git clone git@github.com:nathanalger/cs3141-team-software-project.git
cd cs3141-team-software-project
```

If this succeeds, you will download and navigate into the source folder.

## 3. Install Modules

In the root folder, `cs3141-team-software-project`, open a terminal session and run:

```sh
deno install
```

## 4. Install VSCode & Extensions

I would strongly recommend using VSCode as your primary IDE for this. I have setup some settings to make development a bit faster and cleaner, meant to work specifically in VSCode.

VSCode
https://code.visualstudio.com/download

## 5. Start Local Servers

In the root folder (`cs3141-team-software-project`), run:

```sh
deno task dev
```

Frontend: http://localhost:5173/
Backend: http://localhost:8000/

### Extensions

ESLint
https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint

Prettier
https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode

## Run Frontend Tests

Run the frontend test suite once:

```sh
pnpm test
```

To rerun tests automatically as files change:

```sh
pnpm test:watch
```

## 6. Testing secure IMAP and SMTP connections

The Settings page contains a **Test IMAP and SMTP connections** button. It checks whether the application can establish encrypted connections and authenticate to the configured servers. It does not send an email.

### Environment variables

Set these variables before launching the Electron application:

| Variable | Required | Purpose |
|---|---|---|
| `IMAP_HOST` | Yes | IMAP test-server hostname |
| `IMAP_PORT` | No | IMAP port; defaults to `993` |
| `IMAP_USER` | Yes | IMAP test account username |
| `IMAP_PASSWORD` | Yes | IMAP test account password |
| `SMTP_HOST` | Yes | SMTP test-server hostname |
| `SMTP_PORT` | No | SMTP port; defaults to `587` |
| `SMTP_USER` | Yes | SMTP test account username |
| `SMTP_PASSWORD` | Yes | SMTP test account password |

Use the credentials and server details assigned by your instructor or team. The hostnames below are placeholders, not real test servers.

### Configure a local `.env` file

Copy the example file in the project root and replace the placeholder values
with the credentials and server details assigned by your instructor or team.
The `.env` file is ignored by Git, so your local credentials will not be
committed.

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Linux/macOS:

```sh
cp .env.example .env
```

Edit `.env` and launch the app from the project root with:

```sh
deno task dev
```

The Electron main process loads `.env` at startup. Variables already set in the
environment take precedence over values in the file.

### TLS behavior

- IMAP uses TLS with certificate verification enabled, normally on port `993`.
- SMTP uses implicit TLS on port `465`.
- On other configured SMTP ports, the client requires STARTTLS and verifies the server certificate.
- The connection test authenticates to each server but does not send email.

### Security

- Never commit real passwords, tokens, or private credentials.
- Do not put mail-server passwords in renderer code or shared frontend types.
- Keep local credentials in the ignored `.env` file or an approved local secrets mechanism.
- If a connection fails, check the hostname, port, credentials, network access, and the server's TLS requirements.
## Sending and fetching email (SCRUM-34 / SCRUM-33)

The Inbox now retrieves real messages from the configured IMAP mailbox and includes a
basic compose form that sends through the configured SMTP account.

### Configuration

Set these variables in the ignored root `.env` file (see `.env.example`):

- `IMAP_HOST`, `IMAP_PORT` (normally `993`), `IMAP_USER`, `IMAP_PASSWORD`
- `IMAP_MAILBOX` (optional; defaults to `INBOX`)
- `SMTP_HOST`, `SMTP_PORT` (`465` for implicit TLS or another port supporting STARTTLS),
  `SMTP_USER`, `SMTP_PASSWORD`
- `SMTP_FROM` (optional; defaults to `SMTP_USER`)

IMAP always uses TLS with certificate verification. SMTP uses implicit TLS on port
465 and requires STARTTLS on other configured ports. Do not commit `.env` or real
credentials.

### How to use

1. Start the Electron app with the environment configured.
2. Open Inbox. It fetches the newest 50 messages from `IMAP_MAILBOX` (or `INBOX`).
3. Select **Refresh** to fetch again. Select a message to view its content.
4. Select **Compose**, enter one or more comma- or semicolon-separated recipient
   addresses, a subject, and a plain-text body, then select **Send email**.
5. SMTP success displays the returned message ID. Errors are shown in the Inbox.

### Implementation notes

- `src/main/mail-service.ts` owns the IMAP and SMTP network operations.
- `src/main/index.ts` validates the calling BrowserWindow and exposes the
  `mail:fetch` and `mail:send` IPC handlers.
- `src/preload/index.ts` exposes typed `fetchEmails` and `sendEmail` methods.
- The renderer never receives server passwords.
- IMAP results are serialized to plain data before crossing IPC; the renderer
  reconstructs the `Date` and `Set` values used by the existing email components.
- Fetching is read-only: it does not mark messages as read, delete messages, or
  change mailbox flags. The current compose form sends plain text; rich HTML,
  attachments, account selection, and Sent-folder synchronization are not part
  of these two initial stories.