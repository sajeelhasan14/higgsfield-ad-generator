// Checks the Meta (Instagram + Facebook, and paid ads) settings before switching them on. Read-only: it posts and spends nothing.
// Usage: npm run meta:check
//        npm run meta:check -- --try-instagram   also prepares an Instagram post without publishing it
import { META_GRAPH_VERSION, POST_PLATFORMS, metaAdsSettings, metaSettings, publicBaseUrl } from '@/lib/config';
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
    if (process.argv.includes('--try-instagram')) {
      // Only the first of Instagram's two posting steps: the container is never published and Meta deletes it after 24 hours.
      await check('Instagram post test (not published)', async () => {
        const token = await pageAccessToken(settings);
        const picture = await graph<{ data: { url: string } }>(`${settings.pageId}/picture`, { redirect: '0', width: '1080', height: '1080', access_token: token });
        const container = await graph<{ id: string }>(`${settings.igUserId}/media`, { image_url: picture.data.url, caption: 'Ad Studio test, never published', access_token: token }, 'POST');
        for (let attempt = 0; attempt < 6; attempt++) {
          const { status_code } = await graph<{ status_code: string }>(container.id, { fields: 'status_code', access_token: token });
          if (status_code === 'FINISHED') return 'Instagram accepted a test post (it was not published)';
          if (status_code === 'ERROR' || status_code === 'EXPIRED') throw new Error(`Instagram could not process the test image (${status_code})`);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        return 'Instagram accepted the request; the test image was still processing';
      });
    }
  } else {
    console.log('  – Instagram: skipped (not in POST_PLATFORMS)');
  }
  await check('Public address', async () => {
    const res = await fetch(`${publicBaseUrl()}/login`);
    if (!res.ok) throw new Error(`${publicBaseUrl()} answered ${res.status}`);
    return `${publicBaseUrl()} is reachable`;
  });

  // Paid ads (the Meta Ads page): only checked once META_AD_ACCOUNT_ID is set, so posting can be checked without it.
  if (process.env.META_AD_ACCOUNT_ID?.trim()) {
    const ads = metaAdsSettings();
    await check('Ads permission', async () => {
      const perms = await graph<{ data: { permission: string; status: string }[] }>('me/permissions', { access_token: ads.accessToken });
      if (!perms.data.some((p) => p.permission === 'ads_management' && p.status === 'granted')) {
        throw new Error('the token has no ads_management: generate a new System User token with it ticked');
      }
      return 'ads_management granted';
    });
    await check('Ad account', async () => {
      const account = await graph<{ name: string; currency: string; account_status: number; funding_source?: string }>(ads.adAccountId, {
        fields: 'name,currency,account_status,funding_source',
        access_token: ads.accessToken,
      });
      // 1 is ACTIVE; anything else (disabled, unsettled, closed…) means ads can't run.
      if (account.account_status !== 1) throw new Error(`${account.name} is not active (status ${account.account_status}), see Ads Manager`);
      return `${account.name}, ${account.currency}`;
    });
    await check('Ad account payment method', async () => {
      const account = await graph<{ funding_source?: string }>(ads.adAccountId, { fields: 'funding_source', access_token: ads.accessToken });
      if (!account.funding_source) throw new Error('no card yet: the client adds one in Ads Manager → Billing & payments');
      return 'added';
    });
  } else {
    console.log('  – Paid ads: skipped (META_AD_ACCOUNT_ID not set)');
  }

  console.log(failed ? '\nFix the ✗ items before setting PUBLISH_DRY_RUN=0.' : '\nAll good: posting can be switched on with PUBLISH_DRY_RUN=0.');
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
