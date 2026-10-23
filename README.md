# CS3141 Team Software Project: Email Client

A project for MTU-CS3141 Team Software Project. The application is a frontend client with an API for communication with Google's SMTP and IMAP servers. Utilizes a Deno + Typescript + React + Vite tech stack.

## Getting Started

Open [Getting Started](./getting-started.md).

## Start the Desktop App

Install [Deno](https://deno.com/) and pnpm, then run this from the repository root to start dev app:

```sh
deno task dev
```

To build a "release" version, run:

```sh
deno task package
```

If electron gives you a fit about "Electron Uninstall," run this and allow permissions:

```sh
pnpm electron_fix
```

For installing packages, use pnpm, _not deno_!

## Appendix

### Jira Link

https://mtu-cs3141-team-11.atlassian.net/jira/
