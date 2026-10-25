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

### Windows PowerShell

From the project root, set the variables in the same terminal session:

```powershell
$env:IMAP_HOST = "imap.example.test"
$env:IMAP_PORT = "993"
$env:IMAP_USER = "your-test-user"
$env:IMAP_PASSWORD = "your-test-password"

$env:SMTP_HOST = "smtp.example.test"
$env:SMTP_PORT = "587"
$env:SMTP_USER = "your-test-user"
$env:SMTP_PASSWORD = "your-test-password"
```

Start the Electron application using the project's configured development task. For example, if `package.json` defines the `dev` script:

```powershell
pnpm.cmd dev
```

Alternatively, use the corresponding Deno task if it is configured to launch Electron.

### TLS behavior

- IMAP uses TLS with certificate verification enabled, normally on port `993`.
- SMTP uses implicit TLS on port `465`.
- On other configured SMTP ports, the client requires STARTTLS and verifies the server certificate.
- The connection test authenticates to each server but does not send email.

### Security

- Never commit real passwords, tokens, or private credentials.
- Do not put mail-server passwords in renderer code or shared frontend types.
- Keep local credentials in environment variables or an approved local secrets mechanism.
- If a connection fails, check the hostname, port, credentials, network access, and the server's TLS requirements.