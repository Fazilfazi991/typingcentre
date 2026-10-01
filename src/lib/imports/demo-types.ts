export type DemoImportState = {
  job: {
    id: string;
    file_name: string;
    status: string;
    total_rows: number;
    customers_created: number;
    companies_created: number;
    documents_created: number;
    records_updated: number;
    records_skipped: number;
    records_failed: number;
  };
  rows: {
    id: string;
    row_number: number;
    source_data: Record<string, string>;
    normalized_data: Record<string, string | null> | null;
    status: string;
    issues: string[] | null;
    resolution: string | null;
  }[];
};
