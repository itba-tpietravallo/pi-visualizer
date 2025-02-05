# pi-visualizer
Abstract Data Types (ADTs) visualization tool for the Imperative Programming (72.31) course at ITBA

## Contributing

Contributions are welcome. Keep in mind some of the older commits (6929938d9446b5eba65e70ef5c6a2d97872fccbd through 7d76cbac020c39a6c07cddece3adbb6b18c946c1) were patched in from a private repository.

This code is hosted under a subdomain and embeded as an `<iframe>` at https://www.tomaspietravallo.com/blog/itba-pi-visualizer

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

### Using Docker

Make sure that Docker Daemon is running, then run the following commands:

```bash
docker pull node:alpine3.20
docker run -ti -v .:/app -p 13000:3000 --entrypoint "/bin/sh" node:alpine3.20
npm run dev
```
Open [http://localhost:13000](http://localhost:13000) with your browser to see the result.
