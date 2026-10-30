# @plaios/registry

Local PLAIOS plugin registry: [Verdaccio](https://verdaccio.org) and the PLAIOS Store UI in one Node process, on one port. No Docker.

```bash
npx @plaios/registry            # http://localhost:4873
npx @plaios/registry --host 0.0.0.0 --port 4873   # share it on your network or tailnet
```

- **Store:** open the URL in a browser to browse, search and inspect plugins, with copyable install commands.
- **Registry:** point npm, pnpm or `plaios` at the same URL. Packages it doesn't have are proxied from npmjs.
- **Publish:** `npm adduser --registry http://localhost:4873` once, then `npm publish --registry http://localhost:4873`.
- **Data:** `~/.plaios/registry` (`config.yaml`, `storage/`, `htpasswd`); override with `--home` or `PLAIOS_REGISTRY_HOME`.

`plaios init` starts it for you when you pick **Local registry**.

Development: `pnpm build`, then `pnpm start`; `pnpm dev` runs the UI with hot reload against a registry on 4873.
