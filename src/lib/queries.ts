import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const artistsQuery = queryOptions({
  queryKey: ["artists"],
  queryFn: async () => {
    const { data, error } = await supabase.from("artists").select("*").order("created_at");
    if (error) throw error;
    return data;
  },
});
