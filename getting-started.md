# Getting Started

## Appendix: Things to Research

### Git Conventional Commits

This website gives an overview of the best (standardized) way to write commit messages.

[https://www.conventionalcommits.org/en/v1.0.0/](https://www.conventionalcommits.org/en/v1.0.0/)

### React Roadmap

If you haven't used React much, this roadmap will help:

[https://roadmap.sh/react](https://roadmap.sh/react)

## 1. Installing Deno

### Linux + MacOS
Open a terminal on Linux/macOS:

```sh
mkdir -p ~/tmp/
cd ~/tmp/
curl -fsSL https://deno.land/install.sh | sh
```

This will make a temp direcory if it doesnt exist, download the install script, and execute it. The install script will ask you if you'd like to add deno to your PATH. Agree, and then choose your terminal if necessary.

Now, restart your terminal session for changes to take effect.

### Windows

```powershell
irm https://deno.land/install.ps1 | iex
```

This downloads an install script and executes it.

Now, restart your terminal session for changes to take effect.

## 2. Install pnpm Package Manager

This project uses pnpm, which is a package manager very similar to npm, but it does a better job at optimizing packages.

```sh
deno install --global -A npm:pnpm
```

## 3. Clone Repository

...

## 4. Install Modules

In the root folder, `cs3141-team-software-project`, open a terminal session and run:

```sh
pnpm install
```