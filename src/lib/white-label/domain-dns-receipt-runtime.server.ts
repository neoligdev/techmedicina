import "@tanstack/react-start/server-only";
import { query, type resolveBrandingContext } from "../admin/clinic-branding-runtime.server";
import { createDnsReceiptReader } from "./domain-dns-receipt.server";
type Context = NonNullable<Awaited<ReturnType<typeof resolveBrandingContext>>>;
/** Caller provides the existing verified request context; uses its bearer/RLS, never a service key. */
export async function readDomainDnsReceipt(
  context: Context,
  domainId: string,
  challengeId: string,
) {
  const read = createDnsReceiptReader((_identity, id, challenge) =>
    query(context, "rest/v1/rpc/tm_read_domain_dns_proof", {
      method: "POST",
      body: JSON.stringify({ p_domain_id: id, p_challenge_id: challenge }),
    }),
  );
  return read(context.identity, domainId, challengeId);
}
