// Checks the Meta (Instagram + Facebook) settings before switching posting on. Read-only: it posts nothing.
// Usage: npm run meta:check
import { META_GRAPH_VERSION, POST_PLATFORMS, metaSettings, publicBaseUrl } from '@/lib/config';
import { graph, pageAccessToken } from '@/lib/publishing/meta';

let failed = false;

async function check(label: string, run: () => Promise<string>): Promise<void> {
  try {
    console.log(`  ✓ ${label}: ${await run()}`);
  } catch (err) {
    failed = true;
    console.log(`  ✗ ${label}: ${err instanceof Error ? err.message : err}`);
  }
}

async function main() {
  console.log(`Meta settings check (Graph API ${META_GRAPH_VERSION}, posting to: ${POST_PLATFORMS.join(', ')}), nothing is posted:`);
  const settings = metaSettings(); // throws a clear message if a setting is missing

  await check('Token', async () => {
    const me = await graph<{ id: string; name?: string }>('me', { fields: 'id,name', access_token: settings.accessToken });
    return `belongs to ${me.name ?? me.id}`;
  });
  await check('Facebook Page', async () => {
    const page = await graph<{ name: string }>(settings.pageId, { fields: 'name', access_token: settings.accessToken });
    return page.name;
  });
  await check('Page access token', async () => ((await pageAccessToken(settings)) ? 'available' : 'missing'));
  if (POST_PLATFORMS.includes('instagram')) {
    await check('Instagram account', async () => {
      const ig = await graph<{ username: string }>(settings.igUserId, { fields: 'username', access_token: await pageAccessToken(settings) });
      return `@${ig.username}`;
    });
    await check('Instagram posting limit', async () => {
      const limit = await graph<{ data: { quota_usage: number; config?: { quota_total: number } }[] }>(`${settings.igUserId}/content_publishing_limit`, {
        fields: 'quota_usage,config',
        access_token: await pageAccessToken(settings),
      });
      const usage = limit.data[0];
      return `${usage?.quota_usage ?? 0} of ${usage?.config?.quota_total ?? '?'} posts used in the last 24 hours`;
    });
  } else {
    console.log('  – Instagram: skipped (not in POST_PLATFORMS)');
  }
  await check('Public address', async () => {
    const res = await fetch(`${publicBaseUrl()}/login`);
    if (!res.ok) throw new Error(`${publicBaseUrl()} answered ${res.status}`);
    return `${publicBaseUrl()} is reachable`;
  });

  console.log(failed ? '\nFix the ✗ items before setting PUBLISH_DRY_RUN=0.' : '\nAll good: posting can be switched on with PUBLISH_DRY_RUN=0.');
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
