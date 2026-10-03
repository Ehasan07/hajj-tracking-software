import { getTranslations } from "next-intl/server";
import { PageBody } from "./page-header";
import { Card, EmptyState } from "./ui";

/** Shown in place of a page the signed-in role may not open. */
export async function NoAccess() {
  const t = await getTranslations("errors");
  return (
    <PageBody>
      <Card>
        <EmptyState title={t("FORBIDDEN")} />
      </Card>
    </PageBody>
  );
}
