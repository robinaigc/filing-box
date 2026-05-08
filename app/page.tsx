import { HomeClient } from "@/components/HomeClient";
import { getRecentReportsAsync, searchCompanyReports } from "@/lib/search";
import { getDataSource } from "@/lib/repository";

type PageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialQuery = typeof params?.q === "string" ? params.q : "";
  const initialResult = initialQuery ? searchCompanyReports(initialQuery) : null;
  const dataSourceLabel = getDataSource() === "supabase" ? "官方数据库" : "本地数据";

  return (
    <HomeClient
      initialQuery={initialQuery}
      initialResult={initialResult}
      initialRecentReports={await getRecentReportsAsync()}
      initialDataSourceLabel={dataSourceLabel}
    />
  );
}
