import { serve } from '@hono/node-server';
import { createJwtPrincipalResolver, unconfiguredResolver } from './api/auth.js';
import { loadServerConfig, StaticMembershipProvisioning } from './config.js';
import { createRuntime } from './container.js';

const config = loadServerConfig(process.env);

const authConfigured = Boolean(config.jwksUrl && config.issuer && config.audience);
const resolvePrincipal = authConfigured
  ? createJwtPrincipalResolver({
      jwks: config.jwksUrl as string,
      issuer: config.issuer as string,
      audience: config.audience as string,
      provisioning: new StaticMembershipProvisioning(config.memberships),
    })
  : unconfiguredResolver;

const runtime = createRuntime({ resolvePrincipal });

const server = serve(
  {
    fetch: runtime.app.fetch,
    port: config.port,
    hostname: '0.0.0.0',
  },
  (info) => {
    console.log(
      JSON.stringify({
        service: 'agntia-legal',
        listening: `http://0.0.0.0:${info.port}`,
        auth: authConfigured ? 'jurisdiction-verified' : 'NOT_CONFIGURED',
        provider: runtime.provider.status,
        note: authConfigured
          ? 'JWT verification enabled; memberships from server configuration'
          : 'No JWT configuration: every authenticated route answers 401 by design',
      }),
    );
  },
);

function shutdown(signal: string): void {
  console.log(JSON.stringify({ service: 'agntia-legal', event: 'shutdown', signal }));
  server.close(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
