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

## 4. Install Modules

In the root folder, `cs3141-team-software-project`, open a terminal session and run:

```sh
pnpm install
```

## 5. Install VSCode & Extensions

I would strongly recommend using VSCode as your primary IDE for this. I have setup some settings to make development a bit faster and cleaner, meant to work specifically in VSCode.

VSCode
https://code.visualstudio.com/download

## 6. Start Local Vite Server

Finally, to start the local vite server, open the root folder (`cs3141-team-software-project`) in your terminal and run the following command:

```sh
pnpm lf
```

This will launch a vite server instance on https://localhost:5173/.

### Extensions

ESLint
https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint

Prettier
https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode
