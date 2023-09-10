<h1 align="center">Reindeer 🦌</h1>

<p align="center">A Discord bot by BSR that helps server admins manage user reports more efficiently and organised.</p>

<p align="center">
  <a href="https://top.gg/bot/1126157327746211840">
    <img src="https://top.gg/api/widget/servers/1126157327746211840.svg" alt="Top.gg Servers (for hosted bot)">
  </a>
  <a href="https://top.gg/bot/1126157327746211840">
    <img src="https://top.gg/api/widget/upvotes/1126157327746211840.svg" alt="Top.gg Upvotes (for hosted bot)">
  </a>
  <a href="https://discord.gg/R2FDvcPXTK">
    <img src="https://img.shields.io/discord/983301648829001768?color=5865F2&logo=discord&logoColor=white" alt="Support Server" />
  </a>
  <a href="https://github.com/GodderE2D/Reindeer/actions">
    <img src="https://github.com/GodderE2D/Reindeer/actions/workflows/tests.yml/badge.svg" alt="CI Tests Status" />
  </a>
  <a href="https://github.com/sponsors/GodderE2D">
    <img src="https://img.shields.io/badge/sponsor-GodderE2D-ea4aaa?logo=github&logoColor=white" alt="GitHub Sponsors" />
  </a>
</p>

---

To see a full list of features, documentation, and to invite the bot visit https://reindeer.bsr.gg/.

# Features

- [x] User and message report commands are both available as context menu commands and slash commands.
- [x] Easy to setup with a guided setup command.
- [x] Powerful configuration, customise up to 5 user-input fields when reporting.
- [x] View reports in a neatly organised forum channel.
- [ ] Easily manage and sort reports.
- [x] Customize and add more fields for reports.
- [x] Track messages and users that have been reported, such as edits, deletions, joins, and leaves.
- [ ] Inform reporters about their reports status.
- [x] Disallow more than one report on a message/user in a specified period.

# Installing

> [!NOTE]  
> If you just want to use the publicly hosted version of the bot, you can invite it from
> [the website](https://reindeer.bsr.gg/).

To locally install the bot yourself (e.g. if you want to contribute or self-host), follow these steps:

## Prerequisites

- Node.js 16.11.0 or later
- Yarn classic (1.22.19)
- A Discord application and bot
- A PostgreSQL database (to run one locally, see [here](https://www.postgresql.org/docs/current/tutorial-install.html))

## Setup

Once you've cloned the repository from GitHub, install the required Node dependencies.

```sh
yarn
```

Copy the `.env.example` file to a new `.env` file and fill out the environment variables listed inside.

```sh
cp .env.example .env
```

Push the Prisma schema to your Postgres database.

```sh
yarn push

# If you don't have a database yet, you can still generate typings
yarn generate
```

Compile the bot with tsc. Leave this terminal tab open while developing the bot. In production, you can use `yarn build`
instead.

```sh
# Development (watch mode)
yarn build:dev

# Production
yarn build
```

Finally, you can run the bot using nodemon in development or pm2 in production.

```sh
# Development
yarn dev

# Production
pm2 start dist/index.js

# Or, just using node
yarn start
```

# Contributing & Support

If you need support with the bot, feel free to [join our Discord server](https://reindeer.bsr.gg/discord).

If you'd like to contribute to the bot, please review our [code of conduct](CODE_OF_CONDUCT.md) first. If you have a bug
report, feature request, please [open an issue](https://github.com/GodderE2D/reindeer/issues). If you're interested in
fixing a bug or adding a new feature, please [open a pull request](https://github.com/GodderE2D/reindeer/pulls).

If you'd like to report a security vulnerability or otherwise want to contact me, please email me at
[goddere2d@modslides.com](mailto:goddere2d@modslides.com) or [godderseesyou@gmail.com](mailto:godderseesyou@gmail.com).

## PR Guidelines

- Please follow the [conventional commits specification](https://www.conventionalcommits.org/en/v1.0.0/) where possible
  (you may also use `docs`, `chore` or other headers).
- Please use `yarn test` to ensure TypeScript, ESLint, and Prettier checks pass.
- Please do not include out-of-scope changes in a PR, instead open a separate PR for those changes.
- Please do not use translators to edit language files.

# License

Reindeer is licensed under the [Apache License 2.0](https://github.com/GodderE2D/Reindeer/blob/main/LICENSE).
