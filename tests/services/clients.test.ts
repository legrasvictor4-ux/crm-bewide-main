import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createClient, fetchClients } from "@/services/clients";
import type { Client } from "@/services/clients";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn() } as unknown as SupabaseClient,
}));

const sampleClient: Client = {
  id: "1",
  first_name: "John",
  last_name: "Doe",
  email: "john@example.com",
  phone: "123456789",
  company: "ACME",
  address: "123 St",
  postal_code: "75000",
  city: "Paris",
  arrondissement: "1",
  contact: "John",
  status: "new",
  notes: null,
  next_action: null,
  date_created: "2024-01-01",
  date_updated: "2024-01-02",
  imported_at: null,
  source_file: null,
  enrichment_data: null,
  business_description: null,
  segmentation: null,
  lead_score: 80,
  enriched_at: null,
  metadata: {},
};

describe("clients service", () => {
  const builder: any = {};
  const response = { data: [sampleClient], error: null };
  let fromSpy: vi.SpyInstance;

  beforeEach(() => {
    builder.order = vi.fn(() => builder);
    builder.eq = vi.fn(() => builder);
    builder.select = vi.fn(() => builder);
    builder.insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: sampleClient, error: null })),
      })),
    }));
    builder.then = (resolve: any) => Promise.resolve(response).then(resolve);
    fromSpy = vi.spyOn(supabase, "from").mockImplementation(() => builder as any);
  });

  afterEach(() => {
    fromSpy?.mockRestore();
  });

  it("fetchClients filters by score and search", async () => {
    const result = await fetchClients({ minScore: 50, search: "acme" });
    expect(result).toHaveLength(1);
    expect(builder.order).toHaveBeenCalled();
  });

  it("createClient returns created record", async () => {
    const created = await createClient({ company: "ACME" });
    expect(created.id).toBe(sampleClient.id);
    expect(builder.insert).toHaveBeenCalled();
  });
});
