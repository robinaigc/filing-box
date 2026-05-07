import { HomeClient } from "@/components/HomeClient";
import { getRecentReports, searchCompanyReports } from "@/lib/search";

type PageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialQuery = typeof params?.q === "string" ? params.q : "";
  const initialResult = initialQuery ? searchCompanyReports(initialQuery) : null;

  return (
    <HomeClient
      initialQuery={initialQuery}
      initialResult={initialResult}
      initialRecentReports={getRecentReports()}
      initialDataSourceLabel="本地数据"
    />
  );
}
