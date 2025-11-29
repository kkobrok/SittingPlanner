import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load test environment
dotenv.config({ path: ".env.test" });

const supabaseUrl = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";

console.log("Connecting to:", supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("Cleaning up ALL test data...");

// Delete in reverse dependency order
console.log("Deleting seating_assignments...");
await supabase.from("seating_assignments").delete().neq("id", 0);

console.log("Deleting seating_plans...");
await supabase.from("seating_plans").delete().neq("id", "");

console.log("Deleting guest_relationships...");
await supabase.from("guest_relationships").delete().neq("id", 0);

console.log("Deleting guests...");
await supabase.from("guests").delete().neq("id", 0);

console.log("Deleting tables...");
await supabase.from("tables").delete().neq("id", 0);

console.log("Deleting events...");
const { count, error } = await supabase
  .from("events")
  .delete()
  .neq("id", 0)
  .select("*", { count: "exact", head: true });

if (error) {
  console.error("Error:", error);
} else {
  console.log(`✓ Cleanup complete - deleted ${count || 0} events and all related data`);
}
